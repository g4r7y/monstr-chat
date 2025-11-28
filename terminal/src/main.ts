#!/usr/bin/env node

import tk from 'terminal-kit'
const { terminal } = tk
import fs from 'fs';
import ChatController from "../../core/src/chatController.js"
import ViewRouter from './viewRouter.js';
import { ChatModel } from '../../core/src/chatModel.js';

const main = async () => {
  const model = new ChatModel()
  const controller = new ChatController(model)
  const ui = new ViewRouter(controller, model)
  controller.setUi(ui)
  await controller.run()
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