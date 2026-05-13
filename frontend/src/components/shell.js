import { getAuth, signOut, isAdmin, isLoggedIn, onAuthChange } from '../lib/auth.js'
import { navigate } from '../lib/router.js'
import { toastSuccess } from '../lib/toast.js'
import { openAuthModal } from './auth-modal.js'

export function renderShell(app) {
  app.innerHTML = `
    ${_nav()}
    <main id="page-content" class="min-h-[calc(100vh-60px)]"></main>
    ${_footer()}
    <div id="modal-root"></div>
    <div id="drawer-root"></div>
  `

  // Wire nav events
  _bindNav()

  // Re-render user section when auth changes
  onAuthChange((auth) => _updateNavUser(auth))
}

function _nav() {
  return `
  <header class="sticky top-0 z-[100] bg-paper/95 backdrop-blur-md border-b border-line">
    <!-- Announce bar -->
    <div class="bg-ink text-paper text-center py-2 text-[12px]">
      🎉 Novelora is live — free to read &amp; write. &nbsp;
      <a href="/browse" data-link class="text-[#e8c89a] border-b border-[#e8c89a]/40 hover:border-[#e8c89a]">Explore →</a>
    </div>
    <div class="container mx-auto px-6">
      <div class="flex items-center h-[60px] gap-0">
        <!-- Logo -->
        <a href="/" data-link class="flex items-center gap-2 mr-8 shrink-0">
          ${_logoSvg(32)}
          <span class="font-serif text-[19px] font-bold tracking-tight">Novelora</span>
        </a>
        <!-- Nav links -->
        <nav class="hidden md:flex items-center flex-1">
          <a href="/"         data-link class="nav-link">Browse</a>
          <a href="/browse"   data-link class="nav-link">Genres</a>
          <a href="/rankings" data-link class="nav-link">Rankings</a>
          <span class="nav-link cursor-pointer" id="nav-write-btn">Write</span>
        </nav>
        <!-- Right side -->
        <div class="flex items-center gap-2 ml-auto">
          <!-- Search -->
          <div class="hidden md:flex items-center gap-2 h-[34px] px-3 bg-paper-2 border border-line rounded text-[13px] hover:border-ink-3 transition-colors" id="nav-search-wrap">
            <svg class="w-3.5 h-3.5 text-ink-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="15.65" y2="15.65"/>
            </svg>
            <input type="text" placeholder="Search novels…" class="bg-transparent border-0 outline-none text-[13px] w-40 placeholder:text-ink-4" id="nav-search-input" autocomplete="off" />
          </div>
          <!-- Realtime badge -->
          <span class="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-3 mr-1">
            <span class="realtime-dot"></span>Live
          </span>
          <!-- User area -->
          <div id="nav-user-area" data-nav-user></div>
        </div>
      </div>
    </div>
  </header>`
}

function _guestButtons() {
  return `
    <button class="btn btn-ghost" id="btn-signin">Sign in</button>
    <button class="btn btn-primary" id="btn-join">Join free</button>`
}

function _userMenu(auth) {
  const admin = auth.role === 'admin'
  return `
  <div class="relative" x-data="{ open: false }">
    <button @click="open = !open" @click.away="open = false"
      class="flex items-center gap-2 h-[34px] px-3 rounded border border-line hover:border-ink-3 transition-colors text-[13px]">
      <div class="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center text-[11px] font-semibold">
        ${(auth.profile?.username || auth.user?.email || '?')[0].toUpperCase()}
      </div>
      <span class="hidden sm:block text-ink-2 max-w-[80px] truncate">${auth.profile?.username || 'User'}</span>
      ${admin ? `<span class="badge badge-accent text-[9px]">Admin</span>` : ''}
      <svg class="w-3 h-3 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div x-show="open" x-transition class="dropdown right-0 top-10">
      <div class="px-4 py-2 border-b border-line">
        <div class="text-[12px] font-semibold">${auth.profile?.username || 'User'}</div>
        <div class="text-[11px] text-ink-3">${auth.user?.email}</div>
      </div>
      <a href="/profile"   data-link class="dropdown-item" @click="open=false">👤 Profile</a>
      <a href="/bookmarks" data-link class="dropdown-item" @click="open=false">🔖 Bookmarks</a>
      <a href="/write"     data-link class="dropdown-item" @click="open=false">✏️ Write Story</a>
      ${admin ? `<div class="dropdown-sep"></div>
        <a href="/admin" data-link class="dropdown-item text-accent font-medium" @click="open=false">⚡ Admin Panel</a>` : ''}
      <div class="dropdown-sep"></div>
      <div class="dropdown-item text-red-500" id="btn-signout">Sign out</div>
    </div>
  </div>`
}

