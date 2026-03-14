import tk from 'terminal-kit';
import type { ChatContact, UserProfile } from '@core/chatModel.js';
import { isValidNpub, isValidNip05Address } from '@core/validation.js';
import { showPrompt, showYesNoPrompt, showMenu } from './terminalUi.js';
import type { ViewContext } from './viewRouter.js';

const { terminal } = tk;

async function contactsMenu(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Friends\n');
  const menu = new Map();
  menu.set('Back', () => context.view.pop());
  menu.set('Find Friend', () => {
    context.view.push('addContact');
    delete context.viewParams.contactNpub;
  });

  context.chatController
    .getContactList()
    .sort((a: ChatContact, b: ChatContact) => a.name.localeCompare(b.name))
    .forEach((c: ChatContact) => {
      menu.set(c.name, () => {
        context.view.push('viewContact');
        context.viewParams.contactNpub = c.npub;
      });
    });
  await showMenu(menu);
}

async function viewContact(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('View Friend\n\n');
  const { contactNpub } = context.viewParams;
  const currentContact = context.chatController.getContactByNpub(contactNpub)!;
  terminal.yellow('Name:             ');
  terminal.white(`${currentContact.name}\n`);
  terminal.yellow('Npub:             ');
  terminal.white(`${currentContact.npub}\n\n`);
  if (currentContact.profile?.nip05) {
    terminal.yellow('Verified address: ');
    terminal.white(currentContact.profile.nip05);
    terminal.brightBlue(' ✔\n');
  }
  if (currentContact.profile?.name) {
    terminal.yellow('Nickname:         ');
    terminal.white(`${currentContact.profile.name}\n`);
  }
  if (currentContact.profile?.about) {
    terminal.yellow('About:            ');
    terminal.white(`${currentContact.profile.about}\n`);
  }
  terminal.yellow('DM relays:     ');
  terminal.white(`${currentContact.relays?.join('\n                  ') ?? 'unknown'}\n`);
  terminal('\n');

  const menu = new Map();
  menu.set('Back', () => context.view.pop());
  menu.set('Chats', () => {
    context.view.push('viewConversation');
  });
  menu.set('Edit', () => context.view.push('editContact'));
  menu.set('Delete', () => context.view.push('deleteContact'));
  await showMenu(menu);
}

