import { ChatAppData, ChatMessage } from "./chatModel.js";

interface DataStore {

  readAppData() : Promise<ChatAppData | null>;

  writeAppData(appData: ChatAppData) : void;

  readMessages() : Promise<ChatMessage[] | null> 

  writeMessages(msgs: ChatMessage[]) : void
}

export default DataStore