/**
 * Browse page — filter by genre, origin, status, search
 */
import { api } from '../lib/api.js'
import { renderBannerAd } from '../components/ads.js'

const COVERS = ['cover-1','cover-2','cover-3','cover-4','cover-5','cover-6','cover-7','cover-8','cover-9','cover-10']
const STRIPE = `repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,.04) 8px,rgba(255,255,255,.04) 9px)`

let _novels = []
let _page   = 1
let _filters = { origin:'', genre:'', status:'', sort:'popular', q:'' }

export async function render() {
  const c = document.getElementById('page-content')

  // Parse URL params
  const params = new URLSearchParams(location.search)
  _filters.q      = params.get('q')      || ''
  _filters.genre  = params.get('genre')  || ''
  _filters.origin = params.get('origin') || ''
  _filters.filter = params.get('filter') || ''
  if (_filters.filter === 'latest') _filters.sort = 'new'
  if (_filters.filter === 'completed') _filters.status = 'completed'

  c.innerHTML = _html()
  const bannerSlot = document.getElementById('ad-banner-browse')
  if (bannerSlot) renderBannerAd(bannerSlot)

  await _load()
  _bindEvents()
}

function _html() {
  return `
  <div class="container mx-auto px-6 py-10">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-[28px] font-bold font-serif tracking-tight mb-1">Browse Novels</h1>
      <p class="text-[14px] text-ink-3">Discover stories from around the world</p>
    </div>

    <!-- Banner Ad -->
    <div id="ad-banner-browse" class="mb-6"></div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6 p-4 bg-paper-2 border border-line rounded-xl">
      <div class="flex items-center gap-2 flex-1 min-w-[200px]">
        <svg class="w-4 h-4 text-ink-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="15.65" y2="15.65"/></svg>
        <input class="bg-transparent outline-none text-[13px] w-full placeholder:text-ink-4" type="text"
          id="f-search" placeholder="Search by title or author…" value="${_filters.q}" />
      </div>
      <select class="select w-36" id="f-origin">
        <option value="">All Origins</option>
        <option value="id" ${_filters.origin==='id'?'selected':''}>🇮🇩 Indonesia</option>
        <option value="jp" ${_filters.origin==='jp'?'selected':''}>🇯🇵 Japan</option>
        <option value="us" ${_filters.origin==='us'?'selected':''}>🇺🇸 USA</option>
        <option value="kr" ${_filters.origin==='kr'?'selected':''}>🇰🇷 Korea</option>
        <option value="cn" ${_filters.origin==='cn'?'selected':''}>🇨🇳 China</option>
      </select>
      <select class="select w-36" id="f-status">
        <option value="">All Status</option>
        <option value="ongoing"   ${_filters.status==='ongoing'  ?'selected':''}>Ongoing</option>
        <option value="completed" ${_filters.status==='completed'?'selected':''}>Completed</option>
        <option value="hiatus"    ${_filters.status==='hiatus'   ?'selected':''}>Hiatus</option>
      </select>
      <select class="select w-36" id="f-sort">
        <option value="popular" ${_filters.sort==='popular'?'selected':''}>Most Popular</option>
        <option value="new"     ${_filters.sort==='new'    ?'selected':''}>Newest</option>
        <option value="rating"  ${_filters.sort==='rating' ?'selected':''}>Top Rated</option>
      </select>
    </div>

    <!-- Genre pills -->
    <div class="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
      <button class="shrink-0 px-4 py-1.5 rounded-full text-[12.5px] font-medium border transition-all
        ${!_filters.genre ? 'bg-ink text-paper border-ink' : 'border-line text-ink-2 hover:border-ink-3'}"
        data-genre="">All Genres</button>
      ${GENRES.map(g => `
        <button class="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12.5px] font-medium border transition-all
          ${_filters.genre===g.slug ? 'bg-ink text-paper border-ink' : 'border-line text-ink-2 hover:border-ink-3'}"
          data-genre="${g.slug}">${g.icon} ${g.name}</button>`).join('')}
    </div>

    <!-- Results count -->
    <div class="flex items-center justify-between mb-4">
      <p class="text-[13px] text-ink-3" id="result-count">Loading…</p>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 gap-y-6 mb-8" id="browse-grid">
      ${Array(12).fill(0).map(() => `
        <div>
          <div class="skel aspect-[2/3] rounded mb-2"></div>
          <div class="skel h-3 w-3/4 rounded mb-1"></div>
          <div class="skel h-3 w-1/2 rounded"></div>
        </div>`).join('')}
    </div>

    <!-- Load more -->
    <div class="flex justify-center" id="load-more-wrap">
      <button class="btn btn-outline btn-lg hidden" id="btn-load-more">Load more novels</button>
    </div>
  </div>`
}

