/**
 * Admin Dashboard — stats, charts, realtime events
 * Requires role === 'admin'
 */
import { isAdmin } from '../../lib/auth.js'
import { api }     from '../../lib/api.js'
import { subscribe } from '../../lib/supabase.js'
import { navigate }  from '../../lib/router.js'
import { toastError } from '../../lib/toast.js'

let _chart = null

export async function render() {
  const c = document.getElementById('page-content')

  if (!isAdmin()) {
    c.innerHTML = `<div class="flex flex-col items-center justify-center h-64 gap-3">
      <span class="text-4xl">🔒</span>
      <p class="text-ink-2">Admin access required.</p>
      <a href="/" data-link class="btn btn-primary">Go Home</a></div>`
    return
  }

  c.innerHTML = _layout(_mainHtml())
  _bindSidebar()

  // Load stats
  const stats = await _loadStats()
  _renderStats(stats)

  // Load chart
  const { Chart, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend } = await import('chart.js')
  Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend)
  await _renderChart(Chart)

  // Recent activity
  await _renderActivity()

  // Realtime — show new events as they happen
  subscribe('page_views',  (p) => _appendActivity('view',    p.new))
  subscribe('chapters',    (p) => _appendActivity('chapter', p.new))
  subscribe('profiles',    (p) => _appendActivity('user',    p.new))
}

export function _layout(mainContent, activePage = 'dashboard') {
  return `
  <div class="flex h-[calc(100vh-105px)] overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-56 shrink-0 bg-paper-2 border-r border-line flex flex-col py-4 overflow-y-auto">
      <div class="px-4 mb-4">
        <div class="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg">
          <span class="text-accent text-lg">⚡</span>
          <span class="text-[13px] font-semibold text-accent">Admin Panel</span>
        </div>
      </div>
      <div class="sidebar-section">Content</div>
      ${_sideItem('/admin',              '📊', 'Dashboard',  activePage==='dashboard')}
      ${_sideItem('/admin/novels',       '📚', 'Novels',     activePage==='novels')}
      ${_sideItem('/admin/ads',          '📢', 'Ads',        activePage==='ads')}
      <div class="sidebar-section">People</div>
      ${_sideItem('/admin/users',        '👥', 'Users',      activePage==='users')}
      <div class="sidebar-section">Analytics</div>
      ${_sideItem('/admin/analytics',    '📈', 'Analytics',  activePage==='analytics')}
      <div class="mt-auto px-4 pt-4 border-t border-line">
        <a href="/" data-link class="sidebar-link">
          <span>🏠</span><span>View Site</span>
        </a>
      </div>
    </aside>
    <!-- Main -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-6">${mainContent}</div>
    </div>
  </div>`
}

function _sideItem(href, icon, label, active) {
  return `<a href="${href}" data-link class="sidebar-link mx-2 ${active ? 'active' : ''}">
    <span>${icon}</span><span>${label}</span>
  </a>`
}

