import tk from 'terminal-kit';
import type { ChatMessage } from '@core/chatModel.js';
import { wrapText, truncateText } from './textUtils.js';
import { showPrompt, showYesNoPrompt, showHorizontalMenu, startScrollPane, stopScrollPane } from './terminalUi.js';
import type { ViewContext } from './viewRouter.js';
import { getDisplayableMessageContact, getDisplayableMessageTimestamp, handleSendError } from './helpers.js';
const { terminal } = tk;

async function viewConversation(context: ViewContext) {
  const strangerLabel = 'Stranger';
  const { contactNpub } = context.viewParams;
  const contactLabel = context.chatController.getContactByNpub(contactNpub)?.name ?? strangerLabel;
  terminal.clear();
  terminal.bgGreen('Chat with ');
  terminal.bgGreen.brightYellow(`${contactLabel}\n`);
  terminal('\n');

  let state = 'submenu';
  let draftMessage = '';
  while (state != 'exit') {
    updateConversationView(context);

    if (state == 'submenu') {
      terminal.moveTo(0, terminal.height - 6);
      terminal.eraseDisplayBelow();
      const menu = new Map();
      menu.set('Back', () => {
        context.view.pop();
      });
      menu.set('Send Message', () => (state = 'send'));
      if (contactLabel === strangerLabel) {
        menu.set('Add To Friends', () => {
          context.view.push('addContact');
        });
      } else {
        menu.set('View Friend', () => {
          context.view.push('viewContact');
        });
      }
      // TODO not yet implemented
      // menu.set('Delete Conversation', () => (state = 'delete'));

      state = 'exit'; // default, may be overridden by menu choice
      await showHorizontalMenu(menu);
    }

    if (state == 'delete') {
      terminal('\n');
      const yes = await showYesNoPrompt('Delete all messages in this conversation?');
      if (yes) {
        // TODO await delete convo
        context.view.pop();
        state = 'exit';
      } else {
        state = 'submenu';
      }
    }

    if (state == 'send') {
      terminal.moveTo(0, 1 + terminal.height - 6);
      terminal.eraseDisplayBelow();

      // TODO - doesn't handle the prompt growing more than the footerHeight as it
      // scrolls the entire terminal up. Just limit the size of the prompt to the available footer space?
      const msgToSend = await showPrompt('Send message: ', draftMessage);
      if (!msgToSend) {
        // send prompt cancelled, back to menu
        state = 'submenu';
      } else {
        // send message and remain in send state
        try {
          const contact = context.chatController.getContactByNpub(contactNpub) ?? contactNpub;
          await context.chatController.sendDm([contact], msgToSend);
          draftMessage = '';
        } catch (err) {
          const continueEditing = await handleSendError(err);
          if (!continueEditing) {
            state = 'submenu';
            draftMessage = '';
          } else {
            draftMessage = msgToSend;
          }
        }
      }
    }
    stopScrollPane();
  }
}

function refreshConversation(msg: ChatMessage, context: ViewContext) {
  // TODO - only update view if message is related to current conversation
  terminal.saveCursor();
  updateConversationView(context);
  terminal.restoreCursor();
}

function updateConversationView(context: ViewContext) {
  const headerHeight = 2;
  const footerHeight = 6;

  const { contactNpub } = context.viewParams;
  const lines = [];
  const convs = context.chatController.getConversations();
  if (convs.has(contactNpub)) {
    const msgs = convs.get(contactNpub)!.reverse();
    msgs.forEach((msg: ChatMessage) => {
      const msgLines = wrapText(msg.text, terminal.width);
      const timestamp = getDisplayableMessageTimestamp(msg);
      let msgColour;
      let contactName;
      if (msg.state === 'tx' || msg.state === 'self') {
        contactName = 'You';
        msgColour = 'y';
      } else {
        contactName = getDisplayableMessageContact(msg.sender, context);
        msgColour = 'c';
      }

      if (terminal.width < 32) {
        // use separate lines for timestamp and contact
        if (timestamp.length < terminal.width) {
          lines.push(`^/^K${timestamp}`);
        }
        lines.push(`^${msgColour.toUpperCase()}${truncateText(contactName, terminal.width)}`);
      } else {
        const contactLabel = truncateText(contactName, terminal.width - 18);
        const padding = terminal.width - contactLabel.length - timestamp.length;
        lines.push(`^${msgColour.toUpperCase()}${contactLabel}${' '.repeat(padding)}^/^K${timestamp}`);
      }
      for (const msgLine of msgLines) {
        lines.push(`^${msgColour}${msgLine}`);
      }
      lines.push('');
    });
  } else {
    lines.push('No messages\n');
  }

  startScrollPane(lines, headerHeight, footerHeight);
}

export { viewConversation, refreshConversation };
