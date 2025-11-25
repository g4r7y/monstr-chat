import tk from 'terminal-kit'
import { showMenu } from './terminalUi.js'
import { ViewContext } from './viewRouter.js'

const { terminal } = tk


async function mainMenu(context: ViewContext) {
  terminal.clear()
  terminal.bgGreen('Monstr Chat\n')
  const mainMenu = new Map()
  mainMenu.set('Messages', () => context.view.push('inbox'))
  mainMenu.set('Contacts',  () => context.view.push('contacts'))
  mainMenu.set('New Message', () => context.view.push('newMessage'))
  mainMenu.set('Settings',  () => context.view.push('settings'))
  mainMenu.set('Quit', () => context.view.pop())
  await showMenu(mainMenu)
}

export { mainMenu }