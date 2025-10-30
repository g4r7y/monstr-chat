import tk from 'terminal-kit'

const { terminal, Rect, ScreenBuffer } = tk


export async function showPrompt(question: string, defaultResponse: string = '', minLength: number = 0): Promise<string | null> {
  terminal(question)
  const response = await terminal.inputField({ minLength, maxLength: 512, cancelable: true, default: defaultResponse }).promise
  return response === undefined ? null : response
}
  
  
export async function showYesNoPrompt(question: string): Promise<boolean> {
  terminal(question + ' [Y|n] ')
  const response = await terminal.yesOrNo( { yes: ['y', 'ENTER'] , no: ['n'] }).promise
  terminal('\n')
  return response==true
}


/**
 * Shows a menu, awaits user selection and executes selected menu action.
 * @param {*} menuChoices Map of menu options, where the key is the menu label and the value is a synchronous function to apply when option is selected.
*/
export async function showMenu(menuChoices: Map<string, ()=>void>, options={}) {
  const menuItems = Array.from(menuChoices.keys())
  let response
  response = await terminal.singleColumnMenu(menuItems, {oneLineItem:true, ...options}).promise
  if (menuChoices.has(response.selectedText)) {
    // get the corresponding synchronous action function for the selected key
    const fn = menuChoices.get(response.selectedText)
    // execute it
    if (fn) {
      fn()
    }
  }
}

export async function showHorizontalMenu(menuChoices: Map<string, ()=>void>) {
  const menuItems = Array.from(menuChoices.keys())
  let response
  response = await terminal.singleLineMenu(menuItems, {
    selectedStyle: terminal.inverse }
    ).promise
  if (menuChoices.has(response.selectedText)) {
    // get the corresponding synchronous action function for the selected key
    const fn = menuChoices.get(response.selectedText)
    // execute it
    if (fn) {
      fn()
    }
  }
}

export async function showDialog(title: string, questions: string[], defaultAnswers: string[]): Promise<string[] | null> {
  terminal.bgBlue(`${title}\n\n`)
  // first print all questions and default answers in greyed out colour
  terminal.saveCursor()
  for(let q=0; q<questions.length; q++) {
    const defaultAnswer = defaultAnswers[q] ? defaultAnswers[q] : ''
    terminal.gray(`${questions[q]}: `)
    terminal.gray(defaultAnswer)
    terminal('\n')
  }
  // move cursor back up and iterate through each question prompt
  terminal.restoreCursor()
  const responses = new Array()
  for(let q=0; q<questions.length; q++) {
    const defaultAnswer = defaultAnswers[q] ? defaultAnswers[q] : ''
    terminal.saveCursor()
    const answer = await showPrompt(`${questions[q]}: `, defaultAnswer)
    if (answer == null) {
      return null
    }
    responses.push(answer)
    // gray out current question before we move to next one
    terminal.restoreCursor()
    terminal.gray(`${questions[q]}: `)
    terminal.gray(answer)
    terminal('\n')
  }
  return responses
}


export async function startScrollPane(lines: string[], headerHeight: number, footerHeight: number) {
  
  let contentHeight = lines.length
  const maxScrollY = contentHeight + headerHeight + footerHeight - terminal.height
  let scrollY = 0
  if (maxScrollY > 0) {
    scrollY = maxScrollY
  }

  let buffer = new ScreenBuffer({ 
    dst: terminal,
    width: terminal.width+1,
    height: contentHeight+1,
    y: 0,
    blending: false
  })

  function lengthWithoutMarkup(str: string) {
    const stripped = str.replace( /\^\[[^\]]*]?|\^(.)/g , ( match: string, second: string ) => {
      if ( second === ' ' || second === '^' ) {
        return second ;
      }
      return '' ;
    } )
    return tk.stringWidth(stripped)
  }

  function renderBuffer() {
    let clipRect = new Rect({x:1, y:1+headerHeight, width: terminal.width, height: terminal.height - headerHeight -footerHeight})
    buffer.draw({
      dst: terminal,
      x: 0,
      y: -scrollY + headerHeight,
      dstClipRect: clipRect

    })
    terminal.styleReset('\n\n')
  }

  for (let i=0; i<contentHeight; i++) {
    const text = lines[i]
    const padChars = Math.max(0, terminal.width - lengthWithoutMarkup(text))
    buffer.put({x: 1, y: i+1, markup: true} as any, text + ' '.repeat(padChars))
  }

  renderBuffer()
  
  terminal.on( 'key' , ( key: string ) => {
    switch ( key ) {
      case 'UP' :
        if (scrollY > 0) {
          scrollY--
          terminal.saveCursor()
          renderBuffer()
          terminal.restoreCursor()
        }
        break ;
      case 'DOWN' :
        if (scrollY < maxScrollY ) {
          terminal.saveCursor()
          scrollY++
          renderBuffer()
          terminal.restoreCursor()
        }
        break ;
      }
  })
}

export function stopScrollPane() {
  terminal.removeAllListeners('key')
}