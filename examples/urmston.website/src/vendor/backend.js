export function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function get(key) {
  const val = localStorage.getItem(key)
  return val ? JSON.parse(val) : null
}