function _updateNavUser(auth) {
  const area = document.getElementById('nav-user-area')
  if (!area) return
  if (auth.loading) { area.innerHTML = `<div class="w-20 h-[34px] skel rounded"></div>`; return }
  area.innerHTML = auth.user ? _userMenu(auth) : _guestButtons()

  // Re-bind events
  document.getElementById('btn-signin')?.addEventListener('click', () => openAuthModal('login'))
  document.getElementById('btn-join')?.addEventListener('click', () => openAuthModal('register'))
  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    await signOut(); toastSuccess('Signed out')
  })

  // Start Alpine for dropdown
  if (window.Alpine) window.Alpine.initTree(area)
}

function _bindNav() {
  document.getElementById('nav-write-btn')?.addEventListener('click', () => {
    const auth = getAuth()
    if (auth.user) navigate('/write', true)
    else openAuthModal('register')
  })

  let _searchTimeout
  document.getElementById('nav-search-input')?.addEventListener('input', e => {
    clearTimeout(_searchTimeout)
    const q = e.target.value.trim()
    if (q.length < 2) return
    _searchTimeout = setTimeout(() => {
      navigate(`/browse?q=${encodeURIComponent(q)}`, true)
    }, 400)
  })
}

function _footer() {
  return `
  <footer class="bg-paper-2 border-t border-line mt-16">
    <div class="container mx-auto px-6 py-12">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div class="col-span-2 md:col-span-1">
          <div class="flex items-center gap-2 mb-3">${_logoSvg(24)}<span class="font-serif font-bold text-[17px]">Novelora</span></div>
          <p class="text-[13px] text-ink-3 leading-relaxed max-w-[200px] mb-4">Your home for web novels from around the world.</p>
          <div class="flex gap-1.5 flex-wrap">
            ${['EN', 'ID', '日本語', '한국어', '中文'].map(l => `<button class="px-2.5 py-1 text-[11px] font-medium border border-line rounded hover:border-ink-3 text-ink-3 hover:text-ink transition-colors">${l}</button>`).join('')}
          </div>
        </div>
        ${_footerCol('Discover', [['/', 'Browse'], ['/browse', 'Genres'], ['/rankings', 'Rankings'], ['/browse?filter=new', 'New Releases']])}
        ${_footerCol('For Writers', [['/write', 'Start Writing'], ['/guide', 'Writer Guide'], ['/rules', 'Content Rules']])}
        ${_footerCol('Company', [['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/dmca', 'DMCA']])}
      </div>
      <div class="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-line gap-2">
        <span class="text-[12px] text-ink-4">© 2025 Novelora. All rights reserved.</span>
        <span class="text-[12px] text-ink-4">Made for readers &amp; writers worldwide</span>
      </div>
    </div>
  </footer>`
}

function _footerCol(title, links) {
  return `
  <div>
    <div class="text-[11px] font-bold uppercase tracking-widest text-ink-3 mb-3">${title}</div>
    <ul class="space-y-2">
      ${links.map(([href, label]) => `<li><a href="${href}" data-link class="text-[13.5px] text-ink-2 hover:text-ink transition-colors">${label}</a></li>`).join('')}
    </ul>
  </div>`
}

export function _logoSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="5" fill="#191917"/>
    <rect x="8"  y="9"   width="7" height="11" rx="1" fill="#e8c89a"/>
    <rect x="17" y="9"   width="7" height="11" rx="1" fill="#c9a060"/>
    <rect x="15.5" y="8.5" width="1" height="12" rx=".5" fill="#f5e0b8"/>
    <path d="M6 23 Q16 18.5 26 23" stroke="#c9a060" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M4 25.5 Q16 20.5 28 25.5" stroke="#c9a060" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".4"/>
  </svg>`
}
