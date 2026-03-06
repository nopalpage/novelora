import './style.css'
import Alpine from 'alpinejs'
import { initAuth, onAuthChange, isAdmin } from './lib/auth.js'
import { navigate, addRoute, setContent }  from './lib/router.js'
import { initToast }  from './lib/toast.js'
import { renderShell } from './components/shell.js'
import { initWasm }   from './lib/wasm.js'

window.Alpine = Alpine

async function boot() {
  document.getElementById('app').innerHTML = ''

  // Persistent shell (nav + footer + modals)
  renderShell(document.getElementById('app'))
  setContent(document.getElementById('page-content'))

  // Init systems
  initToast()
  await initAuth()

  // Load WASM non-blocking
<<<<<<< HEAD
  initWasm('/wasm/novelora.wasm').catch(() => {})
=======
  initWasm('/wasm/novelnest.wasm').catch(() => {})
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48

  // Register routes
  addRoute('/',               () => import('./pages/home.js').then(m => m.render()))
  addRoute('/browse',         () => import('./pages/browse.js').then(m => m.render()))
  addRoute('/novel/:id',      (p) => import('./pages/novel.js').then(m => m.render(p.id)))
  addRoute('/read/:id',       (p) => import('./pages/read.js').then(m => m.render(p.id)))
  addRoute('/rankings',       () => import('./pages/rankings.js').then(m => m.render()))
  addRoute('/profile',        () => import('./pages/user/profile.js').then(m => m.render()))
  addRoute('/bookmarks',      () => import('./pages/user/bookmarks.js').then(m => m.render()))
  addRoute('/admin',          () => import('./pages/admin/dashboard.js').then(m => m.render()))
  addRoute('/admin/novels',   () => import('./pages/admin/novels.js').then(m => m.render()))
  addRoute('/admin/chapters/:novelId', (p) => import('./pages/admin/chapters.js').then(m => m.render(p.novelId)))
  addRoute('/admin/users',    () => import('./pages/admin/users.js').then(m => m.render()))
  addRoute('/admin/ads',      () => import('./pages/admin/ads.js').then(m => m.render()))
  addRoute('/admin/analytics',() => import('./pages/admin/analytics.js').then(m => m.render()))

  // Update nav on auth change
  onAuthChange(() => {
    document.querySelector('[data-nav-user]')?.dispatchEvent(new Event('auth-update'))
  })

  // Navigate
  navigate(location.pathname)

  // Alpine.js start (for interactive components)
  Alpine.start()
}

boot()
