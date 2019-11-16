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

function update(e, opts, path, val) {
  if ( ! (opts.localStorageBackend && opts.localStorageBackend.topLevelKey) ) {
    throw new Error('localStorageBackend expects a localStorageBackend.topLevelKey key in config');
  }

  const key = opts.localStorageBackend.topLevelKey
  const data = get(key)
  const vector = path.split(' ')

  let merger = vector.reverse().reduce((_merger, step) => {
    let obj = {}
    obj[step] = _merger
    return obj
  }, val)

  save(key, _.merge(data, merger))
  console.log(vector, val)
}

