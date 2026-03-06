import { isAdmin } from '../../lib/auth.js'
import { api }     from '../../lib/api.js'
import { _layout } from './dashboard.js'
import { navigate } from '../../lib/router.js'

export async function render() {
  const c = document.getElementById('page-content')
  if (!isAdmin()) { navigate('/'); return }
  c.innerHTML = _layout(_html(), 'analytics')

  const { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
          ArcElement, Filler, Tooltip, Legend } = await import('chart.js')
  Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement,
                 ArcElement, Filler, Tooltip, Legend)

  _renderOverviewChart(Chart)
  _renderOriginChart(Chart)
  _renderDeviceChart(Chart)
  _renderTopContent()
  _bindPeriod(Chart)
}

function _html() {
  return `
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-[22px] font-bold font-serif">Analytics</h1>
      <p class="text-[13px] text-ink-3 mt-0.5">Visitor insights and content performance</p>
    </div>
    <div class="flex gap-2" id="period-btns">
      ${['7d','30d','90d'].map((p,i) =>
        `<button class="btn btn-sm ${i===0?'btn-primary':'btn-outline'}" data-period="${p}">${p}</button>`
      ).join('')}
    </div>
  </div>

  <!-- KPIs -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    ${MOCK_KPI.map(k => `
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-xl">${k.icon}</span>
          <span class="${k.up ? 'stat-delta-up' : 'stat-delta-down'}">${k.up?'↑':'↓'} ${k.delta}%</span>
        </div>
        <div class="stat-val">${k.value}</div>
        <div class="stat-label">${k.label}</div>
      </div>`).join('')}
  </div>

  <!-- Charts row 1 -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
    <div class="card card-md lg:col-span-2">
      <h3 class="text-[15px] font-semibold mb-4">Visitors & Page Views</h3>
      <div class="relative h-52"><canvas id="chart-overview"></canvas></div>
    </div>
    <div class="card card-md">
      <h3 class="text-[15px] font-semibold mb-4">Traffic by Origin</h3>
      <div class="relative h-52"><canvas id="chart-origin"></canvas></div>
    </div>
  </div>

  <!-- Charts row 2 -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
    <div class="card card-md">
      <h3 class="text-[15px] font-semibold mb-4">Device Types</h3>
      <div class="relative h-44"><canvas id="chart-device"></canvas></div>
      <div id="device-legend" class="flex flex-col gap-2 mt-4"></div>
    </div>
    <div class="card card-md lg:col-span-2">
      <h3 class="text-[15px] font-semibold mb-4">Top Pages</h3>
      <div class="space-y-2" id="top-pages">
        ${MOCK_TOP_PAGES.map(p => `
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between text-[13px] mb-1">
                <span class="truncate">${p.path}</span>
                <span class="text-ink-3 font-medium ml-2 shrink-0">${_fmt(p.views)}</span>
              </div>
              <div class="h-1.5 bg-paper-3 rounded-full overflow-hidden">
                <div class="h-full bg-accent rounded-full" style="width:${p.pct}%"></div>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Top Novels -->
  <div class="card card-md">
    <h3 class="text-[15px] font-semibold mb-4">Top Novels by Views</h3>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>#</th><th>Novel</th><th>Origin</th><th>Views (7d)</th><th>Avg. Read Time</th><th>Bookmark Rate</th><th>Trend</th></tr></thead>
        <tbody>
          ${MOCK_TOP_NOVELS.map((n,i) => `<tr>
            <td class="font-serif font-bold text-[16px] text-ink-3">${i+1}</td>
            <td class="font-medium">${n.title}</td>
            <td>${n.flag}</td>
            <td class="font-semibold">${_fmt(n.views)}</td>
            <td>${n.readTime}</td>
            <td><span class="${n.bRate > 15 ? 'text-green-600' : 'text-ink-3'}">${n.bRate}%</span></td>
            <td><span class="${n.trend > 0 ? 'text-green-600' : 'text-red-500'} font-semibold">${n.trend > 0 ? '↑' : '↓'} ${Math.abs(n.trend)}%</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`
}

function _renderOverviewChart(Chart) {
  const ctx = document.getElementById('chart-overview')
  if (!ctx) return
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [
        { label:'Page Views', data:[12400,14200,11800,15600,17200,21400,18900], borderColor:'#b84c2a', backgroundColor:'rgba(184,76,42,.06)', fill:true, tension:.4, pointRadius:3 },
        { label:'Unique Visitors', data:[4200,5100,4800,6200,7100,8400,7600], borderColor:'#4a78c0', backgroundColor:'rgba(74,120,192,.06)', fill:true, tension:.4, pointRadius:3 },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, boxWidth:12 } }, tooltip:{ mode:'index', intersect:false } },
      scales: {
        x:{ grid:{color:'#e4e0d4'}, ticks:{color:'#9a9a94',font:{size:11}} },
        y:{ grid:{color:'#e4e0d4'}, ticks:{color:'#9a9a94',font:{size:11}} },
      },
    },
  })
}

