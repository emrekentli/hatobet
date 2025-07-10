// Genel Kullanıcı
export interface User {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  isActive?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  totalPredictions?: number;
  totalPoints?: number;
}

// Maç Tahmini
export interface MatchPrediction {
  id?: string;
  user: User;
  homeScore: number;
  awayScore: number;
  points: number;
  userId?: string;
}

// Soruya Verilen Cevap
export interface QuestionAnswer {
  id?: string;
  answer: string;
  points: number;
  userId?: string;
  user?: User;
}

// Maçtaki Soru
export interface Question {
  id: string;
  question: string;
  questionType: "MULTIPLE_CHOICE" | "YES_NO" | "TEXT";
  options?: string[];
  points: number;
  correctAnswer?: string;
  questionAnswers?: QuestionAnswer[];
}

// Maç
export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  weekNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  isActive: boolean;
  isFinished: boolean;
  userPrediction?: {
    homeScore: number;
    awayScore: number;
    points?: number;
    userId: string;
  };
  questions?: Question[];
  specialQuestions?: Array<{
    id: number;
    question: string;
    answer: string | null;
    points: number;
  }>;
  year?: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    predictions: number;
    questions?: number;
  };
  season?: {
    id: string;
    name: string;
  };
  predictions?: MatchPrediction[];
}

// Sezon
export interface Season {
  id: string;
  name: string;
  status: string;
  totalWeeks: number;
  startDate?: string;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  matches?: Match[];
  seasonScores?: SeasonScore[];
  _count?: {
    matches: number;
    seasonScores: number;
  };
}

// Sıralama/Ranking
export interface Ranking {
  id: string;
  rank: number;
  totalPoints: number;
  user: User;
  correctScores?: number;
  correctResults?: number;
  specialQuestionPoints?: number;
}

// Sezon Skoru
export interface SeasonScore {
  id: string;
  userId: string;
  totalPoints: number;
  rank: number | null;
  user: User;
}

// Admin Paneli İstatistikleri
export interface Stats {
  totalUsers: number;
  totalMatches: number;
  totalPredictions: number;
  totalQuestions: number;
}

// Kullanıcı Oluşturma API Response
export interface CreateUserResponse {
  user: User;
  plainPassword: string;
  message: string;
}

// NextAuth için genişletmeler
import NextAuth from "next-auth";
declare module "next-auth" {
  interface User {
    role?: string;
    username?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      username?: string;
      role?: string;
      image?: string;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    username?: string;
  }
} 