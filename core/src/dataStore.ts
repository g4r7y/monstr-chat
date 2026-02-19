import type { ChatAppData, ChatMessage } from './chatModel.js';

export interface DataStore {
  readAppData(): Promise<ChatAppData | null>;

  writeAppData(appData: ChatAppData): void;

  readMessages(): Promise<ChatMessage[] | null>;

  writeMessages(msgs: ChatMessage[]): void;
}
