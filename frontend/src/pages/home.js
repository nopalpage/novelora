/**
 * Homepage — realtime view counts, ranking updates, latest chapters
 */
import { sb, subscribe } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { isLoggedIn, getAuth } from '../lib/auth.js'
import { renderBannerAd, renderSidebarAd } from '../components/ads.js'
import { rankScore } from '../lib/wasm.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const COVERS = ['cover-1', 'cover-2', 'cover-3', 'cover-4', 'cover-5', 'cover-6', 'cover-7', 'cover-8', 'cover-9', 'cover-10']
const STRIPE = `repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,.04) 8px,rgba(255,255,255,.04) 9px)`

let _unsubs = []
let _novels = MOCK_NOVELS
let _chapters = MOCK_CHAPTERS
let _ranks = MOCK_RANKS

export async function render() {
  const c = document.getElementById('page-content')
  c.innerHTML = _skeleton()

  // Load data
  const [novelsRes, chaptersRes] = await Promise.allSettled([
    api.novels.list({ limit: 12, sort: 'popular' }),
    api.chapters ? fetch('/api/chapters/latest').then(r => r.json()).catch(() => null) : null,
  ])

  if (novelsRes.status === 'fulfilled' && novelsRes.value?.data) {
    _novels = novelsRes.value.data
  }

  // Render full page
  c.innerHTML = _html()

  // Render ads
  const bannerSlot = document.getElementById('ad-banner-home')
  if (bannerSlot) renderBannerAd(bannerSlot)
  const sidebarSlot = document.getElementById('ad-sidebar-home')
  if (sidebarSlot) renderSidebarAd(sidebarSlot)

  _renderGrid(_novels, 'all')
  _renderChapters(_chapters)
  _renderRanks(_ranks)
  _bindEvents()

  // Realtime subscriptions
  _unsubs.push(subscribe('chapters', (payload) => {
    if (payload.eventType === 'INSERT') {
      _chapters.unshift({
        novelTitle: payload.new.novel_title || 'Novel',
        num: payload.new.chapter_num,
        title: payload.new.title,
        color: 'cover-1',
        ago: 'just now',
        id: payload.new.id,
      })
      _renderChapters(_chapters.slice(0, 8))
      _showRealtimePing('new-chapter-badge')
    }
  }))

  _unsubs.push(subscribe('novels', (payload) => {
    if (payload.eventType === 'UPDATE') {
      const idx = _novels.findIndex(n => n.id === payload.new.id)
      if (idx !== -1) {
        _novels[idx] = { ..._novels[idx], ...payload.new }
        _updateNovelCard(payload.new.id, payload.new)
      }
    }
  }))
}

