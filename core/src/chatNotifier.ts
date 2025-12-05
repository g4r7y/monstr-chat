import type { ChatMessage } from "./chatModel.js"

export interface ChatNotifier {
  notifyMessage(msg: ChatMessage): void
}
