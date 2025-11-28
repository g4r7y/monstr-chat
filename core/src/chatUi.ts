import { ChatMessage } from "./chatModel.js"

interface ChatUi {
  go(initialView?: string): void
  notifyMessage(msg: ChatMessage): void

}

export default ChatUi