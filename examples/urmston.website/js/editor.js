/*
 * This is a prototype of the Thingy Editor.
 *
 * Questions to answer:
 *
 * - How does Thingy Editor "take over" the DOM? Should actions it takes be
 *   reversible (adding event listeners, UI interactions via Ctrl+Z)?
 *
 * - How does persistence work? Should it be coupled to server-side rendering
 *   in any way? (hopefully not)
 *
 * - How to determine which editor commands/options are available to a given
 *   selector?
 *   ➡️  cascading map of options/settings
 *   ➡️  sensible defaults
 *
 * - How to display/toggle editor GUI controls?
 *   ➡️  pseudo-elements won't work, will need to inject elements into the DOM
 *   ➡️  negative margins for positioning? How generically can that work?
 *
 */


THINGY_TOOLS = {
  'p': {
    tools: [{
      text: 'B',
      controls: 'selection',
      surroundsWith: {
        element: 'strong',
      },
    }, {
      text: 'I',
      controls: 'selection',
      surroundsWith: {
        element: 'em',
      },
    }, {
      text: 'U',
      controls: 'selection',
      surroundsWith: {
        element: 'span',
        attrs: { style: 'text-decoration: underline' },
      },
    }],
  },
  'a': {
    tools: [{
      text: 'href',
      type: 'text',
      controls: 'href',
    }, {
      text: 'text',
      type: 'text',
      controls: 'innerText',
    }],
  },
}



/*
 * DOM HELPERS
 */


function getNodeIndex(node) {
  let i = 0
  while (node = node.previousSibling) {
    i++
  }
  return i
}

function getPathWithin(node, ancestor, child) {
  if (node.parentElement === null) {
    return null
  }
  if (node === ancestor) {
    return []
  }

  const pathOut = [getNodeIndex(node)]
    .concat(getPathWithin(node.parentNode, ancestor, true))

  return child ? pathOut : pathOut.reverse()
}

function getNodeByPath(ancestor, path) {
  return path.reduce((node, idx) => {
    if (!node || !node.childNodes[idx]) {
      return null
    }

    return node.childNodes[idx]
  }, ancestor)
}

function editableMatchesSelector(elem, editable, selector) {
  if (elem.matches(selector)) return elem
  if (editable.matches(selector)) return editable

  if (elem.tagName === null) {
    return elem.parentNode
  }
}



/*
 * EDITABLES
 */


function getFirstNestedEditable(elem, opts) {
  const selector = opts.nested.join(',')
  return elem.querySelectorAll(selector).item(0)
}

function cloneEditable(elem, opts) {
  /*
  // get the current cursor position before we do anything else
  const selection = window.getSelection()
  const focusPath = getPathWithin(selection.focusNode, elem)
  const focusOffset = selection.focusOffset
  */

  const c = elem.cloneNode(true)
  elem.parentNode.insertBefore(c, elem.nextSibling)

  if (opts.nested) {
    const child = getFirstNestedEditable(c, opts)

    const range = document.createRange()
    range.selectNodeContents(child)

    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  }

  /*
  c.focus()

  const range = document.createRange()
  range.setStart(getNodeByPath(c, focusPath), focusOffset)
  range.collapse(true)

  selection.removeAllRanges()
  selection.addRange(range)
  */

  return c
}

function enterCallback(elem, opts) {
  //if (!opts || !opts.onCtrlEnter) return onCtrlEnter
  if (typeof opts.onCtrlEnter === 'function') return opts.onCtrlEnter

  return e => {
    if (e.which === 13 && e.ctrlKey) {
      e.preventDefault()

      const editable = opts.cloneFocusedElement ? e.target : elem
      const cloned = cloneEditable(editable, opts)

      cloned.addEventListener('keypress', enterCallback(elem, opts))
      cloned.addEventListener('focus', e => {
        displayTools(e, elem, opts)
      })
    }
  }

  /*
  // special text-based handling for inline elems??
  return function __onCtrlEnter(e) {
    if ( ! (e.which === 13 && e.ctrlKey)) return
    e.preventDefault()

    e.target.innerText += opts.onCtrlEnter.appendText

    const range = document.createRange()
    range.selectNodeContents(e.target)
    range.collapse(false)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)

    return false
  }
  */
}




/*
 * TOOLS
 */


function createStyleElement(innerText, tool, controlled, toolUiEvent) {
  const elem = document.createElement(tool.surroundsWith.element)
  elem.innerText = innerText

  if (tool.surroundsWith.attrs) {
    Object.keys(tool.surroundsWith.attrs).forEach(k => {
      elem.setAttribute(k, tool.surroundsWith.attrs[k])
    })
  }

  return elem
}

