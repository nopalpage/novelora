/**
 * Rankings page — weekly & monthly
 */
import { api } from '../lib/api.js'
import { renderBannerAd } from '../components/ads.js'

const COVERS = ['cover-1','cover-2','cover-3','cover-4','cover-5','cover-6','cover-7','cover-8','cover-9','cover-10']

export async function render() {
  const c = document.getElementById('page-content')
  c.innerHTML = _skeleton()

  let weekly = [], monthly = []
  try {
    const [w, m] = await Promise.allSettled([
      api.rankings.weekly(),
      api.rankings.monthly ? api.rankings.monthly() : Promise.reject(),
    ])
    weekly  = w.value?.data  || MOCK_RANKS
    monthly = m.value?.data  || MOCK_RANKS
  } catch(_) { weekly = monthly = MOCK_RANKS }

  c.innerHTML = _html()
  renderBannerAd(document.getElementById('ad-banner-rankings'))
  _renderList('weekly-list',  weekly)
  _renderList('monthly-list', monthly)
  _bindTabs()
}

function _html() {
  return `
  <div class="container mx-auto px-6 py-10 max-w-4xl">
    <div class="mb-8">
      <h1 class="text-[28px] font-bold font-serif tracking-tight mb-1">Rankings</h1>
<<<<<<< HEAD
      <p class="text-[14px] text-ink-3">Most-read novels on Novelora</p>
=======
      <p class="text-[14px] text-ink-3">Most-read novels on NovelNest</p>
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48
    </div>

    <div id="ad-banner-rankings" class="mb-6"></div>

    <!-- Tabs -->
    <div class="tabs mb-6">
      <div class="tab active" data-tab="weekly">🔥 Weekly</div>
      <div class="tab"        data-tab="monthly">📅 Monthly</div>
    </div>

    <div id="weekly-list"  class="space-y-0 divide-y divide-line card overflow-hidden"></div>
    <div id="monthly-list" class="space-y-0 divide-y divide-line card overflow-hidden hidden"></div>
  </div>`
}

function _renderList(elId, list) {
  const el = document.getElementById(elId)
  if (!el) return
  const medals = ['🥇','🥈','🥉']
  el.innerHTML = list.slice(0,20).map((n, i) => {
    const c = COVERS[i % COVERS.length]
    return `
    <a href="/novel/${n.id}" data-link class="flex items-center gap-4 px-5 py-4 hover:bg-paper-2 transition-colors">
      <div class="w-8 text-center shrink-0">
        ${i < 3
          ? `<span class="text-[22px]">${medals[i]}</span>`
          : `<span class="font-serif text-[18px] font-bold text-ink-4">${i+1}</span>`}
      </div>
      <div class="w-[38px] h-[54px] rounded-sm bg-${c} relative overflow-hidden shrink-0">
        <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-black/20"></div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-[14px] font-semibold text-ink truncate">${n.title}</div>
        <div class="text-[12px] text-ink-3 mt-0.5 flex items-center gap-3">
          <span>${n.author_name||n.author||''}</span>
          <span class="text-yellow-500">★</span>
          <span>${n.avg_rating||'4.5'}</span>
        </div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[14px] font-semibold text-ink">${_fmtNum(n.total_views||0)}</div>
        <div class="text-[11px] text-ink-3 mt-0.5">views</div>
      </div>
      ${i < 3 ? `<div class="w-1 self-stretch rounded-full ${['bg-yellow-400','bg-slate-300','bg-orange-400'][i]} ml-1"></div>` : '<div class="w-1 ml-1"></div>'}
    </a>`
  }).join('')
}

function _bindTabs() {
  document.querySelectorAll('.tab[data-tab]').forEach(tab =>
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const isWeekly = tab.dataset.tab === 'weekly'
      document.getElementById('weekly-list').classList.toggle('hidden',  !isWeekly)
      document.getElementById('monthly-list').classList.toggle('hidden',  isWeekly)
    })
  )
}

function _skeleton() {
  return `<div class="container mx-auto px-6 py-10 max-w-4xl space-y-3">
    <div class="skel h-8 w-40 rounded mb-6"></div>
    ${Array(10).fill(0).map(() => `
      <div class="flex items-center gap-4 p-4 border border-line rounded-lg">
        <div class="skel w-8 h-8 rounded"></div>
        <div class="skel w-10 h-14 rounded shrink-0"></div>
        <div class="flex-1 space-y-2"><div class="skel h-4 w-2/3 rounded"></div><div class="skel h-3 w-1/3 rounded"></div></div>
        <div class="skel h-5 w-16 rounded"></div>
      </div>`).join('')}
  </div>`
}

function _fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
  return String(n)
}

const MOCK_RANKS = [
  {id:'8', title:'仙道修真录',                  author_name:'CloudMtn',       avg_rating:4.6,total_views:5100000},
  {id:'4', title:'Dewa Pedang Tak Terkalahkan', author_name:'Bagas Saputra',  avg_rating:4.6,total_views:3200000},
  {id:'2', title:'異世界転生の英雄譚',           author_name:'YamazakiRen',    avg_rating:4.9,total_views:2400000},
  {id:'10',title:'Musim Gugur Sang Penyihir',   author_name:'Dewi Anggraini', avg_rating:4.9,total_views:2700000},
  {id:'7', title:'Cinta di Antara Dua Dunia',   author_name:'Nadia Rahma',    avg_rating:4.7,total_views:1800000},
  {id:'3', title:'The Last Dungeon Crawler',     author_name:'MarcusWilde',    avg_rating:4.7,total_views:1100000},
  {id:'1', title:'Sang Raja yang Dilupakan',     author_name:'Ariana Kusuma',  avg_rating:4.8,total_views:890000},
  {id:'5', title:'마법사의 두 번째 삶',           author_name:'LeeJiHoon',      avg_rating:4.8,total_views:670000},
  {id:'11',title:'The Demon King\'s Daughter',  author_name:'SakuraMoon',     avg_rating:4.7,total_views:540000},
  {id:'12',title:'Rantai Abadi',                author_name:'Rizky Halim',    avg_rating:4.5,total_views:320000},
]
