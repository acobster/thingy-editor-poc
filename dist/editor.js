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
 * - Good story for "hidden" elements or site settings:
 *   ➡️  API keys
 *   ➡️  page titles & descriptions
 *   ➡️  background images?
 *   ➡️  etc.
 *
 */

import localStorageBackend from './localStorageBackend'
import domBackend from './domBackend'

/**
 * Main event function. Handles events that potentially change the DOM or
 * the application state. Eventually should be completely pluggable and
 * transparent.
 */
function emit(toolEvent, config) {
  if ( ! (config && config.backends && typeof config.backends.forEach === 'function') ) {
    console.error('no valid backends detected')
    return
  }

  // call update on each backend
  config.backends.forEach(backend => {
    if (typeof backend.update !== 'function') {
      console.error('backend does not have an update function: ', backend)
    }
    backend.update(toolEvent.elem, toolEvent.op, config)
  })
}

// TODO refactor as an array
const THINGY_TEXT_TOOLS = [{
  text: 'B',
  controls: 'selection',
  command: 'bold',
  tooltip: 'Bold',
}, {
  text: 'I',
  controls: 'selection',
  command: 'italic',
  tooltip: 'Italicize',
}, {
  text: 'U',
  controls: 'selection',
  command: 'underline',
  tooltip: 'Underline',
}]

const THINGY_TOOLS = [{
  tools: THINGY_TEXT_TOOLS,
  selector: 'p,div',
}, {
  selector: 'a',
  tools: [{
    label: 'Link href',
    type: 'text',
    controls: 'href',
    on: 'keyup',
    path: 'url',
  }, {
    type: 'link',
    tag: 'a',
    linksTo: 'href',
    text: '➡️ '
  }],
}, {
  selector: 'img',
  tools: [{
    text: 'image??',
    type: 'image',
  }],
}]



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
}




/*
 * TOOLS
 */


function getToolTagName(tool) {
  if (tool.tagName) return tool.tagName
  if (tool.type === 'text') return 'input'
  if (tool.type === 'image') return 'div'
  return tool.tag || 'button'
}

function toolOp(tool, domEvent, elem) {
  if (tool.command) {
    // WYSIWYG tool
    document.execCommand(tool.command, null, tool.commandArg)
    return elem.innerHTML
  } else {
    const op = {}
    op[tool.controls] = domEvent.target.value
    return op
  }
}

function addToolListener(toolElem, tool, elem, config) {
  const on = tool.on || 'click'

  // wrap the event along with some context and emit the Event to our backends
  toolElem.addEventListener(on, domEvent => {
    // Close around the domEvent. We need to do this here because it tells us
    // the new value of the attribute being edited (e.g. in the case of a link
    // editor, where we get the new href from an <input> inside the tool).
    const op = toolOp(tool, domEvent, elem)
    const toolEvent = { domEvent, elem, op }

    emit(toolEvent, config)
  })
}

function createToolElement(tool, controlled, opts) {
  const toolElem = document.createElement(getToolTagName(tool))
  toolElem.classList.add('te-tool--'+tool.type)

  if (tool.text) {
    toolElem.innerHTML = tool.text
  }
  if (toolElem.tagName === 'BUTTON') {
    toolElem.classList.add('te-btn')
  }
  if (tool.controls === 'href' && tool.type === 'text' && controlled.href) {
    toolElem.value = controlled.href
  }
  if (tool.linksTo === 'href') {
    toolElem.id     = 'te-link-tester'
    toolElem.href   = controlled.href
    toolElem.target = '_blank'
  }
  if (tool.type === 'image') {
    toolElem.innerHTML = ''
    opts.imageLibrary.forEach(image => {
      const imgElem  = document.createElement('img')
      imgElem.src    = image.src
      imgElem.srcset = image.srcset
      imgElem.title  = image.title
      imgElem.alt    = image.alt

      imgElem.onclick = e => {
        controlled.src    = image.src
        controlled.srcset = image.srcset
        controlled.title  = image.title
        controlled.alt    = image.alt
      }

      toolElem.appendChild(imgElem)
    })
  }

  if (tool.tooltip) {
    toolElem.title = tool.tooltip
  }

  addToolListener(toolElem, tool, controlled, opts)

  return toolElem
}

