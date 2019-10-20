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

function onCtrlEnter(e) {
  if ( ! (e.which === 13 && e.ctrlKey)) {
    return
  }

  e.preventDefault()

  // get the current cursor position before we do anything else
  const selection = window.getSelection()
  const focusPath = getPathWithin(selection.focusNode, e.target)
  const focusOffset = selection.focusOffset

  const elem = e.target
  const c = e.target.cloneNode(true)
  elem.parentNode.insertBefore(c, elem.nextSibling)
  c.focus()

  const range = document.createRange()
  range.setStart(getNodeByPath(c, focusPath), focusOffset)
  range.collapse(true)

  selection.removeAllRanges()
  selection.addRange(range)

  c.addEventListener('keypress', onCtrlEnter)
}

function enterCallback(_, opts) {
  if (!opts || !opts.onCtrlEnter) return onCtrlEnter
  if (typeof opts.onCtrlEnter === 'function') return opts.onCtrlEnter

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
}

function makeEditable(elem, opts) {
  elem.setAttribute('contenteditable', true)
  elem.addEventListener('keypress', enterCallback(elem, opts))
  if (opts && opts.disallowDefaultEnter) {
    elem.addEventListener('keypress', (e) => { e.preventDefault() })
  }
}

function thingyEditable(selector, opts) {
  Array.from(document.querySelectorAll(selector))
    .forEach((elem) => {
      makeEditable(elem, opts)
    })
}
