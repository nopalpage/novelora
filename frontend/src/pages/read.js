/**
 * Chapter reader — clean reading experience
 * Saves progress via API, shows inline ads between chapters
 */
import { api }       from '../lib/api.js'
import { isLoggedIn } from '../lib/auth.js'
import { renderInlineAd } from '../components/ads.js'
import { navigate }  from '../lib/router.js'
import { readingTime } from '../lib/wasm.js'

let _chapter = null
let _novel   = null
let _saveTimer = null

export async function render(id) {
  const c = document.getElementById('page-content')
  c.innerHTML = _skeleton()

  try {
    const r = await api.chapters.get(id)
    _chapter = r.data || MOCK_CHAPTER
  } catch(_) { _chapter = MOCK_CHAPTER }

  if (_chapter?.novel_id) {
    try { const r = await api.novels.get(_chapter.novel_id); _novel = r.data } catch(_) {}
  }

  c.innerHTML = _html()

  const adSlot = document.getElementById('inline-ad-reader')
  if (adSlot) renderInlineAd(adSlot)

  _bindEvents()
  _trackProgress()
}

function _html() {
  if (!_chapter) return '<div class="p-12 text-center text-ink-3">Chapter not found.</div>'

  const mins = readingTime(_chapter.word_count || 0)
  const prevId = _chapter.prev_id
  const nextId = _chapter.next_id

  return `
  <!-- Reader toolbar -->
  <div class="sticky top-[60px] z-50 bg-paper/95 backdrop-blur-md border-b border-line">
    <div class="container mx-auto px-6 h-11 flex items-center gap-3 text-[12.5px]">
      <a href="/novel/${_chapter.novel_id}" data-link class="text-ink-3 hover:text-ink transition-colors flex items-center gap-1">
        ← <span class="hidden sm:inline">${_novel?.title || 'Novel'}</span>
      </a>
      <span class="text-ink-4">/</span>
      <span class="text-ink-2 truncate max-w-xs">Ch. ${_chapter.chapter_num}: ${_chapter.title}</span>
      <div class="ml-auto flex items-center gap-4 text-ink-3">
        <span>${mins} min read</span>
        <span>${_fmtNum(_chapter.word_count||0)} words</span>
        <!-- Font size -->
        <div class="flex items-center gap-1.5">
          <button class="btn btn-sm btn-ghost px-2 text-[16px]" id="font-down">A-</button>
          <button class="btn btn-sm btn-ghost px-2 text-[16px]" id="font-up">A+</button>
        </div>
      </div>
    </div>
    <!-- Progress bar -->
    <div class="h-0.5 bg-paper-3">
      <div class="h-full bg-accent transition-all duration-200" id="progress-bar" style="width:0%"></div>
    </div>
  </div>

  <!-- Content -->
  <div class="container mx-auto px-6">
    <div class="max-w-[680px] mx-auto py-12" id="reader-wrap">
      <div class="mb-10">
        <div class="text-[12px] font-semibold text-accent uppercase tracking-widest mb-2">Chapter ${_chapter.chapter_num}</div>
        <h1 class="text-[28px] font-bold font-serif leading-tight tracking-tight mb-3">${_chapter.title}</h1>
        <div class="flex items-center gap-4 text-[12.5px] text-ink-3 pb-6 border-b border-line">
          <span>${_novel?.title||''}</span>
          <span>${_timeAgo(_chapter.created_at)}</span>
        </div>
      </div>

      <!-- Chapter content -->
      <div class="reader-body" id="reader-content">
        ${_formatContent(_chapter.content || MOCK_CONTENT)}
      </div>

      <!-- Inline ad after content -->
      <div id="inline-ad-reader" class="my-10"></div>

      <!-- Navigation -->
      <div class="flex items-center justify-between pt-8 border-t border-line">
        ${prevId
          ? `<a href="/read/${prevId}" data-link class="btn btn-outline btn-lg gap-2">← Previous</a>`
          : `<div></div>`}
        <a href="/novel/${_chapter.novel_id}" data-link class="btn btn-ghost btn-lg">📚 Index</a>
        ${nextId
          ? `<a href="/read/${nextId}" data-link class="btn btn-primary btn-lg gap-2">Next →</a>`
          : `<div class="text-center"><p class="text-[14px] text-ink-3 mb-2">You've reached the latest chapter!</p>
             <a href="/novel/${_chapter.novel_id}" data-link class="btn btn-outline btn-sm">Back to novel</a></div>`}
      </div>

      <!-- Comments hint -->
      <div class="mt-10 p-5 bg-paper-2 rounded-xl border border-line text-center">
        <p class="text-[14px] text-ink-2 mb-2">Enjoyed this chapter? Leave a comment!</p>
        ${isLoggedIn()
          ? `<div class="flex gap-3 max-w-lg mx-auto">
               <input class="input flex-1" placeholder="Write a comment…" id="comment-input" />
               <button class="btn btn-primary" id="btn-comment">Post</button>
             </div>`
          : `<button class="btn btn-primary btn-sm" id="btn-login-comment">Sign in to comment</button>`}
      </div>
    </div>
  </div>`
}