async function _load(append = false) {
  if (!append) _page = 1
  try {
    const params = { limit: 24, page: _page, sort: _filters.sort }
    if (_filters.origin) params.origin = _filters.origin
    if (_filters.status) params.status = _filters.status

    let data
    if (_filters.q) {
      const r = await api.novels.search(_filters.q)
      data = r.data || []
    } else {
      const r = await api.novels.list(params)
      data = r.data || []
    }

    if (append) _novels = [..._novels, ...data]
    else _novels = data.length ? data : MOCK_NOVELS

  } catch(_) {
    _novels = MOCK_NOVELS
  }

  _renderGrid(append)
  document.getElementById('result-count').textContent = `${_novels.length} novels found`
  const loadMoreBtn = document.getElementById('btn-load-more')
  if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', _novels.length < 24)
}

function _renderGrid(append = false) {
  const grid = document.getElementById('browse-grid')
  if (!grid) return

  let filtered = _novels
  if (_filters.genre) {
    filtered = _novels.filter(n => (n.tags||[]).includes(_filters.genre))
  }

  const cards = filtered.map((n, i) => {
    const c = COVERS[i % COVERS.length]
    const statusDot = { ongoing:'bg-green-500', completed:'bg-blue-400', hiatus:'bg-yellow-400' }
    return `
    <a href="/novel/${n.id}" data-link class="group cursor-pointer">
      <div class="book-cover bg-${c} w-full mb-2">
        <div class="book-spine"></div>
        <div class="relative w-full h-full flex flex-col justify-end p-2 pl-3">
          <div class="absolute inset-0" style="background-image:${STRIPE}"></div>
          <span class="book-text">${n.title}</span>
        </div>
        <div class="absolute top-2 right-2 w-2 h-2 rounded-full ${statusDot[n.status]||'bg-green-500'}"></div>
      </div>
      <div class="px-0.5">
        <div class="text-[13px] font-semibold text-ink leading-snug line-clamp-2 mb-1">${n.title}</div>
        <div class="text-[11.5px] text-ink-3 mb-1">${n.author_name||n.author||''}</div>
        <div class="flex items-center gap-2 text-[11.5px]">
          <span class="flex items-center gap-0.5 text-ink-2"><span class="text-yellow-500">★</span>${n.avg_rating||'4.5'}</span>
          <span class="text-ink-4">${n.chapter_count||0} ch</span>
        </div>
      </div>
    </a>`
  }).join('')

  if (append) grid.insertAdjacentHTML('beforeend', cards)
  else grid.innerHTML = cards || `<div class="col-span-full py-20 text-center text-ink-3">No novels found.</div>`
}

