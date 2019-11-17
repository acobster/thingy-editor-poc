import _ from 'lodash'

export default {
  get,
  save,
  update,
}

function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

function get(key) {
  const val = localStorage.getItem(key)
  return val ? JSON.parse(val) : null
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

  const path = elem.dataset.thingyPath.split(' ')
  const merger = path.reverse().reduce((_merger, step) => {
    if (typeof step === 'object') return step
    let obj = {}
    obj[step] = _merger
    return obj
  }, op)
  const v = _.merge(data, merger)
  console.log(path, v, v.nav.items[2])
  save(key, v)
}