function styleSelection(tool, controlled, toolUiEvent) {
  const selection = window.getSelection()
  // assume for now that selection is inside a single node,
  // and that it's a text node, and that no other text nodes are adjacent to it
  const node = selection.focusNode
  const selectionLength = selection.focusOffset - selection.anchorOffset

  const subStart = selection.anchorOffset
  const subEnd = selection.focusOffset
  const chunks = [
    node.wholeText.substring(0, subStart),
    node.wholeText.substring(subStart, subEnd),
    node.wholeText.substring(subEnd),
  ]

  const styleNode = createStyleElement(chunks[1], tool, controlled, toolUiEvent)

  const siblingNode = node.nextSibling
  const parentNode = node.parentNode

  const inject = node.nextSibling
    ? (chunks) => {
      parentNode.insertBefore(new Text(chunks[0]), siblingNode)
      parentNode.insertBefore(styleNode, siblingNode)
      parentNode.insertBefore(new Text(chunks[2]), siblingNode)
    }
    : (chunks) => {
      parentNode.appendChild(new Text(chunks[0]))
      parentNode.appendChild(styleNode)
      parentNode.appendChild(new Text(chunks[2]))
    }

  controlled.removeChild(node)
  inject(chunks)
}

function toolAction(tool, controlled, toolUiEvent) {
  if (tool.controls === 'selection') {
    styleSelection(tool, controlled, toolUiEvent)
  }
}

function getToolTagName(tool) {
  if (tool.tagName) return tool.tagName
  if (tool.type === 'text') return 'input'
  return 'button'
}

function createToolElement(tool, controlled) {
  const toolElem = document.createElement(getToolTagName(tool))
  toolElem.innerHTML = tool.text

  if (tool.controls === 'href' && tool.type === 'text') {
    toolElem.value = controlled.href
  }
  if (tool.controls === 'innerText' && tool.type === 'text') {
    toolElem.value = controlled.innerText
  }

  toolElem.addEventListener('click', e => { toolAction(tool, controlled, e) })

  return toolElem
}

function displayTools(focusEvent, editable, opts) {
  const container = document.getElementById('te-tools')
  if (!container) return

  const elem = opts.nested ? focusEvent.target : editable

  const toolset = Object.keys(THINGY_TOOLS).filter(selector => {
    // TODO maintain mapping of which element this tool is controlling
    return editableMatchesSelector(elem, editable, selector)
  }).reduce((tools, selector) => {
    return tools.concat(THINGY_TOOLS[selector].tools)
  }, [])

  const toolElements = toolset.map(tool => { return createToolElement(tool, elem) })

  container.innerHTML = ''
  toolElements.forEach(toolElem => {
    container.appendChild(toolElem)
  })

  const footer = document.querySelector('#te-toolbar footer')
  if (footer) footer.innerHTML = elem.tagName.toLowerCase()
}

function initToolbar(elem, opts) {
  if (!document.getElementById('te-toolbar')) {
    const toolbar = document.createElement('aside')
    toolbar.id = 'te-toolbar'
    toolbar.innerHTML = '<strong>TOOLBAR</strong><div id="te-tools"></div><footer></footer>'

    toolbar.style.position = 'fixed'
    toolbar.style.right = 0
    toolbar.style.top = '2em'
    toolbar.style.margin = '0.3em'
    toolbar.style.padding = '0.3em 0.7em'
    toolbar.style.border = '1px solid grey'
    toolbar.style.background = '#eee'
    toolbar.style.textAlign = 'left'

    toolbar.querySelector('footer').style.color = 'black'
    toolbar.querySelector('footer').style.fontFamily = 'monospace'
    toolbar.querySelector('footer').style.textAlign = 'left'

    document.body.appendChild(toolbar)
  }
}



/*
 * INIT
 */


function makeEditable(elem, opts) {
  if (opts.nested) {
    opts.nested.forEach((selector) => {
      Array.from(elem.querySelectorAll(selector)).forEach(child => {
        child.setAttribute('contenteditable', true)
        child.setAttribute('tabindex', 0)
        child.addEventListener('focus', e => {
          displayTools(e, elem, opts)
        })
      })
    })
  } else {
    // TODO test this
    elem.setAttribute('contenteditable', true)
    elem.setAttribute('tabindex', 0)
  }

  if (opts.cloneOnCtrlEnter) {
    elem.addEventListener('keypress', enterCallback(elem, opts))
  }

  if (opts && opts.disallowDefaultEnter) {
    elem.addEventListener('keypress', (e) => { if (e.which === 13) e.preventDefault() })
  }
}

function disableLinks(elem, opts) {
  Array.from(elem.querySelectorAll('a')).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault()
    })
  })
}



/*
 * MAIN
 */


function thingyEditable(editables) {
  editables.forEach(config => {
    const elements = Array.from(document.querySelectorAll(config.selector))

    elements.forEach((elem) => {
      makeEditable(elem, config)
      disableLinks(elem, config)
    })
  })

  initToolbar()
}
