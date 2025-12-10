import { createContext, useContext } from 'react';
import ChatController from '@core/chatController';


const ControllerContext = createContext<ChatController | null>(null);

export const useController = () => {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error('Controller context not found');
  }
  return context;
};

export { ControllerContext };
