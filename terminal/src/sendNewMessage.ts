import tk from 'terminal-kit';
import { isValidNpub } from '@core/validation.js';
import { showYesNoPrompt, showDialog } from './terminalUi.js';
import type { ViewContext } from './viewRouter.js';
import { handleSendError } from './helpers.js';
const { terminal } = tk;

async function sendNewMessage(context: ViewContext) {
  let editing = true;
  let recipient = '';
  let text = '';
  while (editing) {
    terminal.clear();
    terminal.bgGreen('Send Message\n\n');
    let result = await showDialog(['Recipient', 'Message'], [recipient, text]);
    editing = false;
    if (result) {
      [recipient, text] = result;
      const contact = context.chatController.getContactByName(recipient);
      if (!contact && !isValidNpub(recipient)) {
        editing = await showYesNoPrompt('npub is not valid. Continue editing?');
        continue;
      }

      try {
        if (contact) {
          await context.chatController.sendDmToContact(contact, text);
        } else {
          await context.chatController.sendDmToNpub(recipient, text);
        }
      } catch (err) {
        editing = await handleSendError(err);
      }
    }
  }

  context.view.pop();
}

export { sendNewMessage };
