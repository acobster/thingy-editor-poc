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

const THINGY_TEXT_TOOLS = [{
  text: 'B',
  controls: 'selection',
  surroundsWith: {
    element: 'strong',
  },
  tooltip: 'Bold',
}, {
  text: 'I',
  controls: 'selection',
  surroundsWith: {
    element: 'em',
  },
  tooltip: 'Italicize',
}, {
  text: 'U',
  controls: 'selection',
  surroundsWith: {
    element: 'span',
    attrs: { style: 'text-decoration: underline' },
  },
  tooltip: 'Underline',
}]

const THINGY_TOOLS = {
  'div': {
    tools: THINGY_TEXT_TOOLS,
  },
  'p': {
    tools: THINGY_TEXT_TOOLS,
  },
  'a': {
    tools: [{
      text: 'href',
      label: 'Link href',
      type: 'text',
      controls: 'href',
      on: 'change',
    }],
  },
  'img': {
    tools: [{
      text: 'image??',
      type: 'image',
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

      makeEditable(cloned, opts)
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
  if (!node) return

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

function updateHref(tool, controlled, toolUiEvent) {
  controlled.href = toolUiEvent.target.value
}

function toolAction(tool, controlled, toolUiEvent) {
  if (tool.controls === 'selection') {
    styleSelection(tool, controlled, toolUiEvent)
  } else if (tool.controls === 'href') {
    updateHref(tool, controlled, toolUiEvent)
  }
}

function getToolTagName(tool) {
  if (tool.tagName) return tool.tagName
  if (tool.type === 'text') return 'input'
  if (tool.type === 'image') return 'image-picker'
  return 'button'
}

function addToolListener(toolElem, tool, controlled) {
  const on = tool.on || 'click'
  toolElem.addEventListener(on, e => { toolAction(tool, controlled, e) })
}

function createToolElement(tool, controlled, opts) {
  const toolElem = document.createElement(getToolTagName(tool))
  toolElem.innerHTML = tool.text

  if (toolElem.tagName === 'BUTTON') {
    toolElem.classList.add('te-btn')
  }
  if (tool.controls === 'href' && tool.type === 'text') {
    toolElem.value = controlled.href
  }
  if (tool.controls === 'innerText' && tool.type === 'text') {
    toolElem.value = controlled.innerText
  }

  if (tool.tooltip) {
    toolElem.title = tool.tooltip
  }

  addToolListener(toolElem, tool, controlled)

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

  if (toolset.length === 0) {
    container.innerHTML = '<p class="te-no-tools">No tools for this element</p>'
  } else {
    const toolElements = toolset.map(tool => {
      return createToolElement(tool, elem, opts)
    })
    container.innerHTML = ''
    toolElements.forEach(toolElem => {
      container.appendChild(toolElem)
    })
  }

  updateToolbarHeader(elem, editable, opts)
}

function matchNestedSelector(elem, opts) {
  if (!opts.nested) return null
  for (var i = 0; i < opts.nested.length; i++) {
    if (elem.matches(opts.nested[i])) return opts.nested[i]
  }
}

function updateToolbarHeader(elem, editable, opts) {
  const header = document.querySelector('#te-toolbar header')
  if (!header) return

  const path = opts.nested
    ? [opts.selector, matchNestedSelector(elem, opts)]
    : [matchNestedSelector(elem, opts)]

  header.innerHTML = path.join(' &raquo; ')
}

function initToolbar(opts) {
  if (!document.getElementById('te-toolbar')) {
    const toolbar = document.createElement('aside')
    toolbar.id = 'te-toolbar'
    toolbar.classList.add('te-toolbar')
    toolbar.innerHTML += '<strong>TOOLBAR</strong>'
    toolbar.innerHTML += '<header></header>'
    toolbar.innerHTML += '<div id="te-tools"></div>'

    opts.appendToolbarTo.appendChild(toolbar)
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

  // if this element is itself a link, disable it too
  if (elem.tagName.toLowerCase() === 'a') {
    elem.addEventListener('click', e => {
      e.preventDefault()
    })
  }
}



/*
 * MAIN
 */


function thingyEditable(editables, config) {
  config = config || {}

  config.appendToolbarTo = config.appendToolbarTo || document.body

  editables.forEach(editableOpts => {
    const elements = Array.from(document.querySelectorAll(editableOpts.selector))
    const options  = Object.assign(
      {},
      config || {},
      editableOpts
    )

    elements.forEach((elem) => {
      makeEditable(elem, options)
      disableLinks(elem, options)
    })
  })

  initToolbar(config)
}