async function addContact(context: ViewContext) {
  let npub = context.viewParams.contactNpub ?? '';
  let contactProfile: UserProfile | null = null;

  const state = npub ? 'addExisting' : 'find';
  while (true) {
    terminal.clear();
    let found = false;

    if (state == 'addExisting') {
      terminal.bgGreen('Add Friend\n\n');
      // look up user metadata event from relays
      terminal('Looking up user...\n\n');
      contactProfile = await context.chatController.lookupUserProfile(npub);
      found = true;
    }
    if (state == 'find') {
      terminal.bgGreen('Find Friend\n\n');
      terminal('You can search for a user by their verified Nostr address.\n');
      terminal('This is sometimes called a NIP-05 address and looks something like: user@domain\n');
      terminal('Or you can enter their npub key if you have it.\n\n');

      const response = await showPrompt('Find user: ');
      terminal('\n');
      if (!response) {
        break;
      }

      // if entered an npub
      if (isValidNpub(response)) {
        npub = response;
        // look up user metadata event from relays
        terminal('Looking up user...\n\n');
        contactProfile = await context.chatController.lookupUserProfile(npub);
        found = true;
      }
      // if entered user@domain
      else if (isValidNip05Address(response)) {
        const nip05 = response;
        const foundNpub = await context.chatController.lookupNip05Address(nip05);
        if (foundNpub === null) {
          const resp = await showYesNoPrompt('Nostr address not found. Try again?');
          if (!resp) {
            break;
          }
        } else {
          npub = foundNpub;
          // look up user metadata from relays
          terminal('Looking up user...\n\n');
          contactProfile = await context.chatController.lookupUserProfile(npub);
          // if user profile not found or it is missing nip05
          if (!contactProfile?.nip05) {
            // create/overwrite contactProfile with the user-inputted nip05
            contactProfile = {
              ...(contactProfile ?? {}),
              nip05
            };
          }
          terminal('Found:\n\n');
          found = true;
        }
      } else {
        const resp = await showYesNoPrompt('Not a valid Nostr address or npub. Try again?');
        if (!resp) {
          break;
        }
      }
    }

    if (found) {
      const contact = context.chatController.getContactByNpub(npub);

      if (contact) {
        terminal('Name:  ');
        terminal.yellow(`${contact.name}\n`);
      }
      if (contactProfile?.nip05) {
        terminal('Nostr address: ');
        terminal.yellow(`${contactProfile.nip05}`);
        terminal.brightBlue(' ✔\n');
      }
      if (contactProfile?.name) {
        terminal('Nickname:      ');
        terminal.yellow(`${contactProfile.name}\n`);
      }
      if (contactProfile?.about) {
        terminal('About:         ');
        terminal.yellow(`${contactProfile.about}\n`);
      }
      terminal('Npub: ');
      terminal.yellow(`${npub}\n\n`);

      if (contact) {
        terminal('User is already in your friends.\n\n');
        const resp = await showYesNoPrompt(`Search again?`);
        if (!resp) {
          break;
        }
        // reiterate
        continue;
      }

      // Proceed to add as a new contact
      const resp = await showYesNoPrompt('Add to friends?');
      if (!resp) {
        break;
      }

      const contactName = await showPrompt('\nGive your friend a name: ', contactProfile?.name ?? '');
      if (contactName === null) {
        break;
      }
      if (!contactName) {
        const resp = await showYesNoPrompt('Name cannot be empty. Continue editing?');
        if (!resp) {
          break;
        }
      } else if (context.chatController.getContactByName(contactName) !== null) {
        const resp = await showYesNoPrompt('You already have a friend with the same name. Continue editing?');
        if (!resp) {
          break;
        }
      } else {
        // valid, so write the contact
        const contact: ChatContact = {
          name: contactName,
          npub,
          relays: []
        };
        if (contactProfile) contact.profile = contactProfile;
        await context.chatController.setContact(contact);

        // new contact, so update subscription so we can get contact's relaylist
        await context.chatController.subscribeToRelayMetadata();
        await context.chatController.subscribeToUserMetadata();
        // done
        break;
      }
    }
  }
  context.view.pop();
}

async function editContact(context: ViewContext) {
  const { contactNpub } = context.viewParams;
  let contact = context.chatController.getContactByNpub(contactNpub);
  if (!contact) {
    context.view.pop();
    return;
  }

  const origName = contact.name;
  let defaultName = contact.name;
  let editing = true;
  while (editing) {
    terminal.clear();
    terminal.bgGreen('Edit Friend\n\n');

    terminal.white('Npub:         ');
    terminal.yellow(`${contact.npub}\n\n`);

    const name = await showPrompt('Name: ', defaultName);

    if (name === null) {
      editing = false;
      // exit
    } else if (name === '') {
      editing = await showYesNoPrompt('Name cannot be empty. Continue editing?');
    } else if (name !== origName && context.chatController.getContactByName(name) !== null) {
      editing = await showYesNoPrompt('You already have a friend with the same name. Continue editing?');
      defaultName = name;
    } else {
      // valid, so write the contact
      contact = { ...contact, name };
      await context.chatController.setContact(contact);
      editing = false;
    }
  }
  context.view.pop();
}

async function deleteContact(context: ViewContext) {
  const { contactNpub } = context.viewParams;
  const contact = context.chatController.getContactByNpub(contactNpub);
  if (!contact) {
    context.view.pop();
    return;
  }

  terminal('\n');
  const confirmed = await showYesNoPrompt(`Delete ${contact.name}. Are you sure?`);
  if (confirmed) {
    await context.chatController.deleteContact(contactNpub);
    // need to pop twice, to exit the contacts view also
    context.view.pop();
  }
  context.view.pop();
}

export { contactsMenu, viewContact, addContact, editContact, deleteContact };
