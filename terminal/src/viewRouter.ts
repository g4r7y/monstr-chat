import type { ChatController } from '@core/chatController.js';
import type { MessageListener } from '@core/messageListener.js';
import { type ChatMessage } from '@core/chatModel.js';
import { welcome } from './welcome.js';
import { mainMenu } from './mainMenu.js';
import { refreshConversation, viewConversation } from './conversation.js';
import { contactsMenu, addContact, editContact, viewContact, deleteContact } from './contacts.js';
import { sendNewMessage } from './sendNewMessage.js';
import {
  settingsMenu,
  settingsProfile,
  settingsKeys,
  settingsViewRelays,
  settingsEditGeneralRelays,
  settingsEditInboxRelays
} from './settings.js';
import { viewInbox } from './inbox.js';

export type ViewContext = Readonly<{
  chatController: ChatController;
  view: string[];
  viewParams: Record<string, string>;
}>;

class ViewRouter implements MessageListener {
  #chatController: ChatController;
  #view: string[];
  #viewParams: Record<string, string>;

  constructor(controller: ChatController) {
    this.#chatController = controller;
    this.#view = [];
    this.#viewParams = {};
  }

  async go(initialView = 'main') {
    this.#view = [initialView];
    const context = this.#getViewContext();
    while (this.#view.length > 0) {
      const views: Record<string, (context: ViewContext) => Promise<void>> = {
        welcome: welcome,
        main: mainMenu,
        inbox: viewInbox,
        viewConversation: viewConversation,
        newMessage: sendNewMessage,
        contacts: contactsMenu,
        addContact: addContact,
        editContact: editContact,
        viewContact: viewContact,
        deleteContact: deleteContact,
        settings: settingsMenu,
        settingsProfile: settingsProfile,
        settingsKeys: settingsKeys,
        settingsRelays: settingsViewRelays,
        editInboxRelays: settingsEditInboxRelays,
        editGeneralRelays: settingsEditGeneralRelays
      };

      const current = this.#view[this.#view.length - 1];
      const viewFn = views[current];
      if (!viewFn) {
        throw new Error(`Invalid view '${current}'`);
      }
      await viewFn(context);
    }
  }

  notifyMessage(msg: ChatMessage) {
    if (this.#view[this.#view.length - 1] == 'viewConversation') {
      refreshConversation(msg, this.#getViewContext());
    }
  }

  #getViewContext(): ViewContext {
    return Object.freeze({
      chatController: this.#chatController,
      view: this.#view,
      viewParams: this.#viewParams
    });
  }
}

export default ViewRouter;
