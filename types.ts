
export enum TeachingMode {
  TEACHER = 'TEACHER', // Immediate correction
  FLUENCY = 'FLUENCY', // Post-conversation feedback (or subtle natural flow)
}

export type DifficultyLevel = 'ROOKIE' | 'ADEPT' | 'ELITE';

export interface DailyMission {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  objectives: string[];
  isCompleted: boolean;
  score?: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  photoURL?: string;
  createdAt: Date;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalConversations: number;
  streakDays: number;
  isGuest?: boolean;
  dailyMissions?: DailyMission[];
}

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

export interface SessionEvaluation {
  score: number; // 0-10
  feedback: string;
  tips: string[];
}