function displayTools(focusEvent, editable, config) {
  const container = document.getElementById('te-tools')
  if (!container) return

  // TODO revise focus logic to make it so we can more reliably focus on
  // parent <a> elements, so we don't have to do hacky shit like this
  const elem = config.nested ? focusEvent.target : editable

  const toolset = config.tools.filter(tool => {
    // TODO maintain mapping of which element this tool is controlling
    const applicable = editableMatchesSelector(elem, editable, tool.selector)

    if (typeof config.toolOperatesOnElement === 'function') {
      return config.toolOperatesOnElement(tool, elem, applicable)
    } else {
      return applicable
    }
  }).reduce((toDisplay, t) => {
    return toDisplay.concat(t.tools)
  }, [])

  if (toolset.length === 0) {
    container.innerHTML = '<p class="te-no-tools">No tools for this element</p>'
  } else {
    const toolElements = toolset.map(tool => {
      // TODO Determine which element this tool is controlling
      return createToolElement(tool, elem, config)
    })
    container.innerHTML = ''
    toolElements.forEach(toolElem => {
      container.appendChild(toolElem)
    })
  }

  updateToolbarHeader(elem, editable, config)
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
    : [opts.selector]

  header.innerHTML = path.join(' &raquo; ')
}


function makeDraggable(elem) {
  var relativeX = 0, relativeY = 0
  if (document.querySelector(".drag-handle")) {
    // if present, the header is where you move the DIV from:
    document.querySelector(".drag-handle").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elem.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup, relative to elem
		relativeX = e.clientX - elem.offsetLeft
		relativeY = e.clientY - elem.offsetTop

    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // set the element's new position relative to the cursor
    elem.style.left = (e.clientX - relativeX) + "px";
    elem.style.top = (e.clientY - relativeY) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function initToolbar(opts) {
  if (!document.getElementById('te-toolbar')) {
    const toolbar = document.createElement('aside')
    toolbar.id = 'te-toolbar'
    toolbar.classList.add('te-toolbar')
    toolbar.style.cursor = 'move'
    toolbar.innerHTML += '<h3 class="drag-handle">TOOLBAR</h3>'
    toolbar.innerHTML += '<header></header>'
    toolbar.innerHTML += '<div id="te-tools"></div>'

    opts.appendToolbarTo.appendChild(toolbar)

    makeDraggable(toolbar, opts)
  }
}

function nearElement(x, y, elem, outlineWidth) {
  const rect = elem.getBoundingClientRect()
  return x > rect.left   - outlineWidth
      && x < rect.right  + outlineWidth
      && y > rect.top    - outlineWidth
      && y < rect.bottom + outlineWidth
}

function displayElementActions(elem, config) {
  if (!config.repeatable) return

  const minus = document.createElement('div')

  minus.innerText = '-'
  minus.style.position = 'fixed'
  minus.style.top = (elem.getBoundingClientRect().top) + 'px'
  minus.style.left = (elem.getBoundingClientRect().right + 16) + 'px'
  minus.style.color = 'red'
  minus.style.fontWeight = 'bold'
  minus.style.fontSize = '52px'
  minus.style.cursor = 'pointer'

  // TODO create editable CRUD Event system
  minus.addEventListener('click', e => {
    elem.parentNode.removeChild(elem)
  })

  const plus = document.createElement('div')

  plus.innerText = '+'
  plus.style.position = 'fixed'
  plus.style.top = (elem.getBoundingClientRect().bottom - 52) + 'px'
  plus.style.left = (elem.getBoundingClientRect().right + 16) + 'px'
  plus.style.color = 'red'
  plus.style.fontWeight = 'bold'
  plus.style.fontSize = '52px'
  plus.style.cursor = 'pointer'

  config.appendToolbarTo.appendChild(plus)

  plus.addEventListener('click', e => {
    const clone = cloneEditable(elem, config)
    makeEditable(clone, config)
  })

  config.appendToolbarTo.appendChild(minus)
  config.appendToolbarTo.appendChild(plus)

  // TODO create editable CRUD Event system
  plus.addEventListener('click', e => {
    const clone = cloneEditable(elem, config)
    makeEditable(clone, config)
  })

  return [minus, plus]
}

function initMouseListeners(editables) {
  document.documentElement.addEventListener('mousemove', (e) => {
    editables.forEach(({ elem, config }) => {
      if (nearElement(e.clientX, e.clientY, elem, 16)) {
        //console.log([e.clientX, e.clientY], [elem.offsetLeft, elem.offsetTop])
        elem.style.outline = '16px solid red'
      } else {
        elem.style.outline = 'initial'

        // when mouse leaves area, hide the element actions unless it comes
        // back within a half second
      }

      if (config.repeatable) {
        const nearby = nearElement(e.clientX, e.clientY, elem, 16+52)

        if (nearby && !(elem.actions && elem.actions.length)) {
          elem.actions = displayElementActions(elem, config)
        } else if (!nearby && elem.actions && elem.actions.length) {
          elem.actions.forEach(a => {
            if (a.parentNode) a.parentNode.removeChild(a)
          })
          elem.actions = []
        }
      }
    })
  })
  document.documentElement.addEventListener('click', (e) => {
    editables.forEach(({ elem }) => {
      // TODO may be "near" multiple editables; pick one to focus on
      // (based on nesting?? innermost position?)
      if (nearElement(e.clientX, e.clientY, elem, 16)) {
        elem.focus()
      }
    })
  })
}



/*
 * INIT
 */


var EDITABLES = [];

function subscribe(elem, config) {
  EDITABLES.push({ elem, config })
}

function listenForInnerTextEdits(elem, config) {
  // TODO do this in a more declarative way
  elem.addEventListener('keyup', domEvent => {
    const op        = domEvent.target.innerText
    const toolEvent = { domEvent, elem, op }

    // stop listeners on parent elements from firing
    domEvent.stopImmediatePropagation()

    emit(toolEvent, config)
  })
}

function makeEditable(elem, config) {
  subscribe(elem, config)
  elem.style.cursor = 'pointer'

  if (config.nested) {
    config.nested.forEach((selector) => {
      Array.from(elem.querySelectorAll(selector)).forEach(child => {
        child.setAttribute('contenteditable', true)
        child.setAttribute('tabindex', 0)
        child.addEventListener('focus', e => {
          displayTools(e, elem, config)
        })

        // if child doesn't already have an independent config,
        // create one for it
        const childConfig = (typeof selector === 'object')
          ? selector
          : { selector }
        subscribe(child, childConfig)

        child.style.cursor = 'pointer'

        listenForInnerTextEdits(child, config)
      })
    })
  } else {
    // TODO test this
    elem.setAttribute('contenteditable', true)
    elem.setAttribute('tabindex', 0)
    elem.addEventListener('focus', e => {
      displayTools(e, elem, config)
    })
    listenForInnerTextEdits(elem, config)
  }

  if (config.repeatable) {
    elem.addEventListener('keypress', enterCallback(elem, config))
  }

  if (config && config.disallowDefaultEnter) {
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

  // check if user has explicitly disabled domBackend;
  // if not, attach the domBackend by default
  if (config.disableDomBackend !== false) {
    config.backends.push(domBackend)
  }

  const userTools = config.tools || []
  config.tools = THINGY_TOOLS.concat(userTools)

  editables.forEach(editableOpts => {
    const elements = Array.from(document.querySelectorAll(editableOpts.selector))
    const options  = Object.assign({}, config, editableOpts)

    elements.forEach((elem) => {
      makeEditable(elem, options)
      disableLinks(elem, options)
    })
  })

  initToolbar(config)
  initMouseListeners(EDITABLES)
}

export {
  thingyEditable,
  localStorageBackend,
}
