/**
 * Novel detail page — info, chapter list, like/bookmark
 */
import { api }        from '../lib/api.js'
import { isLoggedIn, getAuth } from '../lib/auth.js'
import { subscribe }  from '../lib/supabase.js'
import { toastSuccess, toastError, toastInfo } from '../lib/toast.js'
import { renderInlineAd } from '../components/ads.js'
import { navigate }   from '../lib/router.js'

const COVERS = ['cover-1','cover-2','cover-3','cover-4','cover-5','cover-6','cover-7','cover-8','cover-9','cover-10']
const STRIPE  = `repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,.04) 8px,rgba(255,255,255,.04) 9px)`

let _novel     = null
let _chapters  = []
let _bookmarked = false
let _liked      = false
let _unsubCh    = null

export async function render(id) {
  const c = document.getElementById('page-content')
  c.innerHTML = _skeleton()

  try {
    const [novelRes, chaptersRes] = await Promise.allSettled([
      api.novels.get(id),
      api.chapters.list(id),
    ])
    _novel    = novelRes.value?.data    || MOCK_NOVEL
    _chapters = chaptersRes.value?.data || MOCK_CHAPTERS
  } catch(_) {
    _novel = MOCK_NOVEL; _chapters = MOCK_CHAPTERS
  }

  c.innerHTML = _html()
  _renderChapters()

  // Inline ad after ch 5
  const adSlot = document.getElementById('inline-ad-novel')
  if (adSlot) renderInlineAd(adSlot)

  _bindEvents(id)

  // Realtime: new chapters
  _unsubCh = subscribe('chapters', p => {
    if (p.eventType === 'INSERT' && p.new.novel_id === id) {
      _chapters.unshift(p.new)
      _renderChapters()
      toastInfo(`New chapter: ${p.new.title}`)
    }
  })

  window._pageCleanup = () => _unsubCh?.()
}

function _html() {
  if (!_novel) return '<div class="p-12 text-center text-ink-3">Novel not found.</div>'
  const coverIdx = (parseInt(_novel.id) || 1) % COVERS.length
  const statusColor = { ongoing:'bg-green-100 text-green-700', completed:'bg-blue-100 text-blue-700', hiatus:'bg-yellow-100 text-yellow-700' }
  const originFlag  = { id:'🇮🇩', jp:'🇯🇵', us:'🇺🇸', kr:'🇰🇷', cn:'🇨🇳' }

  return `
  <div class="container mx-auto px-6 py-10 max-w-5xl">
    <!-- Top section -->
    <div class="flex flex-col md:flex-row gap-8 mb-10">
      <!-- Cover -->
      <div class="shrink-0">
        <div class="book-cover bg-${COVERS[coverIdx]} w-[160px] h-[240px]">
          <div class="book-spine"></div>
          <div class="relative w-full h-full flex flex-col justify-end p-3 pl-4">
            <div class="absolute inset-0" style="background-image:${STRIPE}"></div>
            <span class="book-text text-[12px]">${_novel.title}</span>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="badge ${statusColor[_novel.status]||'badge-gray'}">${_novel.status||'ongoing'}</span>
          <span class="badge badge-gray">${originFlag[_novel.origin]||'🌐'} ${(_novel.origin||'').toUpperCase()}</span>
          ${(_novel.tags||[]).slice(0,3).map(t => `<span class="badge badge-accent">${t}</span>`).join('')}
        </div>

        <h1 class="text-[26px] font-bold font-serif leading-tight tracking-tight mb-2">${_novel.title}</h1>
        <p class="text-[13.5px] text-ink-3 mb-4">
          by <span class="text-ink font-medium">${_novel.author_name||'Unknown'}</span>
        </p>

        <!-- Stats row -->
        <div class="flex flex-wrap gap-5 mb-5 text-[13px] text-ink-2">
          <span class="flex items-center gap-1.5"><span class="text-yellow-500 text-[15px]">★</span><strong>${_novel.avg_rating||'4.5'}</strong></span>
          <span class="flex items-center gap-1.5">📚 <strong>${_novel.chapter_count||_chapters.length}</strong> chapters</span>
          <span class="flex items-center gap-1.5">👁 <strong>${_fmtNum(_novel.total_views||0)}</strong> views</span>
          <span class="flex items-center gap-1.5">❤️ <strong id="like-count">${_fmtNum(_novel.total_likes||0)}</strong> likes</span>
        </div>

        <!-- Description -->
        <p class="text-[14px] text-ink-2 leading-relaxed mb-6 max-w-2xl">${_novel.description||'No description available.'}</p>

        <!-- Actions -->
        <div class="flex flex-wrap gap-3">
          <a href="/read/${_chapters[0]?.id||'1'}" data-link class="btn btn-primary btn-lg gap-2">
            📖 Start Reading
          </a>
          <button class="btn btn-outline btn-lg gap-2" id="btn-bookmark">
            <span id="bookmark-icon">${_bookmarked ? '🔖' : '➕'}</span>
            <span id="bookmark-text">${_bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
          <button class="btn btn-outline btn-lg gap-2" id="btn-like">
            <span id="like-icon">${_liked ? '❤️' : '🤍'}</span>
            <span>Like</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Inline ad -->
    <div id="inline-ad-novel" class="mb-6"></div>

    <!-- Chapters -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="text-[17px] font-bold font-serif">
          Chapters <span class="text-ink-3 font-sans font-normal text-[14px]">(${_chapters.length})</span>
        </h2>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-outline" id="ch-sort-asc">↑ Oldest</button>
          <button class="btn btn-sm btn-primary" id="ch-sort-desc">↓ Newest</button>
        </div>
      </div>
      <div id="chapter-list" class="divide-y divide-line max-h-[520px] overflow-y-auto"></div>
    </div>
  </div>`
}

