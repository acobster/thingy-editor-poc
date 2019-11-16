import _ from 'lodash'

export function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function get(key) {
  const val = localStorage.getItem(key)
  return val ? JSON.parse(val) : null
}

export function update(key, path, val) {
  const data = get(key)
  const vector = path.split(' ')

  let merger = vector.reverse().reduce((_merger, step) => {
    let obj = {}
    obj[step] = _merger
    console.log(obj)
    return obj
  }, val)

  save(key, _.merge(data, merger))
}

