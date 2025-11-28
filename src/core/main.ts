#!/usr/bin/env node

import ChatController from "./chatController.js"
import tk from 'terminal-kit'
const { terminal } = tk
import fs from 'fs';

const main = async () => {
  const chat = new ChatController()
  await chat.run()
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