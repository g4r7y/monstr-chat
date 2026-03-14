import tk from 'terminal-kit';
import { isValidUrl, isValidNip05Address } from '@core/validation.js';
import { showPrompt, showYesNoPrompt, showMenu, pressToContinue } from './terminalUi.js';
import type { ViewContext } from './viewRouter.js';
const { terminal } = tk;

async function settingsMenu(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Settings\n');
  const settingsMenu = new Map();
  settingsMenu.set('Back', () => context.view.pop());
  settingsMenu.set('Profile', () => context.view.push('settingsProfile'));
  settingsMenu.set('Relays', () => context.view.push('settingsRelays'));
  settingsMenu.set('Keys', () => context.view.push('settingsKeys'));
  await showMenu(settingsMenu);
}

async function settingsProfile(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Profile\n\n');
  const settings = context.chatController.getSettings();
  terminal.yellow('Your nickname: ');
  terminal.white(settings.profile?.name ?? '');
  terminal('\n');
  terminal.yellow('About you:     ');
  terminal.white(settings.profile?.about ?? '');
  terminal('\n');
  terminal.yellow('Nostr address (NIP-05): ');
  terminal.white(settings.profile?.nip05 ? `${settings.profile?.nip05} ` : '');
  let verified = false;
  if (settings.profile?.nip05) {
    const npub = await context.chatController.lookupNip05Address(settings.profile.nip05);
    if (npub && npub === context.chatController.getNpub()) {
      verified = true;
    }
  }
  if (verified) {
    terminal.brightBlue('✔');
  } else {
    terminal.brightRed('✘');
  }
  terminal('\n');

  let edit = false;
  const menu = new Map();
  menu.set('Back', () => context.view.pop());
  menu.set('Edit', () => (edit = true));
  await showMenu(menu);

  if (edit) {
    await settingsEditProfile(context);
  }
}

async function settingsEditProfile(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Edit Profile\n\n');
  const settings = context.chatController.getSettings();
  let initialText = settings.profile?.name ?? '';
  const profileName = await showPrompt('Your nickname: ', initialText);
  if (profileName === null) {
    // escape
    return;
  }
  initialText = settings.profile?.about ?? '';
  const profileAbout = await showPrompt('About you: ', initialText);
  if (profileAbout === null) {
    // escape
    return;
  }

  initialText = settings.profile?.nip05 ?? '';
  let editing = true;
  let shouldUpdate = false;
  let nip05 = null;
  terminal.saveCursor();
  while (editing) {
    terminal.restoreCursor();
    terminal.eraseDisplayBelow();
    nip05 = await showPrompt('Your Nostr NIP-05 address: ', initialText);
    terminal('\n');
    if (nip05 === null) {
      // escape
      return;
    }
    initialText = nip05;
    if (nip05 === '') {
      // set to empty, don't bother with verification
      nip05 = null;
      shouldUpdate = true;
      editing = false;
    } else if (!isValidNip05Address(nip05)) {
      editing = await showYesNoPrompt('Invalid address. It should look something like: user@domain. Try again?');
    } else {
      // verify the entered nip05
      const npub = await context.chatController.lookupNip05Address(nip05);
      if (npub === null) {
        editing = await showYesNoPrompt('Address not found. Try again?');
      } else if (npub !== context.chatController.getNpub()) {
        editing = await showYesNoPrompt('Address does not match your key. Try again?');
      } else {
        await pressToContinue('Your Nostr address has been verified');
        shouldUpdate = true;
        editing = false;
      }
    }
  }

  if (shouldUpdate) {
    settings.profile = { name: profileName, about: profileAbout };
    if (nip05) settings.profile.nip05 = nip05;
    await context.chatController.setSettings(settings);
    await context.chatController.broadcastUserMetadata();
    await pressToContinue('Your Nostr profile has been updated');
  }
}

async function settingsKeys(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Keys\n\n');
  terminal.yellow('Public key: ');
  terminal.white(context.chatController.getNpub() + '\n');
  terminal.yellow('Secret key: ');
  terminal.gray(context.chatController.getNsec() + '\n');

  const menu = new Map();
  menu.set('Back', () => context.view.pop());
  await showMenu(menu);
}

