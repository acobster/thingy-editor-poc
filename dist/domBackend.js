export default { update }

function update(elem, op, config) {
  if (typeof op === 'function') {
    op(elem, config)
  } else if (typeof op === 'object') {
    Object.keys(op).forEach(k => {
      if (typeof op[k] === 'function') {
        op[k].call(elem)
      } else {
        elem[k] = op[k]
      }
    })
  }
}
