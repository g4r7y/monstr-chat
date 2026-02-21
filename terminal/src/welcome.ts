import tk from 'terminal-kit';
import { isValidNsec, isValidBip39Word, isValidBip39Phrase } from '@core/validation.js';
import { showPrompt, showYesNoPrompt, showMenu, pressToContinue } from './terminalUi.js';
import type { ViewContext } from './viewRouter.js';
const { terminal } = tk;

async function welcome(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Monstr Chat\n\n');
  terminal.green('Welcome to Monstr Chat!\n\n');
  terminal.yellow('Get started\n\n');
  terminal(
    'Monstr Chat is a messaging app built on Nostr.\n\n' +
      'To get started all you need is your own Nostr key.\n\n' +
      'This is an identifier which is unique to you and allows you to securely send and receive encrypted messages.\n' +
      'It will also work with any other app that is built on Nostr.\n\n' +
      'You can create your own key now or, if you already have a Nostr key, you can use that.\n'
  );
  let option = '';
  const menu1 = new Map();
  menu1.set('Create a key', () => (option = 'create'));
  menu1.set('I have a key', () => (option = 'restore'));
  await showMenu(menu1);

  if (option === 'create') {
    const mnemonic = await context.chatController.createNewKey();
    terminal.clear();
    terminal.bgGreen('Monstr Chat\n\n');
    terminal.green('Welcome to Monstr Chat!\n\n');
    terminal.yellow('Your new Nostr key has been created\n\n');
    terminal(
      'You now have a public Nostr key and a secret Nostr key.\n' +
        'Your keys are saved in the Monstr Chat settings.\n\n' +
        'Your public key starts with npub. You should share your public key with your friends so that they can chat with you.\n\n' +
        'Your secret key starts with nsec. Never share your secret key with anybody!\n\n'
    );
    terminal('Your public Nostr key is: \n');
    terminal.yellow(`${context.chatController.getNpub()}\n\n`);
    await pressToContinue('Continue?');

    terminal.clear();
    terminal.bgGreen.brightWhite('Monstr Chat\n\n');
    terminal.green('Welcome to Monstr Chat!\n\n');
    terminal.yellow('Save your recovery phrase!\n\n');
    terminal(
      'A 12-word recovery phrase has been generated for you.\n\n' +
        'You can use this in future to restore your Nostr key.\n' +
        'You may need to do this if you reset your device or if you wish to access your messages on another device.\n\n' +
        'Write it down and keep it in a safe place. Do not share it with anybody.\n' +
        'After you press ok, you will never be able to see it again.\n\n' +
        'Your recovery phrase is:\n'
    );
    terminal.yellow(`${mnemonic}\n\n`);

    await pressToContinue('Ready to start?');
    terminal.red('\n');
    await pressToContinue(`Have you written down your recovery phrase? You won't be able to see it again!`);
    context.view.pop();
    return;
  }

  if (option === 'restore') {
    terminal.clear();
    terminal.bgGreen('Monstr Chat\n\n');
    terminal.green('Welcome to Monstr Chat!\n\n');
    terminal.yellow('Restore your key\n\n');
    terminal(
      'There are two ways to restore your key.\n\n' +
        'You can use your Nostr secret key (nsec).\n' +
        "It starts with 'nsec' and is 63 characters long.\n\n" +
        'Or you can use your recovery phrase.\n' +
        'This is the 12-word phrase that you hopefully stored safely when you created your key.\n'
    );
    terminal('How would you like to restore your key?\n');
    const menu2 = new Map();
    menu2.set('I have my nsec private key', () => (option = 'restoreNsec'));
    menu2.set('I have my recovery phrase', () => (option = 'restoreBip39'));
    await showMenu(menu2);
  }

  if (option === 'restoreNsec') {
    terminal('\n');
    let editing = true;
    let initialText = 'nsec';
    terminal.saveCursor();
    while (editing) {
      terminal.restoreCursor();
      terminal.eraseDisplayBelow();
      let nsec = await showPrompt('Enter your private key: ', initialText);
      if (nsec === null) {
        editing = false;
      } else if (!isValidNsec(nsec)) {
        editing = await showYesNoPrompt('\nNot a valid nsec key. Try again?');
        initialText = nsec;
      } else {
        editing = false;
        await context.chatController.resetKey(nsec);
        terminal.yellow('\n\nYour key has been restored!\n\n');
        await pressToContinue('Ready to start?');
      }
    }
  }

  if (option === 'restoreBip39') {
    terminal('\n');
    let editing = true;
    let initialText = '';
    let words = '';
    let wordNum = 1;
    terminal.saveCursor();
    while (editing) {
      terminal.restoreCursor();
      terminal.eraseDisplayBelow();
      terminal.yellow(`Recovery phrase: ${words}\n`);
      if (wordNum <= 12) {
        let word = await showPrompt(`Enter word ${wordNum}: `, initialText);
        initialText = '';
        if (word === null) {
          editing = false;
        } else if (!isValidBip39Word(word)) {
          editing = await showYesNoPrompt('Not a valid word. Try again?');
          initialText = word;
        } else {
          words = words ? `${words} ${word}` : word;
          wordNum++;
        }
      } else {
        // final word has been entered
        if (!isValidBip39Phrase(words)) {
          editing = await showYesNoPrompt('\nRecovery phrase is not a valid combination of words. Start again?');
          words = '';
          wordNum = 1;
        } else {
          editing = false;
          try {
            await context.chatController.resetKeyFromSeedWords(words);
            terminal.yellow('\nYour key has been restored!\n\n');
            await pressToContinue('Ready to start?');
          } catch {
            editing = await showYesNoPrompt('\nFailed to restore your key from recovery phrase. Start again?');
            words = '';
            wordNum = 1;
          }
        }
      }
    }
  }

  context.view.pop();
}

export { welcome };
