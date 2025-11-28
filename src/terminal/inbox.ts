import tk from 'terminal-kit'
import { ChatMessage } from '../core/chatModel.js'
import { ViewContext } from './viewRouter.js'
import { getDisplayableMessageContact } from './helpers.js'
import { showMenu } from './terminalUi.js'
const { terminal } = tk


async function viewInbox(context: ViewContext) {
  terminal.clear()
  terminal.bgGreen('Messages\n')
  
  const menu = new Map()
  menu.set('Back', () => context.view.pop())
  
  const convs = context.model.getConversations()
  convs.forEach((msgList: ChatMessage[]) => {
    const topMsg = msgList[0]
    const contactNpub = topMsg.state === 'tx' ? topMsg.receiver : topMsg.sender
    const label = `[${getDisplayableMessageContact(contactNpub, context)}] ${topMsg.text}`
    menu.set(label, () => { context.view.push('viewConversation'); context.viewParams.contactNpub = contactNpub })
  })
  await showMenu(menu, {style: terminal.yellow})
}



export {
  viewInbox
}