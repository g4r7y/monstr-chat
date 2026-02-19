import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './components/App.tsx';
import { ChatModel } from '@core/chatModel';
import { ChatControllerImpl, type ChatController } from '@core/chatController';
import LocalDbStore from './localDbStore.ts';
import { ChatControllerContext } from './chatControllerContext.ts';

const localStore = new LocalDbStore();
const model = new ChatModel(localStore);
const controller: ChatController = new ChatControllerImpl(model, localStore);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatControllerContext.Provider value={controller}>
      <App />
    </ChatControllerContext.Provider>
  </StrictMode>
);
