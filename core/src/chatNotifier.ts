import { ChatMessage } from "./chatModel.js"

interface ChatNotifier {
  notifyMessage(msg: ChatMessage): void
}

export default ChatNotifier