function _renderChapters(desc = true) {
  const el = document.getElementById('chapter-list')
  if (!el) return
  const list = desc ? [..._chapters].reverse() : [..._chapters]
  el.innerHTML = list.map(ch => `
    <a href="/read/${ch.id}" data-link
       class="flex items-center justify-between px-5 py-3.5 hover:bg-paper-2 transition-colors cursor-pointer">
      <div class="flex items-center gap-3 min-w-0">
        <span class="text-[13px] font-semibold text-accent font-serif shrink-0 w-16">Ch. ${ch.chapter_num}</span>
        <span class="text-[13.5px] text-ink truncate">${ch.title}</span>
      </div>
      <div class="flex items-center gap-3 shrink-0 ml-4">
        ${ch.word_count ? `<span class="text-[11px] text-ink-4 hidden sm:block">${_fmtNum(ch.word_count)} words</span>` : ''}
        ${ch.is_premium ? `<span class="badge badge-yellow">Premium</span>` : ''}
        <span class="text-[11px] text-ink-4">${_timeAgo(ch.created_at)}</span>
      </div>
    </a>`).join('') || '<div class="py-12 text-center text-ink-3">No chapters yet.</div>'
}

function _bindEvents(id) {
  document.getElementById('btn-bookmark')?.addEventListener('click', async () => {
    if (!isLoggedIn()) { import('../components/auth-modal.js').then(m => m.openAuthModal('login')); return }
    try {
      if (_bookmarked) { await api.user.unbookmark(id); _bookmarked = false; toastSuccess('Bookmark removed') }
      else             { await api.user.bookmark(id);   _bookmarked = true;  toastSuccess('Bookmarked!') }
      document.getElementById('bookmark-icon').textContent = _bookmarked ? '🔖' : '➕'
      document.getElementById('bookmark-text').textContent = _bookmarked ? 'Bookmarked' : 'Bookmark'
    } catch(e) { toastError(e.message) }
  })

  document.getElementById('btn-like')?.addEventListener('click', async () => {
    if (!isLoggedIn()) { import('../components/auth-modal.js').then(m => m.openAuthModal('login')); return }
    try {
      if (_liked) { await api.user.unlike(id); _liked = false }
      else        { await api.user.like(id);   _liked = true  }
      document.getElementById('like-icon').textContent = _liked ? '❤️' : '🤍'
      const el = document.getElementById('like-count')
      if (el) el.textContent = _fmtNum((_novel.total_likes||0) + (_liked ? 1 : -1))
    } catch(e) { toastError(e.message) }
  })

  let _descOrder = true
  document.getElementById('ch-sort-desc')?.addEventListener('click', () => { _descOrder = true;  _renderChapters(true)  })
  document.getElementById('ch-sort-asc')?.addEventListener('click',  () => { _descOrder = false; _renderChapters(false) })
}

function _skeleton() {
  return `<div class="container mx-auto px-6 py-10 max-w-5xl">
    <div class="flex gap-8">
      <div class="skel w-[160px] h-[240px] rounded shrink-0"></div>
      <div class="flex-1 space-y-3">
        <div class="skel h-8 w-3/4 rounded"></div>
        <div class="skel h-4 w-1/4 rounded"></div>
        <div class="skel h-4 w-full rounded"></div>
        <div class="skel h-4 w-5/6 rounded"></div>
        <div class="flex gap-3 mt-4"><div class="skel h-10 w-32 rounded"></div><div class="skel h-10 w-32 rounded"></div></div>
      </div>
    </div>
  </div>`
}

function _fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
  return String(n)
}

function _timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (d < 60)   return `${d}s ago`
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400)return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

const MOCK_NOVEL = {
  id:'2', title:'異世界転生の英雄譚', author_name:'YamazakiRen',
  origin:'jp', status:'ongoing', avg_rating:4.9, total_views:2400000,
  total_likes:84200, chapter_count:387,
  description:'A legendary hero who saved the world 100 years ago awakens in the modern era, only to be summoned once again to a realm that has long forgotten his name. With powers beyond comprehension and a heart forged through centuries of battle, he must navigate a world that has changed beyond recognition.',
  tags:['isekai','fantasy','action'],
}
const MOCK_CHAPTERS = Array.from({length:10}, (_,i) => ({
  id: String(i+1), novel_id:'2', chapter_num: i+1,
  title: `Chapter ${i+1}: ${['The Beginning','A New World','First Battle','Allies','The Dark Forest','Ancient Ruins','The Dragon\'s Lair','Reunion','Betrayal','The Final Stand'][i]}`,
  word_count: 3000 + Math.floor(Math.random()*2000),
  created_at: new Date(Date.now() - (10-i)*86400000*3).toISOString(),
  is_premium: i >= 8,
}))
