export interface FortuneData {
  title: string;        // e.g., "第八簽 上上"
  poem: string[];       // 4 lines of poem
  meaning: string;      // Short meaning
  interpretation: string; // Detailed explanation
}

export type GameState = 'idle' | 'shaking' | 'dropping' | 'revealed';

export type Language = 'zh-TW' | 'zh-CN' | 'en' | 'ja';

export interface Attachment {
  mimeType: string;
  data: string;
  name?: string;
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  role: Role;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
}

