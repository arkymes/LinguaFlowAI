export enum TeachingMode {
  TEACHER = 'TEACHER', // Immediate correction
  FLUENCY = 'FLUENCY', // Post-conversation feedback (or subtle natural flow)
}

export type DifficultyLevel = 'ROOKIE' | 'ADEPT' | 'ELITE';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  iconPath: string; // SVG path data d=""
  systemPromptContext: string;
  initialMessage: string;
  difficulty: DifficultyLevel;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AudioState {
  isPlaying: boolean;
  isListening: boolean;
  volumeLevel: number; // 0-100 for visualizer
}