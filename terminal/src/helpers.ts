import tk from 'terminal-kit'
import type { ChatMessage } from '@core/chatModel.js'
import { showYesNoPrompt } from './terminalUi.js'
import type { ViewContext } from './viewRouter.js'

const { terminal } = tk

async function handleSendError(err: any ) : Promise<boolean> {
  const sendError = (err instanceof Error && err.message === 'NoRelay') ? 
      'Send failed, cannot find the recipient\'s inbox relay on any discovery relays'
      : 'Send failed' 
  terminal('\n')
  return await showYesNoPrompt(`${sendError}. Try again?`)
}

function getDisplayableMessageTimestamp(msg: ChatMessage): string {
  const hoursAgo = Math.floor((Date.now() - new Date(msg.time).getTime()) / 3600000)
  const msgTime = `${msg.time.getHours()}:${String(msg.time.getMinutes()).padStart(2, '0')}`
  const msgDay = `${msg.time.toLocaleDateString()}`
  return hoursAgo > 12 ? `${msgDay} ${msgTime}` : `${msgTime}`
}

function getDisplayableMessageContact(npub: string, context: ViewContext): string {
  const contact = context.chatController.getContactByNpub(npub)
  return contact ? contact.name : `${npub.slice(0, 9)}..${npub.slice(-5)}`
}

export {
  handleSendError,
  getDisplayableMessageContact,
  getDisplayableMessageTimestamp
}