function _formatContent(text) {
  return text.split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join('')
}

function _bindEvents() {
  // Font size
  let fontSize = 17
  document.getElementById('font-up')?.addEventListener('click', () => {
    fontSize = Math.min(22, fontSize + 1)
    document.getElementById('reader-content').style.fontSize = fontSize + 'px'
  })
  document.getElementById('font-down')?.addEventListener('click', () => {
    fontSize = Math.max(14, fontSize - 1)
    document.getElementById('reader-content').style.fontSize = fontSize + 'px'
  })

  // Comments
  document.getElementById('btn-login-comment')?.addEventListener('click', () =>
    import('../components/auth-modal.js').then(m => m.openAuthModal('login'))
  )

  // Scroll progress
  window.addEventListener('scroll', _onScroll)
  window._pageCleanup = () => window.removeEventListener('scroll', _onScroll)
}

function _onScroll() {
  const wrap = document.getElementById('reader-wrap')
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  const total = rect.height - window.innerHeight
  const pct   = Math.min(100, Math.max(0, Math.round(-rect.top / total * 100)))
  const bar = document.getElementById('progress-bar')
  if (bar) bar.style.width = pct + '%'

  // Save progress every 5 seconds of scroll
  if (isLoggedIn() && _chapter) {
    clearTimeout(_saveTimer)
    _saveTimer = setTimeout(() => {
      api.user.progress(_chapter.id, pct).catch(() => {})
    }, 5000)
  }
}

function _trackProgress() {
  window.addEventListener('scroll', _onScroll)
}

function _skeleton() {
  return `<div class="container mx-auto px-6 py-12 max-w-[680px]">
    <div class="skel h-4 w-24 rounded mb-6"></div>
    <div class="skel h-8 w-3/4 rounded mb-3"></div>
    <div class="space-y-3">
      ${Array(8).fill(0).map(() => `<div class="skel h-4 w-full rounded"></div>`).join('')}
      <div class="skel h-4 w-2/3 rounded"></div>
    </div>
  </div>`
}

function _fmtNum(n) {
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n)
}

function _timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400)return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

const MOCK_CHAPTER = {
  id: '1', novel_id: '2', chapter_num: 1,
  title: 'The Beginning',
  word_count: 3420,
  created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  next_id: '2', prev_id: null,
  content: null,
}

const MOCK_CONTENT = `The world had changed in ways I never imagined possible.

Standing at the edge of the summoning circle, the ancient runes glowing with a familiar crimson light, I felt a wave of deja vu so powerful it nearly brought me to my knees. A hundred years. It had been a hundred years since I last stood in a place like this, surrounded by the anxious faces of people who needed a hero.

But these faces were unfamiliar. Their clothes, their language, even the magic they used — all of it had evolved beyond recognition. Whatever kingdom I had saved all those years ago, it no longer existed. The people who had cheered my name were long dead and forgotten.

And yet, here I was again.

"Hero," spoke the young priest who led the summoning, his voice trembling with equal parts reverence and fear. "We have called upon the greatest warrior from another world to aid us in our hour of darkness. The Demon King has returned, and our lands burn with his wrath."

I looked at my hands. Young again. Strong again. The centuries-long sleep had restored my body to its prime, as if the passage of time had been merely a dream.

"Tell me," I said slowly, the words coming to me in their language with practiced ease. "What year is this? And how long has the Demon King threatened your realm?"

The priest exchanged uneasy glances with his companions. "It is the year 3427 of the Third Age, great Hero. The Demon King rose three years ago, and in that time has conquered half the continent."

Three years. They had waited three years before calling for help. Either their pride had gotten in the way, or they had truly exhausted every other option.

I straightened my shoulders and met the priest's gaze. Whatever had happened in the century since my last great battle, whatever had changed in this world and in my own — none of it mattered now.

There was work to be done.`
