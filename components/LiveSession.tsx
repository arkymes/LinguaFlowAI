
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Scenario, TeachingMode, ChatMessage } from '../types';
import { GEMINI_MODEL, MODE_INSTRUCTIONS, SYSTEM_INSTRUCTION_BASE } from '../constants';
import { createAudioBlob, convertPCMToAudioBuffer, decodeBase64 } from '../services/audioUtils';
import AudioVisualizer from './AudioVisualizer';

interface LiveSessionProps {
  scenario: Scenario;
  mode: TeachingMode;
  apiKey: string; // Recieving API Key from parent
  onExit: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ scenario, mode, apiKey, onExit }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [transcripts, setTranscripts] = useState<ChatMessage[]>([]);
  
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

  useEffect(() => {
    let cleanup = () => {};
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
                    .catch(() => {});
                };

                source.connect(processor);
                processor.connect(ctx.destination);
              }
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (!active) return;

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

              const outTrans = msg.serverContent?.outputTranscription?.text;
              const inTrans = msg.serverContent?.inputTranscription?.text;
              if (outTrans) currentOutputTransRef.current += outTrans;
              if (inTrans) currentInputTransRef.current += inTrans;

              if (msg.serverContent?.turnComplete) {
                if (currentInputTransRef.current) {
                  setTranscripts(prev => [...prev, { id: Date.now() + 'u', role: 'user', text: currentInputTransRef.current, timestamp: new Date() }]);
                  currentInputTransRef.current = '';
                }
                if (currentOutputTransRef.current) {
                  setTranscripts(prev => [...prev, { id: Date.now() + 'a', role: 'model', text: currentOutputTransRef.current, timestamp: new Date() }]);
                  currentOutputTransRef.current = '';
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
            responseModalities: [Modality.AUDIO],
            systemInstruction: `
              ${SYSTEM_INSTRUCTION_BASE}
              ${MODE_INSTRUCTIONS[mode]}
              SCENARIO: ${scenario.systemPromptContext}
              Start by saying: "${scenario.initialMessage}"
            `,
          }
        });

        sessionPromise.catch(() => setIsConnected(false));

        cleanup = () => {
          active = false;
          stream.getTracks().forEach(track => track.stop());
          sessionPromise.then(s => s.close()).catch(() => {});
          inputAudioContextRef.current?.close();
          outputAudioContextRef.current?.close();
        };

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
  }, [transcripts, showChat]);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto md:max-w-full md:flex-row md:items-center md:justify-center relative bg-black">
      
       {/* Background */}
       <div className="ambient-glow"></div>

       {/* Main Mobile Container */}
       <div className="relative w-full h-full md:h-[800px] md:max-w-[480px] md:rounded-[40px] md:border md:border-white/5 md:overflow-hidden bg-black/40 backdrop-blur-xl flex flex-col">
          
          {/* Header Controls */}
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
             <button onClick={onExit} className="w-10 h-10 rounded-full glass-button flex items-center justify-center text-white">
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
               CONNECTING TO NEURAL NET...
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
             <button 
                onClick={() => setIsMicOn(!isMicOn)}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isMicOn 
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
                 {transcripts.length === 0 && (
                   <div className="text-center text-slate-600 text-sm mt-10 italic">Conversation not started...</div>
                 )}
                 {transcripts.map((msg) => (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-orange-500 text-white rounded-br-none' 
                        : 'bg-white/10 text-slate-200 rounded-bl-none'
                      }`}>
                         {msg.text}
                      </div>
                   </div>
                 ))}
                 <div ref={chatEndRef}></div>
              </div>
          </div>

       </div>
    </div>
  );
};

export default LiveSession;
