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

function makeEditable(elem, opts) {
  if (opts.nested) {
    opts.nested.forEach((selector) => {
      Array.from(elem.querySelectorAll(selector)).forEach(child => {
        child.setAttribute('contenteditable', true)
        child.setAttribute('tabindex', 0)
      })
    })
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


function thingyEditable(editables) {
  editables.forEach(config => {
    const elements = Array.from(document.querySelectorAll(config.selector))

    elements.forEach((elem) => {
      makeEditable(elem, config)
      disableLinks(elem, config)
    })
  })

}