function _bindEvents() {
  let _t
  document.getElementById('f-search')?.addEventListener('input', e => {
    clearTimeout(_t)
    _t = setTimeout(() => { _filters.q = e.target.value.trim(); _load() }, 400)
  })

  document.getElementById('f-origin')?.addEventListener('change', e => { _filters.origin = e.target.value; _load() })
  document.getElementById('f-status')?.addEventListener('change', e => { _filters.status = e.target.value; _load() })
  document.getElementById('f-sort')?.addEventListener('change',   e => { _filters.sort   = e.target.value; _load() })

  document.querySelectorAll('[data-genre]').forEach(btn =>
    btn.addEventListener('click', () => {
      _filters.genre = btn.dataset.genre
      document.querySelectorAll('[data-genre]').forEach(b => {
        b.className = b.className.replace('bg-ink text-paper border-ink', 'border-line text-ink-2')
      })
      btn.classList.remove('border-line','text-ink-2')
      btn.classList.add('bg-ink','text-paper','border-ink')
      _load()
    })
  )

  document.getElementById('btn-load-more')?.addEventListener('click', () => { _page++; _load(true) })
}

const GENRES = [
  {name:'Fantasy',icon:'🌀',slug:'fantasy'},{name:'Romance',icon:'💕',slug:'romance'},
  {name:'Action',icon:'⚔️',slug:'action'},{name:'Isekai',icon:'🌌',slug:'isekai'},
  {name:'Sci-Fi',icon:'🚀',slug:'sci-fi'},{name:'Mystery',icon:'🔍',slug:'mystery'},
  {name:'Horror',icon:'👻',slug:'horror'},{name:'Drama',icon:'🎭',slug:'drama'},
  {name:'Xianxia',icon:'🏮',slug:'xianxia'},{name:'GameLit',icon:'🎮',slug:'gamelit'},
]

const MOCK_NOVELS = [
  {id:'1',title:'Sang Raja yang Dilupakan',    author_name:'Ariana Kusuma',  origin:'id',status:'ongoing',  avg_rating:4.8,chapter_count:142,tags:['fantasy','action']},
  {id:'2',title:'異世界転生の英雄譚',           author_name:'YamazakiRen',   origin:'jp',status:'ongoing',  avg_rating:4.9,chapter_count:387,tags:['isekai','fantasy']},
  {id:'3',title:'The Last Dungeon Crawler',    author_name:'MarcusWilde',   origin:'us',status:'ongoing',  avg_rating:4.7,chapter_count:204,tags:['fantasy','action']},
  {id:'4',title:'Dewa Pedang Tak Terkalahkan', author_name:'Bagas Saputra', origin:'id',status:'completed',avg_rating:4.6,chapter_count:510,tags:['action','xianxia']},
  {id:'5',title:'마법사의 두 번째 삶',          author_name:'LeeJiHoon',     origin:'kr',status:'ongoing',  avg_rating:4.8,chapter_count:89, tags:['fantasy','romance']},
  {id:'6',title:'Stars Beyond the Veil',       author_name:'ElenaCarr',     origin:'us',status:'hiatus',   avg_rating:4.5,chapter_count:67, tags:['sci-fi','romance']},
  {id:'7',title:'Cinta di Antara Dua Dunia',   author_name:'Nadia Rahma',   origin:'id',status:'ongoing',  avg_rating:4.7,chapter_count:223,tags:['romance','drama']},
  {id:'8',title:'仙道修真录',                  author_name:'CloudMtn',      origin:'cn',status:'ongoing',  avg_rating:4.6,chapter_count:1240,tags:['xianxia','action']},
  {id:'9',title:'Whispers in the Dark Forest', author_name:'TobiasNight',   origin:'us',status:'ongoing',  avg_rating:4.4,chapter_count:155,tags:['horror','mystery']},
  {id:'10',title:'Musim Gugur Sang Penyihir',  author_name:'Dewi Anggraini',origin:'id',status:'completed',avg_rating:4.9,chapter_count:320,tags:['fantasy','drama']},
  {id:'11',title:'The Demon King\'s Daughter', author_name:'SakuraMoon',    origin:'jp',status:'ongoing',  avg_rating:4.7,chapter_count:178,tags:['fantasy','romance']},
  {id:'12',title:'Rantai Abadi',               author_name:'Rizky Halim',   origin:'id',status:'ongoing',  avg_rating:4.5,chapter_count:95, tags:['action','fantasy']},
]
