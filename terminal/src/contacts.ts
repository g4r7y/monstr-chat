import tk from 'terminal-kit'
import { ChatContact } from '@core/chatModel.js'
import { isValidNpub, isValidNip05Address } from '@core/validation.js'
import { showPrompt, showYesNoPrompt, showMenu } from './terminalUi.js'
import { ViewContext } from './viewRouter.js'

const { terminal } = tk

async function contactsMenu(context: ViewContext) {
  terminal.clear()
  terminal.bgGreen('Contacts\n')
  const menu = new Map()
  menu.set('Back',  () => context.view.pop())
  menu.set('Add New Contact', () => { context.view.push('addContact'); delete context.viewParams.contactNpub })
  
  context.model.getContactList()
    .sort((a: ChatContact, b: ChatContact) => a.name.localeCompare(b.name))
    .forEach((c: ChatContact) => {
      menu.set(c.name, () => { context.view.push('viewContact'); context.viewParams.contactNpub = c.npub })
    })
  await showMenu(menu)
}

async function viewContact(context: ViewContext) {
  terminal.clear()
  terminal.bgGreen('View Contact\n\n')
  const { contactNpub } = context.viewParams
  const currentContact = context.model.getContactByNpub(contactNpub)!
  terminal.yellow('Name:             ')
  terminal.white(`${currentContact.name}\n`)
  terminal.yellow('Npub:             ')
  terminal.white(`${currentContact.npub}\n\n`)
  if (currentContact.nip05) {
    terminal.yellow('Verified address: ')
    terminal.white(currentContact.nip05)
    terminal.brightBlue(' ✔\n')
  }
  if (currentContact.profileName) {
    terminal.yellow('Nickname:         ')
    terminal.white(`${currentContact.profileName}\n`)
  }
  if (currentContact.profileAbout) {
    terminal.yellow('About:            ')
    terminal.white(`${currentContact.profileAbout}\n`)
  }
  terminal.yellow('Inbox relays:     ')
  terminal.white(`${currentContact.relays?.join('\n                  ') ?? 'unknown'}\n`)
  terminal('\n')
  
  const menu = new Map()
  menu.set('Back', () => context.view.pop())
  menu.set('Messages', () => { 
    // context.view.splice(1-context.view.length) //back up to top menu
    context.view.push('viewConversation')
  })
  menu.set('Edit', () =>  context.view.push('editContact') )
  menu.set('Delete', () => context.view.push('deleteContact'))
  await showMenu(menu)
}