function _mainHtml() {
  return `
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-[24px] font-bold font-serif">Dashboard</h1>
      <p class="text-[13px] text-ink-3 mt-0.5">Welcome back. Here's what's happening.</p>
    </div>
    <div class="flex items-center gap-2 text-[12px] text-green-600 font-medium">
      <span class="realtime-dot"></span>Live updates
    </div>
  </div>

  <!-- Stats grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="stats-grid">
    ${Array(4).fill(0).map(() => `<div class="stat-card"><div class="skel h-8 w-24 rounded mb-1"></div><div class="skel h-4 w-16 rounded"></div></div>`).join('')}
  </div>

  <!-- Chart + Activity -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
    <!-- Page views chart -->
    <div class="card card-md lg:col-span-2">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-[15px] font-semibold">Page Views — Last 7 days</h3>
        <div class="flex gap-1.5">
          ${['7d','30d','90d'].map((p,i) => `<button class="btn btn-sm ${i===0?'btn-primary':'btn-outline'}" data-period="${p}">${p}</button>`).join('')}
        </div>
      </div>
      <div class="relative h-48">
        <canvas id="views-chart"></canvas>
      </div>
    </div>
    <!-- Top novels -->
    <div class="card card-md">
      <h3 class="text-[15px] font-semibold mb-4">Top Novels Today</h3>
      <div id="top-novels" class="space-y-3">
        ${Array(5).fill(0).map(() => `<div class="flex items-center gap-2"><div class="skel w-8 h-10 rounded shrink-0"></div><div class="flex-1 space-y-1"><div class="skel h-3 w-3/4 rounded"></div><div class="skel h-3 w-1/2 rounded"></div></div></div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="card card-md">
    <div class="flex items-center gap-3 mb-4">
      <h3 class="text-[15px] font-semibold">Recent Activity</h3>
      <span class="badge badge-green text-[10px]">Live</span>
    </div>
    <div id="activity-list" class="space-y-2">
      ${Array(5).fill(0).map(() => `<div class="flex gap-3 items-start"><div class="skel w-8 h-8 rounded-full shrink-0"></div><div class="flex-1 space-y-1"><div class="skel h-3 w-3/4 rounded"></div><div class="skel h-3 w-1/3 rounded"></div></div></div>`).join('')}
    </div>
  </div>`
}

/* ── Data loaders ── */
async function _loadStats() {
  try {
    const r = await api.analytics.summary()
    return r.data || MOCK_STATS
  } catch(_) { return MOCK_STATS }
}

function _renderStats(stats) {
  const el = document.getElementById('stats-grid')
  if (!el) return
  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="flex items-center justify-between">
        <span class="text-2xl">${s.icon}</span>
        <span class="${s.delta >= 0 ? 'stat-delta-up' : 'stat-delta-down'}">
          ${s.delta >= 0 ? '↑' : '↓'} ${Math.abs(s.delta)}%
        </span>
      </div>
      <div class="stat-val">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('')
}

async function _renderChart(Chart) {
  const ctx = document.getElementById('views-chart')
  if (!ctx) return
  if (_chart) { _chart.destroy(); _chart = null }

  let chartData = MOCK_CHART_DATA
  try {
    const r = await api.analytics.pageviews(7)
    if (r.data) chartData = r.data
  } catch(_) {}

  _chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Page Views',
        data:  chartData.values,
        borderColor: '#b84c2a',
        backgroundColor: 'rgba(184,76,42,0.06)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#b84c2a',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { color: '#e4e0d4' }, ticks: { color: '#9a9a94', font: { size: 11 } } },
        y: { grid: { color: '#e4e0d4' }, ticks: { color: '#9a9a94', font: { size: 11 } } },
      },
    },
  })
}

async function _renderActivity() {
  const el = document.getElementById('activity-list')
  if (!el) return
  el.innerHTML = MOCK_ACTIVITY.map(_activityItem).join('')
}

function _appendActivity(type, data) {
  const el = document.getElementById('activity-list')
  if (!el) return
  const item = { type, time: 'just now',
    text: type === 'view' ? `Someone viewed ${data.path||'a page'}`
        : type === 'chapter' ? `New chapter: ${data.title||'Chapter'}`
        : `New user registered`,
    icon: type === 'view' ? '👁' : type === 'chapter' ? '📖' : '👤',
  }
  const div = document.createElement('div')
  div.innerHTML = _activityItem(item)
  div.firstElementChild.classList.add('bg-green-50')
  el.prepend(div.firstElementChild)
  if (el.children.length > 10) el.lastElementChild.remove()
}

function _activityItem(a) {
  return `
  <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-paper-2 transition-colors">
    <div class="w-8 h-8 rounded-full bg-paper-2 border border-line flex items-center justify-center text-[14px] shrink-0">${a.icon}</div>
    <div class="flex-1 min-w-0">
      <div class="text-[13px] text-ink truncate">${a.text}</div>
    </div>
    <span class="text-[11px] text-ink-4 shrink-0">${a.time}</span>
  </div>`
}

function _bindSidebar() {
  // Active link highlighting is handled by data-link attr in router
}

/* ── Mock data ── */
const MOCK_STATS = [
  { icon:'👁', label:'Total Page Views', value:'284,392', delta: 12 },
  { icon:'📚', label:'Active Novels',    value:'12,405',  delta: 3  },
  { icon:'👥', label:'Registered Users', value:'47,821',  delta: 8  },
  { icon:'✍️', label:'New Chapters',     value:'1,204',   delta: -2 },
]
const MOCK_CHART_DATA = {
  labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  values: [12400, 14200, 11800, 15600, 17200, 21400, 18900],
}
const MOCK_ACTIVITY = [
  { icon:'📖', text:'New chapter: Ch. 142 — Sang Raja yang Dilupakan', time:'2m ago' },
  { icon:'👤', text:'New user registered: tanaka_reader', time:'5m ago' },
  { icon:'👁', text:'2,400 views on 異世界転生の英雄譚 today', time:'10m ago' },
  { icon:'💬', text:'New comment on The Last Dungeon Crawler Ch. 204', time:'15m ago' },
  { icon:'⭐', text:'Musim Gugur Sang Penyihir reached 5.0 avg rating', time:'1h ago' },
]
