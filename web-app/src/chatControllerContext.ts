import { createContext, useContext } from 'react';
import type { ChatController } from '@core/chatController';

// The context object for the Monstr Chat Controller
const ChatControllerContext = createContext<ChatController | null>(null);

// Returns the chat controller from the context
const useChatController = () : ChatController => {
  const contextValue = useContext(ChatControllerContext);
  if (!contextValue) {
    throw new Error('ChatControllerContext does not have a value. useChatController() must be used within a ChatControllerContext.Provider');
  }
  return contextValue;
};

export { ChatControllerContext, useChatController }