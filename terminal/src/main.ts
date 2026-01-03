#!/usr/bin/env node

import tk from 'terminal-kit'
const { terminal } = tk
import fs from 'fs';
import { ChatModel } from "@core/chatModel.js"
import { ChatControllerImpl } from "@core/chatController.js"
import type { ChatController } from '@core/chatController.js'
import LocalStore from './localStore.js'
import ViewRouter from './viewRouter.js'

const main = async () => {
  const localStore = new LocalStore()
  const model = new ChatModel(localStore)
  const controller: ChatController = new ChatControllerImpl(model, localStore)
  const ui = new ViewRouter(controller)

  // subscribe to notifications
  controller.subscribe(ui) 
  let initOk = await controller.init()
  if (!initOk) {
    // show welcome flow to create new key
    await ui.go('welcome')
    // then retry initialise
    initOk = await controller.init()
  }

  if (initOk) {
    const connected = await controller.connect()
    await ui.go(connected ? 'main' : 'offline')
  }

  console.log('Closing connections...')
  controller.close()
  console.log('Done')
}


// Redirect console.log to write to file
const logStream = fs.createWriteStream('output.log');
console.log = function (...args) {
  logStream.write(args.map(String).join(' ') + '\n');
};


try {
  terminal.fullscreen(true)
  await main()
  terminal.fullscreen(false)
} catch (err: any) {
  terminal.fullscreen(false) // need to do this before logging error to stdout
  terminal(`Error: ${err.message}\nExiting.\n`)
}
terminal.processExit(0)