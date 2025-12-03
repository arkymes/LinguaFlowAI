import { GoogleGenAI } from '@google/genai';
import { ChatMessage, Scenario, SessionEvaluation, DailyMission } from '../types';
import { GEMINI_MODEL } from '../constants';

export const AIService = {
    /**
     * Evaluates a completed session using a separate AI agent (Judge).
     */
    async evaluateSession(apiKey: string, transcripts: ChatMessage[], scenario: Scenario): Promise<SessionEvaluation> {
        if (!apiKey) throw new Error("API Key is missing");

        const genAI = new GoogleGenAI({ apiKey });

        // Construct the transcript text
        const conversationText = transcripts
            .map(t => `${t.role.toUpperCase()}: ${t.text}`)
            .join('\n');

        const prompt = `
      You are an expert language tutor and evaluator. 
      Your task is to evaluate the following conversation between a user and an AI tutor.
      
      SCENARIO: ${scenario.title} (${scenario.description})
      DIFFICULTY: ${scenario.difficulty}
      
      CONVERSATION TRANSCRIPT:
      ${conversationText}
      
      Based on the user's performance, provide:
      1. A Score from 0 to 10 (integer).
      2. A brief Feedback summary (max 2 sentences).
      3. Three specific Tips for improvement.
      
      Return the result strictly as a JSON object with this format:
      {
        "score": number,
        "feedback": "string",
        "tips": ["string", "string", "string"]
      }
    `;

        try {
            const response = await genAI.models.generateContent({
                model: GEMINI_MODEL,
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const resultText = response.text;
            if (!resultText) throw new Error("No response from AI");

            const evaluation = JSON.parse(resultText) as SessionEvaluation;
            return evaluation;

        } catch (error) {
            console.error("Evaluation Error:", error);
            // Fallback if AI fails
            return {
                score: 5,
                feedback: "Great effort! Keep practicing to improve your fluency.",
                tips: ["Try to speak more confidently.", "Expand your vocabulary.", "Practice daily."]
            };
        }
    },

    /**
     * Generates 3 unique daily missions based on user level.
     */
    async generateDailyMissions(apiKey: string, userLevel: number): Promise<DailyMission[]> {
        if (!apiKey) throw new Error("API Key is missing");

        const genAI = new GoogleGenAI({ apiKey });

        const prompt = `
      Generate 3 unique, engaging "Daily Missions" for an English learner at Level ${userLevel}.
      Each mission should be a distinct roleplay scenario.
      
      Return strictly a JSON object with a "missions" array:
      {
        "missions": [
          {
            "title": "Mission 1 Title",
            "description": "Brief context...",
            "objectives": ["Obj 1", "Obj 2"],
            "difficulty": "ROOKIE" | "ADEPT" | "ELITE"
          },
          ...
        ]
      }
    `;

        try {
            const response = await genAI.models.generateContent({
                model: GEMINI_MODEL,
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const resultText = response.text;
            if (!resultText) throw new Error("No response from AI");

            const data = JSON.parse(resultText);
            const today = new Date().toISOString().split('T')[0];

            return data.missions.map((m: any, index: number) => ({
                id: `${today}-${index}`,
                date: today,
                title: m.title,
                description: m.description,
                objectives: m.objectives,
                isCompleted: false
            }));

        } catch (error) {
            console.error("Mission Generation Error:", error);
            // Fallback
            const today = new Date().toISOString().split('T')[0];
            return [
                {
                    id: `${today}-0`,
                    date: today,
                    title: "Morning Coffee",
                    description: "Order a coffee at a cafe.",
                    objectives: ["Greet barista", "Order drink", "Pay"],
                    isCompleted: false
                },
                {
                    id: `${today}-1`,
                    date: today,
                    title: "Directions",
                    description: "Ask for directions to the park.",
                    objectives: ["Excuse yourself", "Ask way", "Thank"],
                    isCompleted: false
                },
                {
                    id: `${today}-2`,
                    date: today,
                    title: "Introduction",
                    description: "Introduce yourself to a new colleague.",
                    objectives: ["Say name", "State role", "Nice to meet you"],
                    isCompleted: false
                }
            ];
        }
    }
};
