import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './components/App.tsx'
import { ChatModel } from '@core/chatModel'
import { ChatControllerImpl, type ChatController } from '@core/chatController'
import ChatDataStore from './chatDataStore.ts'
import NostrKeyStore from './nostrKeyStore.ts'
import { ChatControllerContext } from './chatControllerContext.ts'

const localDataStore = new ChatDataStore()
const keyStore  = new NostrKeyStore()
const model = new ChatModel(localDataStore)
const controller: ChatController = new ChatControllerImpl(model, keyStore)


// subscribe to notifications
// controller.subscribe(myNotifyHandler) 

let initOk = await controller.init()
console.log('Controller init: ', initOk)
if (!initOk) {
  //TODO
  // show welcome flow to create new key
  
  // for now just create a key
  // controller.createNewKey()
  controller.resetKey('nsec1d3nsxh2yg00h6kr5cmeyg5aec40exu3jfx9qhrcl9tmsr0n9y6mqfdjtk3')

  console.log('Controller npub: ', controller.getNpub())

  // then retry initialise
  initOk = await controller.init()
}

if (initOk) {
  const connected = await controller.connect()
  console.log('Controller connect: ', connected)


  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ChatControllerContext.Provider value={controller}>
        <App />
      </ChatControllerContext.Provider>

    </StrictMode>,
  )

}
