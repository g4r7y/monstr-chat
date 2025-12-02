import tk from 'terminal-kit'
import ChatController from '@core/chatController.js'
import ChatUi from '@core/chatUi.js'
import { ChatMessage, ChatModel } from '@core/chatModel.js'
import { showYesNoPrompt } from './terminalUi.js'
import { welcome } from './welcome.js'
import { mainMenu } from './mainMenu.js'
import { refreshConversation, viewConversation } from './conversation.js'
import { contactsMenu, addContact, editContact, viewContact, deleteContact } from './contacts.js'
import {sendNewMessage } from './sendNewMessage.js'
import { settingsMenu, settingsProfile, settingsKeys, settingsViewRelays, settingsEditGeneralRelays, settingsEditInboxRelays } from './settings.js'
import { viewInbox } from './inbox.js'

const { terminal } = tk


export type ViewContext = Readonly<{
  chatController: ChatController,
  model: ChatModel,
  view: string[],
  viewParams: Record<string, string>
}>

class ViewRouter implements ChatUi {

  #chatController: ChatController
  #chatModel: ChatModel
  #view: string[]
  #viewParams: Record<string, string>
  
  constructor(controller: ChatController, model: ChatModel) {
    this.#chatController = controller
    this.#chatModel = model
    this.#view = []
    this.#viewParams = {}
  }
  
  async go(initialView='main') {
    this.#view = [ initialView ]
    const context = this.#getViewContext()
    while (this.#view.length > 0) {
      const views: Record<string, (context: ViewContext)=>Promise<any>> = {
        'welcome':            welcome,
        'offline':            offlinePrompt,
        'main':               mainMenu,
        'inbox':              viewInbox,
        'viewConversation':   viewConversation,
        'newMessage':         sendNewMessage,
        'contacts':           contactsMenu,
        'addContact':         addContact,
        'editContact':        editContact,
        'viewContact':        viewContact,
        'deleteContact':      deleteContact,
        'settings':           settingsMenu,
        'settingsProfile':    settingsProfile,
        'settingsKeys':       settingsKeys,
        'settingsRelays':     settingsViewRelays,
        'editInboxRelays':    settingsEditInboxRelays,
        'editGeneralRelays':  settingsEditGeneralRelays,
      }
      
      const current = this.#view[this.#view.length-1]
      const viewFn = views[current]
      if (!viewFn) {
        throw new Error(`Invalid view '${current}'`)
      }
      await viewFn(context)
    }
  }

  notifyMessage(msg: ChatMessage) {
    if (this.#view[this.#view.length-1] == 'viewConversation') {
      refreshConversation(msg, this.#getViewContext())
    }
  }

  #getViewContext() : ViewContext {
    return Object.freeze({
      chatController: this.#chatController,
      model: this.#chatModel,
      view: this.#view,
      viewParams: this.#viewParams
    })
  }

}


async function offlinePrompt(context: ViewContext) {
  terminal.clear()
  terminal.bgGreen('Offline\n\n')
  terminal('Could not connect to one or more relays. Check your network connection.\nAlternatively, there could be a problem with the relay server.\nYou can check your current relay servers in Settings.\n\n')
  const proceed = await showYesNoPrompt('Continue?')
  console.log(context.view)
  context.view.pop()
  if (proceed) {
    context.view.push('main')
  }
}

export default ViewRouter