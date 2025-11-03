import tk from 'terminal-kit'
import ChatController from './chatController.js'
import { ChatContact, ChatMessage, ChatModel, ChatSettings } from './chatModel.js'
import { stringIsAValidUrl, stringIsValidNpub } from './validation.js'
import { wrapText, truncateText } from './textUtils.js'
import { showPrompt, showYesNoPrompt, showDialog, showMenu, showHorizontalMenu, startScrollPane, stopScrollPane } from './terminalUi.js'

const { terminal } = tk

class ChatUi {

  #chatController: ChatController
  #chatModel: ChatModel
  #view: string[]
  #viewContext: string
  
  constructor(controller: ChatController, model: ChatModel) {
    this.#chatController = controller
    this.#chatModel = model
    this.#view = []
    this.#viewContext = ''
  }
  
  
  async #mainMenu() {
    terminal.clear()
    terminal.bgBlue('Main Menu\n')
    const mainMenu = new Map()
    mainMenu.set('Messages', () => this.#view.push('inbox'))
    mainMenu.set('Contacts',  () => this.#view.push('contacts'))
    mainMenu.set('Settings',  () => this.#view.push('settings'))
    mainMenu.set('Quit', () => this.#view.pop())
    await showMenu(mainMenu)
  }
  
  async #offlinePrompt() {
    terminal.clear()
    terminal.bgBlue('Offline\n\n')
    terminal('Could not connect to relay server. Check your network connection.\nAlternatively, there could be a problem with the relay server.\nYou can check your current relay servers in Settings.\n\n')
    const cont = await showYesNoPrompt('Continue in offline mode?')
    if (cont) {
      this.#view.pop()
    } else {
      this.#view = []
    }
  }
  
  async #viewInbox() {
    terminal.clear()
    terminal.bgBlue('Messages\n')
    
    const menu = new Map()
    menu.set('Back', () => this.#view.pop())
    
    const convs = this.#chatModel.getConversations()
    convs.forEach((msgList: ChatMessage[]) => {
      const topMsg = msgList[0]
      const contactNpub = topMsg.state === 'tx' ? topMsg.receiver : topMsg.sender
      const label = `[${this.#getDisplayableMessageContact(contactNpub)}] ${topMsg.text}`
      menu.set(label, () => { this.#view.push('viewConversation'); this.#viewContext = contactNpub })
    })
    await showMenu(menu, {style: terminal.yellow})
  }
  
  #updateConversationView () {
    const headerHeight = 2
    const footerHeight = 6
    
    const contactNpub = this.#viewContext
    let lines = new Array()
    const convs = this.#chatModel.getConversations()
    if (convs.has(contactNpub)) {
      const msgs = convs.get(contactNpub)!.reverse()
      msgs.forEach((msg: ChatMessage) => {
        let msgLines = wrapText(msg.text, terminal.width)
        const timestamp = this.#getDisplayableMessageTimestamp(msg)
        let msgColour
        let contactName
        if (msg.state === 'tx') {
          contactName = 'You'
          msgColour = 'y'
        } else {
          contactName = this.#getDisplayableMessageContact(msg.sender)
          msgColour = 'c'
        }
        
        if (terminal.width < 32) {
          // use separate lines for timestamp and contact
          if (timestamp.length < terminal.width) {
            lines.push(`^/^K${timestamp}`)
          }
          lines.push(`^${msgColour.toUpperCase()}${truncateText(contactName, terminal.width)}`)
        }
        else {
          const contactLabel = truncateText(contactName, terminal.width - 18)
          const padding = terminal.width - contactLabel.length - timestamp.length
          lines.push(`^${msgColour.toUpperCase()}${contactLabel}${' '.repeat(padding)}^/^K${timestamp}`)
        }
        for (let msgLine of msgLines) {
          lines.push(`^${msgColour}${msgLine}`)
        }
        lines.push('')
        
      })
    } else {
      lines.push('No messages\n')
    }

    startScrollPane(lines, headerHeight, footerHeight)
  }
  
  async #viewConversation() {
    const contactNpub = this.#viewContext
    const knownContact = this.#chatModel.getContactByNpub(contactNpub)
    const title = `Conversation with ${knownContact?.name ?? 'new contact'}` 
    terminal.clear()
    terminal.bgBlue(`${title}\n`)
    terminal('\n')
    
    let state = 'submenu'
    let draftMessage = ''
    while (state != 'exit') {

      this.#updateConversationView()  

      if (state == 'submenu') {
        terminal.moveTo(0, terminal.height - 6)
        terminal.eraseDisplayBelow()
        const menu = new Map()
        menu.set('Back',  () => { this.#view.pop() })
        if (knownContact) {
          menu.set('Send Message', () => state = 'send' )
          menu.set('View Contact', () => { this.#view.push('viewContact')})
        } else {
          menu.set('Add New Contact', () => { this.#view.push('addContact')})
        }
        menu.set('Delete Conversation', () => state = 'delete')
        state = 'exit' // default, may be overridden by menu choice
        await showHorizontalMenu(menu)
      }

      if (state == 'delete') {
        terminal('\n')
        const yes = await showYesNoPrompt('Delete all messages in this conversation?')
        if (yes) {
          // TODO await delete convo
          this.#view.pop()
          state = 'exit'
        } else {
          state = 'submenu'
        }
      }
                     
      if (state == 'send') {
        terminal.moveTo(0, 1 + terminal.height - 6)
        terminal.eraseDisplayBelow()

        // TODO - doesn't handle the prompt growing more than the footerHeight as it
        // scrolls the entire terminal up. Just limit the size of the prompt to the available footer space?
        const msgToSend = await showPrompt('Send message: ', draftMessage)
        if (!msgToSend) {
          // send prompt cancelled, back to menu
          state = 'submenu'
        } else {
          // send message and remain in send state
          // TODO validation, make sure it's not empty, valid npub etc etc, contact has relay(s) to send to
          try {
            await this.#chatController.sendDm(knownContact!, msgToSend)
            draftMessage = ''
          } catch (err) {
            // send error
            terminal('\n')
            const yes = await showYesNoPrompt('Send failed. Try again?')
            if (!yes) {
              state = 'submenu'
              draftMessage = ''
            } else {
              draftMessage = msgToSend
            }
          }
        } 
      }
      stopScrollPane()
    }
  }
  

  async #contactsMenu() {
    terminal.clear()
    terminal.bgBlue('Contacts\n')
    const menu = new Map()
    menu.set('Back',  () => this.#view.pop())
    menu.set('Add New Contact', () => this.#view.push('addContact'))
    
    this.#chatModel.getContactList()
      .sort((a: ChatContact, b: ChatContact) => a.name.localeCompare(b.name))
      .forEach((c: ChatContact) => {
        menu.set(c.name, () => { this.#view.push('viewContact'); this.#viewContext = c.npub })
      })
    await showMenu(menu)
  }
  
  async #viewContact() {
    terminal.clear()
    terminal.bgBlue('View Contact\n\n')
    const contactNpub = this.#viewContext
    const currentContact = this.#chatModel.getContactByNpub(contactNpub)
    terminal.yellow('Name:   ')
    terminal.white(`${currentContact?.name}\n`)
    terminal.yellow('Npub:   ')
    terminal.white(`${currentContact?.npub}\n`)
    terminal.yellow('Relays: ')
    terminal.white(`${currentContact?.relays?.join(" ") ?? 'unknown'}\n`)
    terminal('\n')
    
    const menu = new Map()
    menu.set('Back', () => this.#view.pop())
    menu.set('Messages', () => { 
      // this.#view.splice(1-this.#view.length) //back up to top menu
      this.#view.push('viewConversation')
    })
    menu.set('Edit', () =>  this.#view.push('editContact') )
    menu.set('Delete', () => this.#view.push('deleteContact'))
    await showMenu(menu)
  }

  async #editContact(addNewContact=false) {
    let npub = this.#viewContext ?? ''
    let contact: ChatContact = { name: '', npub,  relays: [], relaysUpdatedAt: null}
    if (!addNewContact) {
      contact = this.#chatModel.getContactByNpub(npub) ?? contact
    } 

    let origName = contact.name
    let editing = true
    while (editing) {
      terminal.clear()
      let result 
      result = addNewContact ?
        await showDialog('Add contact', 
          ['Contact name', 'Contact npub'],
          [ contact.name, contact.npub ]) :
        await showDialog('Edit contact', 
          ['Contact name'],
          [ contact.name ])
      editing = false
      if (result) {
        if (addNewContact) {
          const [name, npub] = result;
          contact = { ...contact, name, npub };
        } else {
          const [name] = result;
          contact = { ...contact, name };
        }

        let isDuplicate = this.#chatModel.getContactByName(contact.name) !== null

        if (contact.name == '') {
          editing = await showYesNoPrompt('Contact name cannot be empty. Continue editing?')
        } else if (contact.npub == '') {
          editing = await showYesNoPrompt('Contact npub cannot be empty. Continue editing?')
        } else if (!stringIsValidNpub(contact.npub)) {
          editing = await showYesNoPrompt('Contact npub is not valid. Continue editing?')
        } else if (contact.name !== origName && isDuplicate) {
          editing = await showYesNoPrompt('Contact already exists with this name. Continue editing?')
        } else if (addNewContact && this.#chatModel.getContactByNpub(contact.npub)) {
          editing = await showYesNoPrompt('Contact already exists with this npub. Continue editing?')
        } else {
          // valid, so write the contact
          this.#chatModel.setContact(contact)

          // if new contact, update subscription so we can get contact's relaylist
          if (addNewContact) {
            this.#chatController.subscribeToContactRelayMetadata()
          }   
        }
      }
    }
    this.#view.pop()
  }
  
  async #addContact() {
    await this.#editContact(true)
  }
  
  async #deleteContact() {
    let npub = this.#viewContext
    let name = this.#chatModel.getContactByNpub(npub)!.name
    let confirmed = await showYesNoPrompt(`Delete ${name}. Are you sure?`)
    if (confirmed) {
      await this.#chatModel.deleteContact(npub)
      // need to pop twice, to exit the contacts view also
      this.#view.pop()
    }
    this.#view.pop()
  }
  
  async #settings() {
    terminal.clear()
    terminal.bgBlue('Settings\n')
    const settingsMenu = new Map()
    settingsMenu.set('Back',  () => this.#view.pop())
    settingsMenu.set('Relays', () => this.#view.push('settingsRelays'))
    settingsMenu.set('Keys', () => this.#view.push('settingsKeys'))
    await showMenu(settingsMenu)
  }
  
  async #settingsKeys() {
    terminal.clear()
    terminal.bgBlue('Keys\n\n')
    terminal.yellow('Public key: ')
    terminal.white(this.#chatController.getPubKeyString() + '\n')
    terminal.yellow('Secret key: ')
    terminal.gray(this.#chatController.getSecretKeyString() + '\n')

    const menu = new Map()
    menu.set('Back', () => this.#view.pop())
    await showMenu(menu)
  }

  async #editRelays() {
    terminal.clear()
    terminal.bgBlue('Edit Relays\n\n')

    const editRelayList = async (relays: string[]) : Promise<string[] | null> => {
      let results = []
      let done = false
      for (let i = 0; !done; i++) {
        let isValid = false
        while (!isValid) {
          terminal.saveCursor()
          const prefix = 'ws://'
          let relayUrl = prefix
          if (i<relays.length) {
            relayUrl = relays[i]
          } else {
            let addAnother = await showYesNoPrompt('Add another relay?')
            if (!addAnother) {
              done = true
              break
            }
          }

          let resp = await showPrompt(`Relay ${i+1}: `, relayUrl)
          terminal('\n')
          terminal.eraseLineAfter()
          if (resp==null) {
            // cancelled
            return null 
          }
          if (resp=='' || resp==prefix ) {
            // empty url, don't re-add it, skip to next
            break
          }
          relayUrl = resp
          isValid = stringIsAValidUrl(relayUrl, ['ws','wss'])
          if (!isValid) {
            terminal.red('Invalid url')
            terminal.restoreCursor()
          } else {
            results.push(relayUrl)
          }
        }
      }
      return results
    }

    const currentSettings = this.#chatModel.settings

    terminal.yellow('Incoming message relays:\n')
    const newInboxRelays = await editRelayList(currentSettings.inboxRelays)
    if (newInboxRelays==null) {
      this.#view.pop()
      return
    }

    terminal.yellow('\nDiscovery relays:\n')
    const newGeneralRelays = await editRelayList(currentSettings.generalRelays)
    if (newGeneralRelays==null) {
       this.#view.pop()
       return 
    }

    currentSettings.inboxRelays = newInboxRelays
    currentSettings.generalRelays = newGeneralRelays    
    this.#chatModel.setSettings(currentSettings)

    // send out updated nip65, potentially to updated general relays 
    this.#chatController.broadcastRelayList()
    // resubscribe to inbox relays, in case they changed
    this.#chatController.subscribeToIncomingDms()
    
    this.#view.pop()
  }

  async #settingsRelays() {
    terminal.clear()
    terminal.bgBlue('Relays\n\n')
    terminal.yellow('Incoming message relays:\n')
    terminal.grey('These relays are used to receive your incoming messages.\nIt is recommended to have up to 3 of these.\n')
    let relays = this.#chatModel.settings.inboxRelays
    if (relays.length == 0) {
      terminal.white('[None]')
    }
    
    let connectedRelays = this.#chatController.checkConnectedRelays(relays)
    for (let relay of relays) {
      if (connectedRelays.includes(relay)) {
        terminal.green('✓')
      } else {
        terminal.red('X')
      }
      terminal.white(`  ${relay}\n`)
    }

    terminal.yellow('\nDiscovery relays:\n')
    terminal.grey('These relays are used to broadcast your relay information so that your contacts know how to send messages to you.\n')
    terminal.grey('They are also used to discover relay information for each of your contacts so that you can send messages to them.\n')
    terminal.grey('It is recommended to use several popular nostr relays.\n')
    relays = this.#chatModel.settings.generalRelays
    if (relays.length == 0) {
      terminal.white('[None]')
    }
    connectedRelays = this.#chatController.checkConnectedRelays(relays)
    for (let relay of relays) {
      if (connectedRelays.includes(relay)) {
        terminal.green('✓')
      } else {
        terminal.red('X')
      }
      terminal.white(`  ${relay}\n`)
    }

    const menu = new Map()
    menu.set('Back',  () => this.#view.pop())
    menu.set('Edit', () => this.#view.push('editRelays'))

    await showMenu(menu)

  }
  

  async go(initialView='') {
    if (initialView == 'offline') {
      this.#view = [ 'main', initialView ]
    } else {
      this.#view = ['main']
    }
    while (this.#view.length > 0) {
      const views: Record<string, ()=>Promise<any>> = {
        'offline':            this.#offlinePrompt,
        'main':               this.#mainMenu,
        'inbox':              this.#viewInbox,
        'viewConversation':   this.#viewConversation,
        'contacts':           this.#contactsMenu,
        'addContact':         this.#addContact,
        'editContact':        this.#editContact,
        'viewContact':        this.#viewContact,
        'deleteContact':      this.#deleteContact,
        'settings':           this.#settings,
        'settingsKeys':       this.#settingsKeys,
        'settingsRelays':     this.#settingsRelays,
        'editRelays':         this.#editRelays,
      }
      
      const current = this.#view[this.#view.length-1]
      const viewFn = views[current]
      if (!viewFn) {
        throw new Error(`Invalid view '${current}'`)
      }
      await viewFn.bind(this)()
    }
  }

  newMessage(msg: any) {
    if (this.#view[this.#view.length-1] == 'viewConversation') {
      // TODO - only update view if contact is related to current conversation
      terminal.saveCursor()
      this.#updateConversationView()
      terminal.restoreCursor()
    }
  }

  #getDisplayableMessageTimestamp(msg: ChatMessage): string {
    const hoursAgo = Math.floor((Date.now() - new Date(msg.time).getTime()) / 3600000)
    const msgTime = `${msg.time.getHours()}:${String(msg.time.getMinutes()).padStart(2, '0')}`
    const msgDay = `${msg.time.toLocaleDateString()}`
    return hoursAgo > 12 ? `${msgDay} ${msgTime}` : `${msgTime}`
  }

  #getDisplayableMessageContact(npub: string): string {
    const contact = this.#chatModel.getContactByNpub(npub)
    return contact ? contact.name : `${npub.slice(4, 8)}..${npub.slice(-4)}`
  }
}

export default ChatUi