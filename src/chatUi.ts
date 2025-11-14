import tk from 'terminal-kit'
import ChatController from './chatController.js'
import { ChatContact, ChatMessage, ChatModel, ChatSettings } from './chatModel.js'
import { stringIsAValidUrl, stringIsValidNpub, stringIsValidNsec } from './validation.js'
import { wrapText, truncateText } from './textUtils.js'
import { showPrompt, showYesNoPrompt, showDialog, showMenu, showHorizontalMenu, startScrollPane, stopScrollPane, pressToContinue } from './terminalUi.js'

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
    terminal.bgGreen('Monstr Chat\n')
    const mainMenu = new Map()
    mainMenu.set('Messages', () => this.#view.push('inbox'))
    mainMenu.set('Contacts',  () => this.#view.push('contacts'))
    mainMenu.set('New Message', () => this.#view.push('newMessage'))
    mainMenu.set('Settings',  () => this.#view.push('settings'))
    mainMenu.set('Quit', () => this.#view.pop())
    await showMenu(mainMenu)
  }
  
  async #firstLaunch() {
    terminal.clear()
    terminal.bgGreen('Monstr Chat\n\n')
    terminal.green( 'Welcome to Monstr Chat!\n\n')
    terminal.yellow('[Messaging On Nostr]\n\n')
    terminal('To get started all you need is your own Nostr key.\n\n' +
      'This is an identifier which is unique to you and allows you to securely send and receive encrypted messages.\n' +
      'No need to sign up for an account, or give out your phone number or email address.\n' +
      'Your Nostr key will also work with any other app that is built on Nostr.\n\n' +
      'You can create your own key now or, if you already have a Nostr key, you can choose to restore it.\n')
      let option = ''
      const menu1 = new Map()
      menu1.set('Create new key', () => option='create')
      menu1.set('Restore existing key',  () =>  option='restore')
      await showMenu(menu1)
      
    if (option==='create') {
      const mnemonic = await this.#chatController.createNewKey()
      terminal.clear()
      terminal.bgGreen('Monstr Chat\n\n')
      terminal.green('Welcome to Monstr Chat!\n\n')
      terminal.yellow('Your new Nostr key has been created!\n\n')
      terminal('You now have a public Nostr key (npub) and a secret Nostr key (nsec).\n' + 
        'Your keys are saved in the Monstr Chat settings.\n' +
        'It is important to keep your nsec key safe and never share it with anybody else.\n' +
        'Your npub key can be shared with others so that they can send messages to you and read your messages.\n\n')
      terminal('Your public Nostr key is: \n')
      terminal.yellow(`${this.#chatController.getNpub()}.\n\n`)
      await pressToContinue('Continue?')

      terminal.clear()
      terminal.bgGreen.brightWhite('Monstr Chat\n\n')
      terminal.green('Welcome to Monstr Chat!\n\n')
      terminal.yellow('Save your recovery phrase!\n\n')
      terminal('A 12 word recovery phrase has been generated for you.\n' + 
        'You will need this in future if you ever need to restore your Nostr key.\n' +
        'Keep this in a safe place and do not share it with anybody.\n' + 
        'After you press ok, you will never be able to see it again.\n\n' +
        'Your memorable recovery phrase is:\n')
      terminal.yellow(`${mnemonic}\n\n`)

      await pressToContinue('Ready to start?')
      terminal.red('\n')
      await pressToContinue(`Have you written down your recovery phrase? You won't be able to see it again!`)
      this.#view.pop()
      return
    }
    
    if (option==='restore') {
      terminal.clear()
      terminal.bgGreen('Monstr Chat\n\n')
      terminal.green('Welcome to Monstr Chat!\n\n')
      terminal.yellow('Restore your key\n\n')
      terminal('There are two ways to restore your key.\n') 
      terminal('You can use your Nostr secret key (nsec).\n' +
        'It starts with \'nsec\' and is 63 characters long.\n' +
        'Or you can use your memorable recovery phrase.\n'+
        'This is the 12 word phrase that you hopefully stored safely when you created your key.\n')
      terminal('How would you like to restore your key?\n')
      const menu2 = new Map()
      menu2.set('I have my nsec private key', () => option='restoreNsec')
      menu2.set('I have my recovery phrase',  () =>  option='restoreBip39')
      await showMenu(menu2)
    }

    if (option === 'restoreNsec') {
      let editing = true
      let currentText = 'nsec'
      terminal('\n')
      while(editing) {
        let nsec = await showPrompt('Enter your private key: ', currentText)
        editing = false
        if (nsec !== null) {
          if (!stringIsValidNsec(nsec)) {
            editing = await showYesNoPrompt('\nPrivate nsec key is not valid. Continue editing?')
            terminal.move(0,-2)
            terminal.eraseDisplayBelow()
            currentText = nsec
          } else {
            await this.#chatController.resetKey(nsec)
          }
        }
      }
    }

    if (option === 'restoreBip39') {
      //TODO bip39 restore
    }
    
    this.#view.pop()
  }
  
  async #offlinePrompt() {
    terminal.clear()
    terminal.bgGreen('Offline\n\n')
    terminal('Could not connect to one or more relays. Check your network connection.\nAlternatively, there could be a problem with the relay server.\nYou can check your current relay servers in Settings.\n\n')
    const proceed = await showYesNoPrompt('Continue?')
    if (proceed) {
      this.#view = ['main']
    } else {
      this.#view = []
    }
  }
  
  async #viewInbox() {
    terminal.clear()
    terminal.bgGreen('Messages\n')
    
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
    const strangerLabel = 'Unknown'
    const contactNpub = this.#viewContext
    const contactLabel = this.#chatModel.getContactByNpub(contactNpub)?.name ?? 'Unknown'
    terminal.clear()
    terminal.bgGreen('Conversation with ')
    terminal.bgGreen.brightYellow(`${contactLabel}\n`)
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
        menu.set('Send Message', () => state = 'send' )
        if (contactLabel === strangerLabel) {
          menu.set('Add To Contacts', () => { this.#view.push('addContact')})
        } else {
          menu.set('View Contact', () => { this.#view.push('viewContact')})
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
          try {
            const contact = this.#chatModel.getContactByNpub(contactNpub)
            if (contact) {
              await this.#chatController.sendDmToContact(contact, msgToSend)
            } else {
              await this.#chatController.sendDmToUnknown(contactNpub, msgToSend)
            }
            draftMessage = ''
          } catch (err) {
            
            const continueEditing = await this.#handleSendError(err)
            if (!continueEditing) {
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
  
  async #newMessage() {
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
        const contact = this.#chatModel.getContactByName(recipient)
          if (!contact && !stringIsValidNpub(recipient)) {
          editing = await showYesNoPrompt('Contact npub is not valid. Continue editing?')
          continue
        } 

        try {
          if (contact) {
            await this.#chatController.sendDmToContact(contact, text)
          } else {
            await this.#chatController.sendDmToUnknown(recipient, text)
          }
        } catch (err) {
          editing = await this.#handleSendError(err)
        }
      }
    }
    
    this.#view.pop()
  }

  async #handleSendError(err: any ) : Promise<boolean> {
    const sendError = (err instanceof Error && err.message === 'NoRelay') ? 
        'Send failed, cannot find the recipient\'s inbox relay on any discovery relays'
        : 'Send failed' 
    terminal('\n')
    return await showYesNoPrompt(`${sendError}. Try again?`)
  }
  

  async #contactsMenu() {
    terminal.clear()
    terminal.bgGreen('Contacts\n')
    const menu = new Map()
    menu.set('Back',  () => this.#view.pop())
    menu.set('Add New Contact', () => { this.#view.push('addContact'); this.#viewContext = '' })
    
    this.#chatModel.getContactList()
      .sort((a: ChatContact, b: ChatContact) => a.name.localeCompare(b.name))
      .forEach((c: ChatContact) => {
        menu.set(c.name, () => { this.#view.push('viewContact'); this.#viewContext = c.npub })
      })
    await showMenu(menu)
  }
  
  async #viewContact() {
    terminal.clear()
    terminal.bgGreen('View Contact\n\n')
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
    const npubAlreadyProvided : boolean = !!this.#viewContext
    let npub = npubAlreadyProvided ? this.#viewContext : ''
    let contact: ChatContact = { name: '', npub,  relays: [], relaysUpdatedAt: null}
    if (!addNewContact) {
      contact = this.#chatModel.getContactByNpub(npub) ?? contact
    } 

    let origName = contact.name
    let editing = true
    while (editing) {
      terminal.clear()
      let result
      terminal.bgGreen(`${addNewContact ? 'Add Contact' : 'Edit Contact'}\n\n`)
      if (npubAlreadyProvided) {
        terminal(`Contact npub: ${contact.npub}\n`)
        result = await showDialog(
          ['Contact name'],
          [ contact.name ])
      } else {
        result = await showDialog( 
          ['Contact npub', 'Contact name'],
          [ contact.npub, contact.name ])
      }
      editing = false
      if (result) {
        if (npubAlreadyProvided) {
          const [name] = result;
          contact = { ...contact, name };
        } else {
          const [npub, name] = result;
          contact = { ...contact, name, npub };
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
          await this.#chatModel.setContact(contact)

          // if new contact, update subscription so we can get contact's relaylist
          if (addNewContact) {
            await this.#chatController.subscribeToRelayMetadata()
          }   
        }
      }
    }
    this.#view.pop()
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
    terminal.bgGreen('Settings\n')
    const settingsMenu = new Map()
    settingsMenu.set('Back',  () => this.#view.pop())
    settingsMenu.set('Relays', () => this.#view.push('settingsRelays'))
    settingsMenu.set('Keys', () => this.#view.push('settingsKeys'))
    await showMenu(settingsMenu)
  }
  
  async #settingsKeys() {
    terminal.clear()
    terminal.bgGreen('Keys\n\n')
    terminal.yellow('Public key: ')
    terminal.white(this.#chatController.getNpub() + '\n')
    terminal.yellow('Secret key: ')
    terminal.gray(this.#chatController.getNsec() + '\n')

    const menu = new Map()
    menu.set('Back', () => this.#view.pop())
    await showMenu(menu)
  }

  async #editRelays(relayType: string) {
    terminal.clear()
    terminal.bgGreen('Edit Relays\n\n')

    const editRelayList = async (relays: string[]) : Promise<string[] | null> => {
      let results = []
      let done = false
      for (let i = 0; !done; i++) {
        let isValid = false
        while (!isValid) {
          terminal.saveCursor()
          const prefix = 'wss://'
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

    if (relayType === 'inbox') {
      terminal.yellow('Incoming message relays:\n\n')
      const newInboxRelays = await editRelayList(currentSettings.inboxRelays)
      if (newInboxRelays==null) {
        this.#view.pop()
        return
      }
      const updateTimestampUtc = Date.now()
      currentSettings.relaysUpdatedAt = Math.floor(updateTimestampUtc / 1000),
      currentSettings.inboxRelays = newInboxRelays
    } 
    else if (relayType === 'general') {
      terminal.yellow('\nDiscovery relays:\n\n')
      const newGeneralRelays = await editRelayList(currentSettings.generalRelays)
      if (newGeneralRelays==null) {
        this.#view.pop()
        return 
      }
      currentSettings.generalRelays = newGeneralRelays   
    } else {
      throw new Error('Bad relay type')
    }

    await this.#chatModel.setSettings(currentSettings)

    // send out updated nip65, whether changing inbox or general relays
    try {
      await this.#chatController.broadcastRelayList()
    } catch (err) {
      terminal('\n')
      const continueEditing = await showYesNoPrompt('Could not connect to discovery relays to broadcast your relay settings. Try again?')
      if (!continueEditing) {
        this.#view.pop()
      }
      return
    }

    if (relayType === 'inbox') {
      // resubscribe to inbox relays
      await this.#chatController.subscribeToIncomingDms()
    }
    
    this.#view.pop()
  }

  async #settingsRelays() {
    terminal.clear()
    terminal.bgGreen('Relays\n\n')
    terminal.yellow('Incoming message relays:\n\n')
    terminal.white('These relays are used to receive your incoming messages.\nIt is recommended to have up to 3 of these.\n\n')
    let relays = this.#chatModel.settings.inboxRelays
    if (relays.length == 0) {
      terminal.white('[None]')
    }
    
    let connectedRelays = this.#chatController.checkConnectedRelays(relays)
    for (let relay of relays) {
      if (connectedRelays.includes(relay)) {
        terminal.brightGreen('✓')
      } else {
        terminal.brightRed('X')
      }
      terminal.brightWhite(`  ${relay}\n`)
    }

    terminal.yellow('\nDiscovery relays:\n\n')
    terminal.white('These relays are used to broadcast your relay information so that your contacts know how to send messages to you.\nThey are also used to discover relay information for each of your contacts so that you can send messages to them.\nIt is recommended to use several popular nostr relays.\n\n')
    relays = this.#chatModel.settings.generalRelays
    if (relays.length == 0) {
      terminal.white('[None]')
    }
    connectedRelays = this.#chatController.checkConnectedRelays(relays)
    for (let relay of relays) {
      if (connectedRelays.includes(relay)) {
        terminal.brightGreen('✓')
      } else {
        terminal.brightRed('X')
      }
      terminal.brightWhite(`  ${relay}\n`)
    }

    const menu = new Map()
    menu.set('Back',  () => this.#view.pop())
    menu.set('Refresh', () => {})
    menu.set('Edit Incoming Relays', () => { this.#view.push('editInboxRelays')} )
    menu.set('Edit Discovery Relays', () => { this.#view.push('editGeneralRelays') })

    await showMenu(menu)
  }
  

  async go(initialView='') {
    if (initialView == '') {
      this.#view = ['main']
    } else {
      this.#view = [ initialView ]
    }
    while (this.#view.length > 0) {
      const views: Record<string, ()=>Promise<any>> = {
        'firstLaunch':        this.#firstLaunch,
        'offline':            this.#offlinePrompt,
        'main':               this.#mainMenu,
        'inbox':              this.#viewInbox,
        'viewConversation':   this.#viewConversation,
        'newMessage':         this.#newMessage,
        'contacts':           this.#contactsMenu,
        'addContact':         async () => this.#editContact(true),
        'editContact':        this.#editContact,
        'viewContact':        this.#viewContact,
        'deleteContact':      this.#deleteContact,
        'settings':           this.#settings,
        'settingsKeys':       this.#settingsKeys,
        'settingsRelays':     this.#settingsRelays,
        'editInboxRelays':    async () => this.#editRelays('inbox'),
        'editGeneralRelays':  async () => this.#editRelays('general'),
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
    return contact ? contact.name : `${npub.slice(0, 9)}..${npub.slice(-5)}`
  }
}

export default ChatUi