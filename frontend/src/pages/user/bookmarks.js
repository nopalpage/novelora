import { api } from '../../lib/api.js'
import { isLoggedIn } from '../../lib/auth.js'

const COVERS = ['cover-1','cover-2','cover-3','cover-4','cover-5','cover-6','cover-7','cover-8','cover-9','cover-10']
const STRIPE = `repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,.04) 8px,rgba(255,255,255,.04) 9px)`

export async function render() {
  const c = document.getElementById('page-content')

  if (!isLoggedIn()) {
    c.innerHTML = `
    <div class="flex flex-col items-center justify-center h-64 gap-3">
      <span class="text-4xl">🔖</span>
      <p class="text-ink-2">Sign in to see your bookmarks.</p>
      <button class="btn btn-primary" id="btn-bm-login">Sign In</button>
    </div>`
    document.getElementById('btn-bm-login')?.addEventListener('click', () =>
      import('../../components/auth-modal.js').then(m => m.openAuthModal('login'))
    )
    return
  }

  c.innerHTML = `
  <div class="container mx-auto px-6 py-10 max-w-5xl">
    <h1 class="text-[26px] font-bold font-serif mb-2">My Bookmarks</h1>
    <p class="text-[13px] text-ink-3 mb-8">Novels you've saved to read later.</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 gap-y-6" id="bm-grid">
      ${Array(6).fill(0).map(() => `<div><div class="skel aspect-[2/3] rounded mb-2"></div><div class="skel h-3 w-3/4 rounded mb-1"></div><div class="skel h-3 w-1/2 rounded"></div></div>`).join('')}
    </div>
    <div id="bm-empty" class="hidden py-20 text-center">
      <div class="text-5xl mb-4">📚</div>
      <p class="text-ink-2 font-medium mb-1">No bookmarks yet</p>
      <p class="text-[13px] text-ink-3 mb-6">Start bookmarking novels you want to read!</p>
      <a href="/browse" data-link class="btn btn-primary">Browse Novels</a>
    </div>
  </div>`

  try {
    const r = await api.user.bookmarks()
    const list = r.data || []
    const grid = document.getElementById('bm-grid')
    const empty = document.getElementById('bm-empty')
    if (!list.length) {
      grid.classList.add('hidden')
      empty.classList.remove('hidden')
      return
    }
    grid.innerHTML = list.map((b, i) => {
      const n = b.novel_summary || b
      const c = COVERS[i % COVERS.length]
      return `
      <a href="/novel/${n.id}" data-link class="group cursor-pointer">
        <div class="book-cover bg-${c} w-full mb-2">
          <div class="book-spine"></div>
          <div class="relative w-full h-full flex flex-col justify-end p-2 pl-3">
            <div class="absolute inset-0" style="background-image:${STRIPE}"></div>
            <span class="book-text">${n.title}</span>
          </div>
        </div>
        <div class="px-0.5">
          <div class="text-[13px] font-semibold text-ink leading-snug line-clamp-2 mb-1">${n.title}</div>
          <div class="text-[11.5px] text-ink-3">${n.author_name||''}</div>
        </div>
      </a>`
    }).join('')
  } catch(_) {
    document.getElementById('bm-grid').innerHTML = `<div class="col-span-full text-center text-ink-3 py-10">Could not load bookmarks.</div>`
  }
}
