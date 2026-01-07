import type { ChatMessage } from "./chatModel.js"

export interface MessageListener {
  notifyMessage(msg: ChatMessage): void
}
