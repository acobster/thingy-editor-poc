import _ from 'lodash'

export default {
  get,
  save,
  update,
}

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

function get(key, defaultVal) {
  const val = localStorage.getItem(key)
  return val ? JSON.parse(val) : defaultVal
}

function update(elem, op, config) {
  if ( ! (config.localStorageBackend && config.localStorageBackend.topLevelKey) ) {
    throw new Error('localStorageBackend expects a localStorageBackend.topLevelKey key in config');
  }

  if ( ! elem.dataset.thingyPath ) {
    console.error('no data-thingy-path attr found on element', elem)
    return
  }

  const key = config.localStorageBackend.topLevelKey
  const data = get(key)

  // handle strings as special ops indicating an edit to the innerText
  if (typeof op === 'string') {
    op = { innerText: op }
  }

  const path = elem.dataset.thingyPath.split(' ')
  const merger = path.reverse().reduce((_merger, step) => {
    if (typeof step === 'object') return step
    let obj = {}
    obj[step] = _merger
    return obj
  }, op)
  const v = _.merge(data, merger)
  save(key, v)
}

