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

function update(key, path, val) {
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