function _html() {
  return `
  <!-- HERO -->
  <div class="border-b border-line">
    <div class="container mx-auto px-6 py-16">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <!-- Left -->
        <div class="animate-fade-up">
          <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.4px] text-accent mb-5">
            <span class="w-4 h-[1.5px] bg-accent"></span>Read the world
          </div>
          <h1 class="font-serif text-[clamp(38px,5vw,58px)] font-bold leading-[1.08] tracking-tight mb-5">
            Stories from<br><em class="text-accent">Every Corner</em><br>of the Globe
          </h1>
          <p class="text-[15px] text-ink-2 leading-[1.65] max-w-md mb-7">
            Web novels and light novels from Indonesia, Japan, Korea, China, the US — all in one place, free to read.
          </p>
          <div class="flex gap-3 flex-wrap">
            <a href="/browse" data-link class="btn btn-primary btn-xl">Start reading</a>
            <button class="btn btn-outline btn-xl" id="hero-write-btn">Write a story</button>
          </div>
          <!-- Stats -->
          <div class="flex gap-7 mt-10 pt-8 border-t border-line">
            ${[['12,400', 'Novels'], ['84K+', 'Chapters'], ['320K', 'Readers'], ['6', 'Languages']].map(([v, l]) => `
              <div>
                <div class="font-serif text-[24px] font-bold tracking-tight">${v}</div>
                <div class="text-[11.5px] text-ink-3 font-medium mt-0.5">${l}</div>
              </div>`).join('')}
          </div>
        </div>
        <!-- Right: Featured -->
        ${_featuredCard()}
      </div>
    </div>
  </div>

  <!-- BANNER AD -->
  <div class="container mx-auto px-6 py-4">
    <div id="ad-banner-home"></div>
  </div>

  <hr class="border-line" />

  <!-- POPULAR NOW -->
  <div class="section">
    <div class="container mx-auto px-6">
      <div class="section-head">
        <div class="flex items-center gap-3">
          <h2 class="section-title serif">Popular Now</h2>
          <span class="flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
            <span class="realtime-dot" id="new-chapter-badge"></span>Live
          </span>
        </div>
        <a href="/browse" data-link class="text-[12.5px] text-ink-3 hover:text-accent transition-colors font-medium">View all →</a>
      </div>

      <!-- Origin filter -->
      <div class="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1" id="origin-filter">
        ${['all', 'id', 'jp', 'us', 'kr', 'cn'].map((o, i) => {
    const labels = ['All', '🇮🇩 Indonesia', '🇯🇵 Japan', '🇺🇸 USA', '🇰🇷 Korea', '🇨🇳 China']
    return `<button class="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-all
            ${i === 0 ? 'bg-ink text-paper border-ink' : 'bg-transparent border-line text-ink-2 hover:border-ink-3'}"
            data-origin="${o}">${labels[i]}</button>`
  }).join('')}
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 gap-y-6" id="novel-grid"></div>
    </div>
  </div>

  <hr class="border-line" />

  <!-- LATEST + RANKING + SIDEBAR AD -->
  <div class="section">
    <div class="container mx-auto px-6">
      <div class="flex gap-12">
        <!-- Latest -->
        <div class="flex-1 min-w-0">
          <div class="section-head">
            <h2 class="section-title serif">Latest Updates</h2>
            <a href="/browse?filter=latest" data-link class="text-[12.5px] text-ink-3 hover:text-accent transition-colors">All updates →</a>
          </div>
          <div id="ch-list" class="divide-y divide-line"></div>
        </div>
        <!-- Ranking + Sidebar Ad -->
        <div class="hidden lg:flex flex-col gap-6 w-[300px] shrink-0">
          <div>
            <div class="section-head">
              <h2 class="section-title serif text-[20px]">Weekly Ranking</h2>
              <a href="/rankings" data-link class="text-[12.5px] text-ink-3 hover:text-accent transition-colors">Full →</a>
            </div>
            <div id="rank-list" class="divide-y divide-line"></div>
          </div>
          <!-- Sidebar Ad -->
          <div id="ad-sidebar-home" class="flex justify-center"></div>
        </div>
      </div>
    </div>
  </div>

  <hr class="border-line" />

  <!-- GENRES -->
  <div class="section">
    <div class="container mx-auto px-6">
      <h2 class="section-title serif mb-6">Browse by Genre</h2>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
        ${GENRES.map(g => `
          <div class="flex flex-col items-center gap-1.5 p-4 border border-line rounded-xl bg-paper hover:bg-paper-2 hover:border-ink-3 transition-all cursor-pointer"
               data-genre="${g.slug}">
            <span class="text-[22px]">${g.icon}</span>
            <span class="text-[12px] font-semibold text-ink-2">${g.name}</span>
            <span class="text-[10.5px] text-ink-4">${g.count}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="bg-ink py-14">
    <div class="container mx-auto px-6">
      <div class="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div>
          <h2 class="font-serif text-[30px] font-bold text-paper tracking-tight mb-2">Share your story<br>with the world</h2>
          <p class="text-[14.5px] text-paper/50 max-w-md leading-relaxed">Novelora is free for all writers. Reach readers in Indonesia, Japan, the US, and beyond.</p>
        </div>
        <div class="flex gap-3 shrink-0">
          <button class="btn btn-xl bg-paper text-ink hover:bg-accent hover:text-white transition-colors" id="cta-join-btn">Create account</button>
          <a href="/guide" data-link class="btn btn-xl bg-transparent text-paper/50 border border-paper/20 hover:text-paper hover:border-paper/40 transition-colors">Learn more</a>
        </div>
      </div>
    </div>
  </div>`
}

function _featuredCard() {
  const n = MOCK_NOVELS[1]
  return `
  <div class="card overflow-hidden animate-fade-up" style="animation-delay:.08s">
    <div class="h-[178px] bg-cover-1 relative flex items-end p-4">
      <div class="absolute inset-0" style="background-image:${STRIPE}"></div>
      <div class="absolute inset-0 flex items-center justify-center font-serif italic text-[26px] text-white/10 font-bold px-4 text-center leading-snug">
        The Forgotten Hero's Return
      </div>
      <span class="relative z-10 badge bg-accent text-white text-[10px]">Editor's Pick</span>
    </div>
    <div class="p-5">
      <div class="flex gap-1.5 flex-wrap mb-2.5">
        <span class="badge tag-i">Isekai</span>
        <span class="badge tag-f">Fantasy</span>
        <span class="badge tag-a">Action</span>
      </div>
      <h3 class="font-serif text-[17px] font-bold leading-snug mb-1">The Forgotten Hero's Return to Another World</h3>
      <p class="text-[12px] text-ink-3 mb-2.5">YamazakiRen · 🇯🇵 Japan · Translated</p>
      <p class="text-[13px] text-ink-2 leading-relaxed mb-3 line-clamp-3">A legendary hero who saved the world 100 years ago awakens in the modern era, only to be summoned once again to a realm that has forgotten his name.</p>
      <div class="flex gap-3 text-[12px] text-ink-3 mb-4">
        <span>⭐ 4.9</span><span>📚 387 ch</span><span>👁 2.4M</span>
      </div>
      <a href="/novel/2" data-link class="btn btn-primary w-full h-[36px] text-[13px]">Read Chapter 1</a>
    </div>
  </div>`
}

/* ── Grid renderer ── */
let _allNovels = []

function _renderGrid(list, origin = 'all') {
  _allNovels = list
  const grid = document.getElementById('novel-grid')
  if (!grid) return
  const filtered = origin === 'all' ? list : list.filter(n => n.origin === origin)
  grid.innerHTML = filtered.map((n, i) => _novelCard(n, i)).join('')
}

function _novelCard(n, i) {
  const c = COVERS[i % COVERS.length]
  const statusDot = { ongoing: 'bg-green-500', completed: 'bg-blue-400', hiatus: 'bg-yellow-400' }
  return `
  <a href="/novel/${n.id}" data-link class="group cursor-pointer" data-novel-card="${n.id}">
    <div class="book-cover bg-${c} w-full mb-2">
      <div class="book-spine"></div>
      <div class="relative w-full h-full flex flex-col justify-end p-2 pl-3">
        <div class="absolute inset-0" style="background-image:${STRIPE}"></div>
        <span class="book-text">${n.title}</span>
      </div>
      <div class="absolute top-2 right-2 w-2 h-2 rounded-full ${statusDot[n.status || 'ongoing'] || 'bg-green-500'}"></div>
    </div>
    <div class="px-0.5">
      <div class="text-[13px] font-semibold text-ink leading-snug line-clamp-2 mb-1">${n.title}</div>
      <div class="text-[11.5px] text-ink-3 mb-1">${n.flag || ''} ${n.author_name || n.author || ''}</div>
      <div class="flex items-center gap-2 text-[11.5px]">
        <span class="text-ink-2 flex items-center gap-0.5"><span class="text-yellow-500">★</span> ${n.avg_rating || n.rating || '4.5'}</span>
        <span class="text-ink-4">${n.chapter_count || n.chapters || 0} ch</span>
      </div>
    </div>
  </a>`
}

function _updateNovelCard(id, data) {
  const card = document.querySelector(`[data-novel-card="${id}"]`)
  if (!card) return
  const ratingEl = card.querySelector('.rating-val')
  if (ratingEl && data.avg_rating) ratingEl.textContent = data.avg_rating
}

/* ── Chapters renderer ── */
function _renderChapters(list) {
  const el = document.getElementById('ch-list')
  if (!el) return
  el.innerHTML = list.map(c => `
    <div class="flex items-center gap-3 py-3 cursor-pointer hover:opacity-75 transition-opacity">
      <div class="w-[34px] h-[48px] rounded-[3px] bg-${c.color || 'cover-1'} relative overflow-hidden shrink-0">
        <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-black/20"></div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-[11px] text-ink-3 font-medium uppercase tracking-wide truncate mb-0.5">${c.novelTitle}</div>
        <div class="text-[13.5px] font-medium text-ink truncate">${c.title}</div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[12px] font-semibold text-accent font-serif">Ch. ${c.num}</div>
        <div class="text-[11px] text-ink-4 mt-0.5">${c.ago}</div>
      </div>
    </div>`).join('')
}

/* ── Rankings renderer ── */
function _renderRanks(list) {
  const el = document.getElementById('rank-list')
  if (!el) return
  const numCls = ['text-yellow-500', 'text-slate-400', 'text-orange-400', 'text-ink-4', 'text-ink-4', 'text-ink-4', 'text-ink-4']
  el.innerHTML = list.map((r, i) => `
    <a href="/novel/${r.id}" data-link class="flex items-center gap-2.5 py-2.5 hover:opacity-75 transition-opacity cursor-pointer">
      <span class="font-serif text-[18px] font-bold w-5 text-center shrink-0 ${numCls[i] || 'text-ink-4'}">${i + 1}</span>
      <div class="w-[30px] h-[42px] rounded-sm bg-${r.color || 'cover-1'} relative overflow-hidden shrink-0">
        <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-black/20"></div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-[13.5px] font-medium truncate">${r.title}</div>
        <div class="text-[11px] text-ink-3 mt-0.5">${r.author}</div>
      </div>
      <div class="text-[11.5px] text-ink-3 font-medium shrink-0">${r.views}</div>
    </a>`).join('')
}

/* ── Events ── */
function _bindEvents() {
  document.getElementById('origin-filter')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-origin]')
    if (!btn) return
    document.querySelectorAll('#origin-filter [data-origin]').forEach(b => {
      b.className = b.className
        .replace('bg-ink text-paper border-ink', '')
        .replace('bg-transparent border-line text-ink-2', '') + ''
      b.classList.add('bg-transparent', 'border-line', 'text-ink-2')
    })
    btn.classList.remove('bg-transparent', 'border-line', 'text-ink-2')
    btn.classList.add('bg-ink', 'text-paper', 'border-ink')
    _renderGrid(_allNovels, btn.dataset.origin)
  })

  document.getElementById('hero-write-btn')?.addEventListener('click', () => {
    isLoggedIn() ? location.href = '/write' : import('../components/auth-modal.js').then(m => m.openAuthModal('register'))
  })
  document.getElementById('cta-join-btn')?.addEventListener('click', () => {
    isLoggedIn() ? location.href = '/write' : import('../components/auth-modal.js').then(m => m.openAuthModal('register'))
  })

  document.querySelectorAll('[data-genre]').forEach(el =>
    el.addEventListener('click', () => location.href = `/browse?genre=${el.dataset.genre}`)
  )

  // Cleanup realtime on nav away
  window._pageCleanup = () => _unsubs.forEach(u => u())
}

function _showRealtimePing(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.style.transform = 'scale(2)'
  setTimeout(() => el.style.transform = '', 400)
}

function _skeleton() {
  return `<div class="container mx-auto px-6 py-16 space-y-4">
    <div class="skel h-10 w-64 rounded"></div>
    <div class="skel h-16 w-96 rounded"></div>
    <div class="skel h-4 w-80 rounded"></div>
    <div class="grid grid-cols-6 gap-4 mt-8">
      ${Array(6).fill('<div class="skel aspect-[2/3] rounded"></div>').join('')}
    </div>
  </div>`
}

/* ── Mock Data ── */
const MOCK_NOVELS = [
  { id: '1', title: 'Sang Raja yang Dilupakan', author_name: 'Ariana Kusuma', origin: 'id', flag: '🇮🇩', status: 'ongoing', avg_rating: 4.8, chapter_count: 142, color: 'c6' },
  { id: '2', title: '異世界転生の英雄譚', author_name: 'YamazakiRen', origin: 'jp', flag: '🇯🇵', status: 'ongoing', avg_rating: 4.9, chapter_count: 387, color: 'c1' },
  { id: '3', title: 'The Last Dungeon Crawler', author_name: 'MarcusWilde', origin: 'us', flag: '🇺🇸', status: 'ongoing', avg_rating: 4.7, chapter_count: 204, color: 'c2' },
  { id: '4', title: 'Dewa Pedang Tak Terkalahkan', author_name: 'Bagas Saputra', origin: 'id', flag: '🇮🇩', status: 'completed', avg_rating: 4.6, chapter_count: 510, color: 'c3' },
  { id: '5', title: '마법사의 두 번째 삶', author_name: 'LeeJiHoon', origin: 'kr', flag: '🇰🇷', status: 'ongoing', avg_rating: 4.8, chapter_count: 89, color: 'c5' },
  { id: '6', title: 'Stars Beyond the Veil', author_name: 'ElenaCarr', origin: 'us', flag: '🇺🇸', status: 'hiatus', avg_rating: 4.5, chapter_count: 67, color: 'c8' },
  { id: '7', title: 'Cinta di Antara Dua Dunia', author_name: 'Nadia Rahma', origin: 'id', flag: '🇮🇩', status: 'ongoing', avg_rating: 4.7, chapter_count: 223, color: 'c5' },
  { id: '8', title: '仙道修真录', author_name: 'CloudMtn', origin: 'cn', flag: '🇨🇳', status: 'ongoing', avg_rating: 4.6, chapter_count: 1240, color: 'c3' },
  { id: '9', title: 'Whispers in the Dark Forest', author_name: 'TobiasNight', origin: 'us', flag: '🇺🇸', status: 'ongoing', avg_rating: 4.4, chapter_count: 155, color: 'c4' },
  { id: '10', title: 'Musim Gugur Sang Penyihir', author_name: 'Dewi Anggraini', origin: 'id', flag: '🇮🇩', status: 'completed', avg_rating: 4.9, chapter_count: 320, color: 'c9' },
  { id: '11', title: 'The Demon King\'s Daughter', author_name: 'SakuraMoon', origin: 'jp', flag: '🇯🇵', status: 'ongoing', avg_rating: 4.7, chapter_count: 178, color: 'c1' },
  { id: '12', title: 'Rantai Abadi', author_name: 'Rizky Halim', origin: 'id', flag: '🇮🇩', status: 'ongoing', avg_rating: 4.5, chapter_count: 95, color: 'c7' },
]
const MOCK_CHAPTERS = [
  { novelTitle: 'Sang Raja yang Dilupakan', num: 142, title: 'Kebangkitan Raja Bayangan', color: 'cover-6', ago: '12m ago' },
  { novelTitle: '異世界転生の英雄譚', num: 387, title: '英雄の真の力', color: 'cover-1', ago: '28m ago' },
  { novelTitle: 'The Last Dungeon Crawler', num: 204, title: 'The Final Floor Revealed', color: 'cover-2', ago: '1h ago' },
  { novelTitle: 'Cinta di Antara Dua Dunia', num: 223, title: 'Pertemuan Terakhir', color: 'cover-5', ago: '2h ago' },
  { novelTitle: '마법사의 두 번째 삶', num: 89, title: '마지막 선택', color: 'cover-5', ago: '3h ago' },
  { novelTitle: '仙道修真录', num: 1240, title: '天道归一', color: 'cover-3', ago: '4h ago' },
  { novelTitle: 'Musim Gugur Sang Penyihir', num: 320, title: 'Akhir dari Segalanya', color: 'cover-9', ago: '5h ago' },
]
const MOCK_RANKS = [
  { id: '8', title: '仙道修真录', author: 'CloudMtn', color: 'cover-3', views: '5.1M' },
  { id: '10', title: 'Musim Gugur Sang Penyihir', author: 'Dewi Anggraini', color: 'cover-9', views: '2.7M' },
  { id: '4', title: 'Dewa Pedang Tak Terkalahkan', author: 'Bagas Saputra', color: 'cover-3', views: '3.2M' },
  { id: '2', title: '異世界転生の英雄譚', author: 'YamazakiRen', color: 'cover-1', views: '2.4M' },
  { id: '7', title: 'Cinta di Antara Dua Dunia', author: 'Nadia Rahma', color: 'cover-5', views: '1.8M' },
  { id: '3', title: 'The Last Dungeon Crawler', author: 'MarcusWilde', color: 'cover-2', views: '1.1M' },
  { id: '1', title: 'Sang Raja yang Dilupakan', author: 'Ariana Kusuma', color: 'cover-6', views: '890K' },
]

const GENRES = [
  { name: 'Action', icon: '⚔️', slug: 'action', count: '2,840' }, { name: 'Romance', icon: '💕', slug: 'romance', count: '3,120' },
  { name: 'Fantasy', icon: '🌀', slug: 'fantasy', count: '4,560' }, { name: 'Isekai', icon: '🌌', slug: 'isekai', count: '1,890' },
  { name: 'Sci-Fi', icon: '🚀', slug: 'sci-fi', count: '980' }, { name: 'Mystery', icon: '🔍', slug: 'mystery', count: '760' },
  { name: 'Horror', icon: '👻', slug: 'horror', count: '540' }, { name: 'Drama', icon: '🎭', slug: 'drama', count: '1,230' },
  { name: 'School', icon: '🎓', slug: 'school-life', count: '690' }, { name: 'Xianxia', icon: '🏮', slug: 'xianxia', count: '440' },
  { name: 'Historical', icon: '🏰', slug: 'historical', count: '380' }, { name: 'GameLit', icon: '🎮', slug: 'gamelit', count: '620' },
]
