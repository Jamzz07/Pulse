export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  fileName?: string;
  timestamp?: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatHistoryState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
}