async function settingsViewRelays(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Relays\n\n');
  terminal.yellow('Message relays:\n\n');
  terminal.white(
    'These relays are used to receive your incoming messages.\nIt is recommended to have up to 3 of these.\n\n'
  );
  let relays = context.chatController.getSettings().inboxRelays;
  if (relays.length == 0) {
    terminal.white('[None]');
  }

  let connectedRelays = context.chatController.checkConnectedRelays(relays);
  for (const relay of relays) {
    if (connectedRelays.includes(relay)) {
      terminal.brightGreen('✔');
    } else {
      terminal.brightRed('✘');
    }
    terminal.brightWhite(`  ${relay}\n`);
  }

  terminal.yellow('\nDiscovery relays:\n\n');
  terminal.white(
    'These relays are used to broadcast your profile and relay information so that your friends can send messages to you.\nThey are also used to discover information about your friends so that you can send messages to them.\nIt is recommended to use several popular nostr relays.\n\n'
  );
  relays = context.chatController.getSettings().generalRelays;
  if (relays.length == 0) {
    terminal.white('[None]');
  }
  connectedRelays = context.chatController.checkConnectedRelays(relays);
  for (const relay of relays) {
    if (connectedRelays.includes(relay)) {
      terminal.brightGreen('✔');
    } else {
      terminal.brightRed('✘');
    }
    terminal.brightWhite(`  ${relay}\n`);
  }

  const menu = new Map();
  menu.set('Back', () => context.view.pop());
  menu.set('Refresh', () => {});
  menu.set('Edit Message Relays', () => {
    context.view.push('editInboxRelays');
  });
  menu.set('Edit Discovery Relays', () => {
    context.view.push('editGeneralRelays');
  });
  await showMenu(menu);
}

async function settingsEditInboxRelays(context: ViewContext) {
  await settingsEditRelays('message', context);
}

async function settingsEditGeneralRelays(context: ViewContext) {
  await settingsEditRelays('general', context);
}

async function settingsEditRelays(relayType: 'message' | 'general', context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Edit Relays\n\n');

  const editRelayList = async (relays: string[]): Promise<string[] | null> => {
    const results = [];
    let done = false;
    for (let i = 0; !done; i++) {
      let isValid = false;
      while (!isValid) {
        terminal.saveCursor();
        const prefix = 'wss://';
        let relayUrl = prefix;
        if (i < relays.length) {
          relayUrl = relays[i];
        } else {
          const addAnother = await showYesNoPrompt('Add another relay?');
          if (!addAnother) {
            done = true;
            break;
          }
        }

        const resp = await showPrompt(`Relay ${i + 1}: `, relayUrl);
        terminal.eraseLineAfter();
        if (resp == null) {
          // cancelled
          return null;
        }
        if (resp == '' || resp == prefix) {
          // empty url, don't re-add it, skip to next
          break;
        }
        relayUrl = resp;
        isValid = isValidUrl(relayUrl, ['ws', 'wss']);
        if (!isValid) {
          terminal.red('Invalid url');
          terminal.restoreCursor();
        } else {
          results.push(relayUrl);
        }
      }
    }
    return results;
  };

  const currentSettings = context.chatController.getSettings();

  if (relayType === 'message') {
    terminal.yellow('Message relays:\n\n');
    const newInboxRelays = await editRelayList(currentSettings.inboxRelays);
    if (newInboxRelays == null) {
      context.view.pop();
      return;
    }
    const updateTimestampUtc = Date.now();
    currentSettings.relaysUpdatedAt = Math.floor(updateTimestampUtc / 1000);
    currentSettings.inboxRelays = newInboxRelays;
  } else if (relayType === 'general') {
    terminal.yellow('\nDiscovery relays:\n\n');
    const newGeneralRelays = await editRelayList(currentSettings.generalRelays);
    if (newGeneralRelays == null) {
      context.view.pop();
      return;
    }
    currentSettings.generalRelays = newGeneralRelays;
  } else {
    throw new Error('Bad relay type');
  }

  await context.chatController.setSettings(currentSettings);

  // send out updated realy list event, whether changing inbox or general relays
  try {
    await context.chatController.broadcastRelayList();
    // also,  while we are at it, broadcast kind0 user metadata to the potentially new relays
    await context.chatController.broadcastUserMetadata();
  } catch (_) {
    terminal('\n');
    const continueEditing = await showYesNoPrompt(
      'Could not connect to discovery relays to broadcast your relay settings. Try again?'
    );
    if (!continueEditing) {
      context.view.pop();
    }
    return;
  }

  if (relayType === 'message') {
    // resubscribe to message relays
    await context.chatController.subscribeToIncomingDms();
  }

  context.view.pop();
}

export {
  settingsMenu,
  settingsKeys,
  settingsProfile,
  settingsViewRelays,
  settingsEditInboxRelays,
  settingsEditGeneralRelays
};