async function addContact(context: ViewContext) {
  let npub = context.viewParams.contactNpub ?? ''
  let contactProfile : Record<string, string> = {}

  let state = npub ? 'addExisting' : 'find'
  while (state) {
    terminal.clear()
    terminal.bgGreen('Add Contact\n\n')

    if (state == 'addExisting') {
        // look up user metadata event from relays
        contactProfile = await context.chatController.getUserProfile(npub) ?? contactProfile
        state = 'found'
    }
    if (state == 'find') {
      terminal('You can search for a user by their verified Nostr address.\n')
      terminal('This is sometimes called a NIP-05 address and looks something like: user@domain\n')
      terminal('Or you can enter their npub key if you have it.\n\n')

      const response = await showPrompt('Find user: ')
      terminal('\n')
      if (!response) {
        break
      }

      // if entered an npub
      if (isValidNpub(response)) {
        npub = response
        // look up user metadata event from relays
        contactProfile = await context.chatController.getUserProfile(npub) ?? contactProfile
        state = 'found'
      }
      // if entered user@domain
      else if (isValidNip05Address(response)) {
        const nip05 = response
        const foundNpub = await context.chatController.lookupNip05Address(nip05)
        if (foundNpub === null) {
          const resp = await showYesNoPrompt('Nostr address not found. Try again?')
          if (!resp) {
            break
          }
        } else {
          terminal('Found:\n\n')
          npub = foundNpub
          // look up user metadata from relays
          contactProfile = await context.chatController.getUserProfile(npub) ?? contactProfile
          contactProfile.nip05 = contactProfile.nip05 ?? nip05
          state = 'found'
        }
      } else {
        const resp = await showYesNoPrompt('Not a valid Nostr address or npub. Try again?')
        if (!resp) {
          break
        }
      }
    }
    
    if (state == 'found') {
      const contact = context.model.getContactByNpub(npub)

      if (contact) {
        terminal('Contact name:  ')
        terminal.yellow(`${contact.name}\n`)
      }
      if (contactProfile.nip05) {
        terminal('Nostr address: ') 
        terminal.yellow(`${contactProfile.nip05}`)
        terminal.brightBlue(' ✔\n')
      }
      if (contactProfile.name) {
        terminal('Nickname:      ') 
        terminal.yellow(`${contactProfile.name}\n`)
      }
      if (contactProfile.about) {
        terminal('About:         ') 
        terminal.yellow(`${contactProfile.about}\n`)
      }
      
      terminal('Npub: ') 
      terminal.yellow(`${npub}\n\n`)
      
      if (contact) {
        terminal('User is already in your contacts.\n\n') 

        // update it anyway
        const updatedContact: ChatContact = {
          ...contact,
          nip05: contactProfile.nip05 ?? contact.nip05,
          profileAbout: contactProfile.about ?? contact.profileAbout,
          profileName: contactProfile.name ?? contact.profileName,
        };
        const hasChanged = updatedContact.nip05 !== contact.nip05 ||
          updatedContact.profileAbout !== contact.profileAbout ||
          updatedContact.profileName !== contact.profileName;
        if (hasChanged) {
          await context.model.setContact(updatedContact)
        }
        const resp = await showYesNoPrompt(`Search again?`)
        if (!resp) {
          break
        }
        state = 'find'
        continue
      }
      
      // Proceed to add as a new contact
      const resp = await showYesNoPrompt('Add to contacts?')
      if (!resp) {
        break
      }

      let contactName = await showPrompt('\nEnter a name for this contact: ', contactProfile.name)
      if (contactName === null) {
        break;
      }
      if (!contactName) {
        const resp = await showYesNoPrompt('Contact name cannot be empty. Continue editing?')
        if (!resp) {
          break
        }
      } else if (context.model.getContactByName(contactName) !== null) {
        const resp = await showYesNoPrompt('Another contact already exists with this name. Continue editing?')
        if (!resp) {
          break
        }
      } else {
        // valid, so write the contact
        const contact: ChatContact = { 
          name: contactName, 
          npub, 
          nip05: contactProfile.nip05,
          profileName: contactProfile.name, 
          profileAbout: contactProfile.about,
          relays: [], relaysUpdatedAt: null }
        await context.model.setContact(contact)
        
        // new contact, so update subscription so we can get contact's relaylist
        await context.chatController.subscribeToRelayMetadata()
        await context.chatController.subscribeToUserMetadata()
        break
      }
    }
  }
  context.view.pop()  
}

async function editContact(context: ViewContext) {
  let { contactNpub } = context.viewParams
  let contact = context.model.getContactByNpub(contactNpub)
  if (!contact) {
    context.view.pop()
    return
  }

  let origName = contact.name
  let defaultName = contact.name
  let editing = true
  while (editing) {
    terminal.clear()
    terminal.bgGreen('Edit Contact\n\n')

    terminal.white('Npub:         ')
    terminal.yellow(`${contact.npub}\n\n`)
    
    let name = await showPrompt('Contact name: ', defaultName)
    
    if (name === null) {
      editing = false
      // exit
    } else if (name === '') {
      editing = await showYesNoPrompt('Contact name cannot be empty. Continue editing?')
    } else if (name !== origName && context.model.getContactByName(name) !== null) {
      editing = await showYesNoPrompt('Another contact already exists with this name. Continue editing?')
      defaultName = name
    } else {
      // valid, so write the contact
      contact = { ...contact, name };
      await context.model.setContact(contact)
      editing = false
    }
  }
  context.view.pop()
}

async function deleteContact(context: ViewContext) {
  let { contactNpub } = context.viewParams
  let contact = context.model.getContactByNpub(contactNpub)
  if (!contact) {
    context.view.pop()
    return
  }

  terminal('\n')
  let confirmed = await showYesNoPrompt(`Delete ${contact.name}. Are you sure?`)
  if (confirmed) {
    await context.model.deleteContact(contactNpub)
    // need to pop twice, to exit the contacts view also
    context.view.pop()
  }
  context.view.pop()
}


export {
  contactsMenu,
  viewContact,
  addContact,
  editContact,
  deleteContact
}