
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Scenario, TeachingMode, ChatMessage, SessionEvaluation } from '../types';
import { GEMINI_MODEL, MODE_INSTRUCTIONS, SYSTEM_INSTRUCTION_BASE } from '../constants';
import { createAudioBlob, convertPCMToAudioBuffer, decodeBase64 } from '../services/audioUtils';
import { AIService } from '../services/aiService';
import AudioVisualizer from './AudioVisualizer';

interface LiveSessionProps {
    scenario: Scenario;
    mode: TeachingMode;
    apiKey: string; // Recieving API Key from parent
    onExit: (stats?: { turns: number, evaluation?: SessionEvaluation }) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ scenario, mode, apiKey, onExit }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [transcripts, setTranscripts] = useState<ChatMessage[]>([]);
    const [realtimeInput, setRealtimeInput] = useState('');
    const [realtimeOutput, setRealtimeOutput] = useState('');
    const [missionSuccess, setMissionSuccess] = useState(false);

    // Visualizer State
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);

    // Refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const currentInputTransRef = useRef('');
    const currentOutputTransRef = useRef('');
    const disconnectRef = useRef<() => void>(() => { });
    const missionSuccessRef = useRef(false); // Ref for immediate access in callbacks

    useEffect(() => {
        let cleanup = () => { };
        let active = true;

        const startSession = async () => {
            try {
                if (!apiKey) {
                    console.error("No API Key provided");
                    return;
                }

                const ai = new GoogleGenAI({ apiKey });

                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                inputAudioContextRef.current = new AudioContextClass();
                outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

                // Ensure resume on mobile
                await inputAudioContextRef.current.resume();
                await outputAudioContextRef.current.resume();

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });

                const analyserNode = inputAudioContextRef.current.createAnalyser();
                analyserNode.fftSize = 256;
                analyserNode.smoothingTimeConstant = 0.5;
                const sourceVis = inputAudioContextRef.current.createMediaStreamSource(stream);
                sourceVis.connect(analyserNode);
                setAnalyser(analyserNode);

                const sessionPromise = ai.live.connect({
                    model: GEMINI_MODEL,
                    callbacks: {
                        onopen: () => {
                            if (!active) return;
                            setIsConnected(true);

                            const ctx = inputAudioContextRef.current;
                            if (ctx) {
                                const source = ctx.createMediaStreamSource(stream);
                                const processor = ctx.createScriptProcessor(2048, 1, 1);

                                processor.onaudioprocess = (e) => {
                                    if (!isMicOn) return;

                                    const inputData = e.inputBuffer.getChannelData(0);
                                    const blob = createAudioBlob(inputData, ctx.sampleRate);

                                    sessionPromise
                                        .then(session => session.sendRealtimeInput({ media: blob }))
                                        .catch(() => { });
                                };

                                source.connect(processor);
                                processor.connect(ctx.destination);
                            }
                        },
                        onmessage: async (msg: LiveServerMessage) => {
                            if (!active) return;

                            // Handle Tool Calls
                            if (msg.serverContent?.modelTurn?.parts) {
                                for (const part of msg.serverContent.modelTurn.parts) {
                                    if (part.functionCall) {
                                        const { name } = part.functionCall;
                                        if (name === 'complete_mission') {
                                            console.log("Mission Completed via Tool Call");
                                            setMissionSuccess(true);
                                            missionSuccessRef.current = true;
                                            // Send 'ok' response to acknowledge the tool call
                                            sessionPromise.then(session => session.sendToolResponse({
                                                functionResponses: [{
                                                    id: part.functionCall!.id,
                                                    name: name,
                                                    response: { result: 'ok' }
                                                }]
                                            }));
                                            setTimeout(() => handleSessionEnd(), 2000); // Delay slightly to let audio finish
                                            return;
                                        }
                                    }
                                }
                            }

                            // Handle Audio Output
                            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (base64Audio) {
                                const ctx = outputAudioContextRef.current;
                                if (ctx) {
                                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                                    const audioBytes = decodeBase64(base64Audio);
                                    const audioBuffer = await convertPCMToAudioBuffer(audioBytes, ctx, 24000);

                                    const source = ctx.createBufferSource();
                                    source.buffer = audioBuffer;
                                    source.connect(ctx.destination);

                                    source.start(nextStartTimeRef.current);
                                    nextStartTimeRef.current += audioBuffer.duration;

                                    audioSourcesRef.current.add(source);

                                    setIsAiSpeaking(true);
                                    source.onended = () => {
                                        audioSourcesRef.current.delete(source);
                                        if (audioSourcesRef.current.size === 0) setIsAiSpeaking(false);
                                    };
                                }
                            }

                            if (msg.serverContent?.interrupted) {
                                audioSourcesRef.current.forEach(src => src.stop());
                                audioSourcesRef.current.clear();
                                nextStartTimeRef.current = 0;
                                setIsAiSpeaking(false);
                            }

                            // Handle Transcription
                            // Note: outputTranscription comes in chunks, we accumulate them.
                            const outTrans = msg.serverContent?.outputTranscription?.text;
                            const inTrans = msg.serverContent?.inputTranscription?.text;

                            if (outTrans) {
                                currentOutputTransRef.current += outTrans;
                                setRealtimeOutput(currentOutputTransRef.current);
                            }
                            if (inTrans) {
                                currentInputTransRef.current += inTrans;
                                setRealtimeInput(currentInputTransRef.current);
                            }

                            if (msg.serverContent?.turnComplete) {
                                if (currentInputTransRef.current.trim()) {
                                    setTranscripts(prev => [...prev, { id: Date.now() + 'u', role: 'user', text: currentInputTransRef.current.trim(), timestamp: new Date() }]);
                                    currentInputTransRef.current = '';
                                    setRealtimeInput('');
                                }
                                if (currentOutputTransRef.current.trim()) {
                                    // Clean up any lingering tokens just in case
                                    let text = currentOutputTransRef.current.replace('[MISSION_COMPLETE]', '').trim();
                                    if (text) {
                                        setTranscripts(prev => [...prev, { id: Date.now() + 'a', role: 'model', text, timestamp: new Date() }]);
                                    }
                                    currentOutputTransRef.current = '';
                                    setRealtimeOutput('');
                                }
                            }
                        },
                        onclose: () => setIsConnected(false),
                        onerror: (err) => {
                            console.error(err);
                            setIsConnected(false);
                        }
                    },
                    config: {
                        responseModalities: [Modality.AUDIO], // MUST be AUDIO only for Live API
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
                        },
                        inputAudioTranscription: {}, // Request transcription for user audio
                        outputAudioTranscription: {}, // Request transcription for model audio
                        tools: [{
                            functionDeclarations: [{
                                name: "complete_mission",
                                description: "Call this function IMMEDIATELY when the user has successfully completed the mission objective. Do not say anything else.",
                            }]
                        }],
                        systemInstruction: `
              ${SYSTEM_INSTRUCTION_BASE}
              ${MODE_INSTRUCTIONS[mode]}
              SCENARIO: ${scenario.systemPromptContext}
              
              IMPORTANT:
              1. You MUST call the 'complete_mission' tool as soon as the user achieves the objective.
              2. Do NOT just say "Mission Complete", you MUST use the tool.
              3. Speak naturally in English.
              
              Start by saying: "${scenario.initialMessage}"
            `,
                    }
                });

                sessionPromise.catch(() => setIsConnected(false));

                cleanup = () => {
                    active = false;
                    stream.getTracks().forEach(track => track.stop());
                    sessionPromise.then(s => s.close()).catch(() => { });
                    inputAudioContextRef.current?.close();
                    outputAudioContextRef.current?.close();
                };

                // Expose cleanup to parent scope via ref
                disconnectRef.current = cleanup;

            } catch (e) {
                console.error(e);
            }
        };

        startSession();
        return () => cleanup();
    }, [scenario, mode, apiKey]); // Added apiKey to dependency array

    const [showChat, setShowChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts, realtimeInput, realtimeOutput, showChat]);

    // Evaluation State
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState<SessionEvaluation | null>(null);
    const [showEvalModal, setShowEvalModal] = useState(false);

    const handleSessionEnd = async () => {
        if (isEvaluating) return; // Prevent double triggers
        setIsEvaluating(true);

        // IMMEDIATELY disconnect to stop AI from listening/speaking
        try {
            disconnectRef.current();
            setIsConnected(false);
        } catch (e) {
            console.error("Error disconnecting:", e);
        }

        try {
            // 2. Prepare Transcripts (Merge Realtime)
            let finalTranscripts = [...transcripts];

            // If there's pending realtime text that wasn't "turnComplete"d, add it now
            if (currentInputTransRef.current.trim()) {
                finalTranscripts.push({
                    id: Date.now() + 'u-final',
                    role: 'user',
                    text: currentInputTransRef.current,
                    timestamp: new Date()
                });
            }
            if (currentOutputTransRef.current.trim()) {
                finalTranscripts.push({
                    id: Date.now() + 'a-final',
                    role: 'model',
                    text: currentOutputTransRef.current,
                    timestamp: new Date()
                });
            }

            // Inject Mission Success Note for the Judge
            if (missionSuccessRef.current) {
                finalTranscripts.push({
                    id: 'system-success',
                    role: 'user', // Pretend to be user context or system
                    text: '[SYSTEM NOTE: The user successfully completed the mission objective. Please rate highly.]',
                    timestamp: new Date()
                });
            }

            // Fallback if still empty
            if (finalTranscripts.length === 0) {
                finalTranscripts = [
                    { id: 'fallback-1', role: 'user', text: '(No transcription available)', timestamp: new Date() },
                    { id: 'fallback-2', role: 'model', text: 'Session ended.', timestamp: new Date() }
                ];
            }

            // 3. Evaluate
            let result: SessionEvaluation;
            try {
                result = await AIService.evaluateSession(apiKey, finalTranscripts, scenario);
            } catch (evalError) {
                console.error("AI Evaluation failed, using local fallback", evalError);
                // Smart Fallback based on Mission Success
                if (missionSuccessRef.current) {
                    result = {
                        score: 10,
                        feedback: "Mission Accomplished! You successfully completed the objective.",
                        tips: ["Great job following instructions.", "Excellent fluency.", "Keep it up!"]
                    };
                } else {
                    result = {
                        score: 5,
                        feedback: "Good effort, but the session ended early.",
                        tips: ["Try to speak more.", "Complete the objective next time.", "Practice daily."]
                    };
                }
            }

            // If mission was explicitly successful via tool, ensure score is at least 8 (passing)
            if (missionSuccessRef.current && result.score < 8) {
                result.score = 9;
                result.feedback = "Mission Completed! " + result.feedback;
            }

            setEvaluation(result);
            setShowEvalModal(true);

        } catch (e) {
            console.error("Critical Session End Error", e);
            onExit({ turns: transcripts.length });
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-md mx-auto md:max-w-full md:flex-row md:items-center md:justify-center relative bg-black">

            {/* Background */}
            <div className="ambient-glow"></div>

            {/* Main Mobile Container */}
            <div className="relative w-full h-full md:h-[800px] md:max-w-[480px] md:rounded-[40px] md:border md:border-white/5 md:overflow-hidden bg-black/40 backdrop-blur-xl flex flex-col">

                {/* Header Controls */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                    <button onClick={() => onExit({ turns: transcripts.length })} className="w-10 h-10 rounded-full glass-button flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{scenario.difficulty} SCENARIO</span>
                        <h2 className="text-white font-semibold tracking-wide text-sm">{scenario.title}</h2>
                    </div>

                    <button onClick={() => setShowChat(!showChat)} className={`w-10 h-10 rounded-full glass-button flex items-center justify-center ${showChat ? 'bg-white/20 text-white' : 'text-slate-300'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </button>
                </div>

                {/* Connection Status Indicator (Subtle) */}
                <div className={`absolute top-20 left-0 w-full flex justify-center z-10 transition-opacity duration-1000 ${isConnected ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] text-orange-400 font-medium tracking-wider animate-pulse">
                        {isEvaluating ? 'ANALYZING PERFORMANCE...' : 'CONNECTING TO NEURAL NET...'}
                    </span>
                </div>

                {/* Main Visualizer Area */}
                <div className="flex-1 relative w-full h-full flex items-center justify-center">
                    <AudioVisualizer
                        isActive={true}
                        isAiSpeaking={isAiSpeaking}
                        analyser={analyser}
                    />
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 w-full p-8 pb-12 flex flex-col items-center z-20 bg-gradient-to-t from-black via-black/80 to-transparent">

                    {/* Finish Button */}
                    <button
                        onClick={handleSessionEnd}
                        disabled={isEvaluating}
                        className="mb-6 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-0"
                    >
                        {isEvaluating ? 'Evaluating...' : 'Finish Session'}
                    </button>

                    <button
                        onClick={() => setIsMicOn(!isMicOn)}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${isMicOn
                            ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] scale-100'
                            : 'bg-red-500/20 text-red-500 border border-red-500/50 scale-95'
                            }`}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isMicOn ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            )}
                        </svg>
                    </button>
                    <span className="mt-4 text-xs font-medium tracking-widest text-slate-500">
                        {isMicOn ? 'LISTENING' : 'MUTED'}
                    </span>
                </div>

                {/* Chat Overlay (Slide Up) */}
                <div className={`absolute inset-x-0 bottom-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-[32px] transition-transform duration-500 z-30 flex flex-col ${showChat ? 'translate-y-0 h-[60%]' : 'translate-y-full h-[60%]'}`}>
                    <div className="p-4 flex justify-between items-center border-b border-white/5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Transcript</span>
                        <button onClick={() => setShowChat(false)} className="p-2 text-slate-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {transcripts.length === 0 && !realtimeInput && !realtimeOutput && (
                            <div className="text-center text-slate-600 text-sm mt-10 italic">Conversation not started...</div>
                        )}
                        {transcripts.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-orange-500 text-white rounded-br-none'
                                    : 'bg-white/10 text-slate-200 rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Realtime Input (User) */}
                        {realtimeInput && (
                            <div className="flex justify-end">
                                <div className="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed bg-orange-500/50 text-white rounded-br-none animate-pulse">
                                    {realtimeInput}
                                </div>
                            </div>
                        )}

                        {/* Realtime Output (AI) */}
                        {realtimeOutput && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed bg-white/5 text-slate-200 rounded-bl-none animate-pulse">
                                    {realtimeOutput}
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef}></div>
                    </div>
                </div>

                {/* Evaluating Overlay */}
                {isEvaluating && (
                    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                        {missionSuccess ? (
                            <div className="flex flex-col items-center animate-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-emerald-400 font-bold text-2xl tracking-wide uppercase">Mission Complete!</h3>
                                <p className="text-slate-400 text-sm mt-2">Generating report...</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-white font-bold text-lg tracking-wide">Analyzing Performance...</h3>
                                <p className="text-slate-400 text-xs mt-2">The AI Judge is reviewing your session.</p>
                            </>
                        )}
                    </div>
                )}

                {/* Evaluation Modal */}
                {showEvalModal && evaluation && (
                    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-500">
                        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center overflow-y-auto">

                            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.4)] mb-6 ${missionSuccess ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/40' : 'bg-gradient-to-br from-orange-500 to-purple-600'
                                }`}>
                                <span className="text-4xl font-bold text-white">{evaluation.score}</span>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">{missionSuccess ? 'Mission Accomplished!' : 'Session Complete'}</h2>
                            <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                                {evaluation.feedback}
                            </p>

                            <div className="w-full max-w-xs space-y-3 mb-8">
                                {evaluation.tips.map((tip, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl text-left flex gap-3">
                                        <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[10px] font-bold text-orange-400">{i + 1}</span>
                                        </div>
                                        <p className="text-slate-300 text-xs leading-relaxed">{tip}</p>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => onExit({ turns: transcripts.length, evaluation })}
                                className="w-full max-w-xs py-4 bg-white rounded-xl text-black font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default LiveSession;
