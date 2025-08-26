// server/src/types/index.ts
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface CreateMessageRequest {
  conversationId?: string;
  content: string;
}

export interface CreateMessageResponse {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message; // Back to required
}

// New types for Server-Sent Events (SSE)
export type StreamEventType = 'initial' | 'message' | 'done' | 'error' | 'titleUpdate'; // Add 'titleUpdate'

export interface StreamEventData {
  conversationId?: string;
  userMessage?: Message;
  chunk?: string;
  id?: string; // For assistant message ID
  content?: string; // For error messages
  assistantMessage?: Message;
  newTitle?: string; // Add newTitle for title updates
}
