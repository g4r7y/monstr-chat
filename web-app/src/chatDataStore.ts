import type { ChatAppData, ChatMessage } from '@core/chatModel'
import type { DataStore } from '@core/dataStore'

// TODO use localstorage
let tempAppData : ChatAppData|null = null
let tempMessages : ChatMessage[] = []

class ChatDataStore implements DataStore {
  async readAppData() : Promise<ChatAppData | null> {
    return tempAppData
  }

  async writeAppData(appData: ChatAppData) {
    tempAppData = appData
  }

  async readMessages() : Promise<ChatMessage[] | null> {
    return tempMessages
  }

  async writeMessages(msgs: ChatMessage[]) {
    tempMessages = msgs
  }
}

export default ChatDataStore