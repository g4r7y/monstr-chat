import tk from 'terminal-kit';
import { showMenu } from './terminalUi.js';
import type { ViewContext } from './viewRouter.js';

const { terminal } = tk;

async function mainMenu(context: ViewContext) {
  terminal.clear();
  terminal.bgGreen('Monstr Chat\n');
  const mainMenu = new Map();
  mainMenu.set('Chats', () => context.view.push('inbox'));
  mainMenu.set('Friends', () => context.view.push('contacts'));
  mainMenu.set('Settings', () => context.view.push('settings'));
  mainMenu.set('Quit', () => context.view.pop());
  await showMenu(mainMenu);
}

export { mainMenu };
