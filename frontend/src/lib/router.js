import { trackView } from './supabase.js'

const _routes = {}
let _content  = null
let _current  = null

export function addRoute(pattern, loader) { _routes[pattern] = loader }
export function setContent(el) { _content = el }

export function navigate(path, push = false) {
  if (push) history.pushState({}, '', path)
  if (path === _current) return
  _current = path
  trackView(path)
  _dispatch(path)
}

function _dispatch(path) {
  for (const pattern of Object.keys(_routes)) {
    const keys = []
    const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)' }) + '$')
    const m = path.match(re)
    if (m) {
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
      if (_content) _content.innerHTML = `<div class="flex items-center justify-center h-64"><div class="w-8 h-8 border-2 border-ink-4 border-t-accent rounded-full animate-spin"></div></div>`
      _routes[pattern](params)
      return
    }
  }
  import('../pages/notfound.js').then(m => m.render(_content))
}

document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]')
  if (!a) return
  e.preventDefault()
  navigate(a.getAttribute('href'), true)
})

window.addEventListener('popstate', () => navigate(location.pathname))