function _renderOriginChart(Chart) {
  const ctx = document.getElementById('chart-origin')
  if (!ctx) return
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['🇮🇩 ID','🇯🇵 JP','🇺🇸 US','🇰🇷 KR','🇨🇳 CN','Other'],
      datasets:[{ data:[38,24,18,10,7,3], backgroundColor:['#b84c2a','#2d1b3d','#1b2d3d','#3d1b2d','#1b3d28','#c8c8c0'] }],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{ label: c => ` ${c.raw}%` }} },
      scales:{ x:{grid:{display:false},ticks:{font:{size:11}}}, y:{grid:{color:'#e4e0d4'},ticks:{callback:v=>v+'%',font:{size:11}}} },
    },
  })
}

function _renderDeviceChart(Chart) {
  const ctx = document.getElementById('chart-device')
  if (!ctx) return
  const data = [{ label:'Mobile', value:62, color:'#b84c2a' }, { label:'Desktop', value:31, color:'#2d1b3d' }, { label:'Tablet', value:7, color:'#c8c8c0' }]
  new Chart(ctx, {
    type: 'doughnut',
    data: { labels: data.map(d=>d.label), datasets:[{ data:data.map(d=>d.value), backgroundColor:data.map(d=>d.color), borderWidth:0, hoverOffset:4 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} } },
  })
  const legend = document.getElementById('device-legend')
  if (legend) legend.innerHTML = data.map(d => `
    <div class="flex items-center justify-between text-[12.5px]">
      <div class="flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full" style="background:${d.color}"></div>${d.label}</div>
      <span class="font-semibold">${d.value}%</span>
    </div>`).join('')
}

function _renderTopContent() {}

function _bindPeriod(Chart) {
  document.getElementById('period-btns')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-period]')
    if (!btn) return
    document.querySelectorAll('#period-btns [data-period]').forEach(b => {
      b.className = b.className.replace('btn-primary','btn-outline')
    })
    btn.className = btn.className.replace('btn-outline','btn-primary')
  })
}

function _fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
  return String(n)
}

const MOCK_KPI = [
  { icon:'👁', label:'Page Views (7d)',    value:'120,400', delta:12, up:true  },
  { icon:'👤', label:'Unique Visitors',    value:'47,800',  delta:8,  up:true  },
  { icon:'⏱',  label:'Avg. Session',       value:'8m 24s',  delta:5,  up:true  },
  { icon:'↩️', label:'Bounce Rate',        value:'34.2%',   delta:3,  up:false },
]
const MOCK_TOP_PAGES = [
  { path:'/', views:42100, pct:100 }, { path:'/novel/2', views:31400, pct:74 },
  { path:'/novel/8', views:28900, pct:68 }, { path:'/rankings', views:18200, pct:43 },
  { path:'/browse', views:14800, pct:35 },
]
const MOCK_TOP_NOVELS = [
  { title:'仙道修真录',                  flag:'🇨🇳', views:42000, readTime:'12m', bRate:28, trend:15 },
  { title:'異世界転生の英雄譚',           flag:'🇯🇵', views:38400, readTime:'18m', bRate:22, trend:8  },
  { title:'Musim Gugur Sang Penyihir',   flag:'🇮🇩', views:29100, readTime:'22m', bRate:31, trend:-3 },
  { title:'The Last Dungeon Crawler',    flag:'🇺🇸', views:22800, readTime:'15m', bRate:19, trend:12 },
  { title:'Sang Raja yang Dilupakan',    flag:'🇮🇩', views:18400, readTime:'20m', bRate:24, trend:5  },
]
