import tk from 'terminal-kit'
import { isValidNpub } from '../../core/src/validation.js'
import { showYesNoPrompt, showDialog } from './terminalUi.js'
import { ViewContext } from './viewRouter.js'
import { handleSendError } from './helpers.js'
const { terminal } = tk


async function sendNewMessage(context: ViewContext) {
  let editing = true
  let recipient = ''
  let text = ''
  while (editing) {
    terminal.clear()
    terminal.bgGreen('Send Message\n\n')
    let result = await showDialog(
      [
        'Recipient',
        'Message',
      ],
      [ recipient, text ]
    )
    editing = false
    if (result) {
      [recipient, text] = result
      const contact = context.model.getContactByName(recipient)
        if (!contact && !isValidNpub(recipient)) {
        editing = await showYesNoPrompt('Contact npub is not valid. Continue editing?')
        continue
      } 

      try {
        if (contact) {
          await context.chatController.sendDmToContact(contact, text)
        } else {
          await context.chatController.sendDmToUnknown(recipient, text)
        }
      } catch (err) {
        editing = await handleSendError(err)
      }
    }
  }
  
  context.view.pop()
}

export { sendNewMessage }