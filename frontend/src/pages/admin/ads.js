import { isAdmin } from '../../lib/auth.js'
import { api }     from '../../lib/api.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { _layout } from './dashboard.js'
import { navigate } from '../../lib/router.js'

let _ads = []

export async function render() {
  const c = document.getElementById('page-content')
  if (!isAdmin()) { navigate('/'); return }
  c.innerHTML = _layout(_html(), 'ads')
  await _load()
  _bindEvents()
}

function _html() {
  return `
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-[22px] font-bold font-serif">Ad Management</h1>
      <p class="text-[13px] text-ink-3 mt-0.5">Manage ad placements and track performance</p>
    </div>
    <button class="btn btn-primary btn-lg gap-2" id="btn-new-ad">+ New Ad</button>
  </div>

  <!-- Performance summary -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="ad-stats">
    ${[['Total Ads','0','📢'],['Active','0','✅'],['Total Impressions','0','👁'],['Total Clicks','0','🖱']].map(([l,v,i]) =>
      `<div class="stat-card"><div class="flex items-center gap-2"><span class="text-xl">${i}</span></div><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`
    ).join('')}
  </div>

  <!-- Ad slots preview -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
    <div class="card card-md">
      <div class="text-[12px] font-bold uppercase tracking-widest text-ink-3 mb-3">Banner (728×90)</div>
      <div class="ad-slot h-[90px] flex items-center justify-center text-ink-3 text-[13px]">
        <div class="ad-label">Preview</div>
        <span>Banner Ad Preview</span>
      </div>
    </div>
    <div class="card card-md">
      <div class="text-[12px] font-bold uppercase tracking-widest text-ink-3 mb-3">Sidebar (300×250)</div>
      <div class="ad-slot h-[140px] flex items-center justify-center text-ink-3 text-[13px]">
        <div class="ad-label">Preview</div>
        <span>Sidebar Ad Preview</span>
      </div>
    </div>
    <div class="card card-md">
      <div class="text-[12px] font-bold uppercase tracking-widest text-ink-3 mb-3">Inline (468×60)</div>
      <div class="ad-slot h-[60px] flex items-center justify-center text-ink-3 text-[13px]">
        <div class="ad-label">Preview</div>
        <span>Inline Ad Preview</span>
      </div>
    </div>
  </div>

  <!-- Ads table -->
  <div class="card overflow-hidden">
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Ad</th><th>Slot</th><th>Status</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Advertiser</th><th></th>
        </tr></thead>
        <tbody id="ads-tbody">
          ${Array(3).fill(0).map(() => `<tr>${Array(8).fill('<td><div class="skel h-4 rounded"></div></td>').join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div id="ad-modal-root"></div>`
}

async function _load() {
  try { const r = await api.ads.list(); _ads = r.data || MOCK_ADS }
  catch(_) { _ads = MOCK_ADS }
  _renderTable()
  _updateStats()
}

function _renderTable() {
  const el = document.getElementById('ads-tbody')
  if (!el) return
  el.innerHTML = _ads.map(a => {
    const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(2) : '0.00'
    return `<tr>
      <td>
        <div class="font-medium">${a.title}</div>
        <div class="text-[11px] text-ink-4 mt-0.5 truncate max-w-[200px]">${a.url||'—'}</div>
      </td>
      <td><span class="badge badge-blue">${a.slot}</span></td>
      <td><span class="badge ${a.active ? 'badge-green' : 'badge-gray'}">${a.active ? 'Active' : 'Paused'}</span></td>
      <td>${_fmtNum(a.impressions||0)}</td>
      <td>${_fmtNum(a.clicks||0)}</td>
      <td class="${parseFloat(ctr) > 2 ? 'text-green-600' : 'text-ink-3'} font-medium">${ctr}%</td>
      <td class="text-[12px] text-ink-3">${a.advertiser||'—'}</td>
      <td>
        <div class="flex gap-1.5">
          <button class="btn btn-sm btn-outline btn-toggle-ad" data-id="${a.id}" title="${a.active?'Pause':'Activate'}">${a.active?'⏸':'▶'}</button>
          <button class="btn btn-sm btn-outline btn-edit-ad" data-id="${a.id}" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger btn-del-ad" data-id="${a.id}" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`
  }).join('')

  document.querySelectorAll('.btn-edit-ad').forEach(b => b.addEventListener('click', () => _openModal(b.dataset.id)))
  document.querySelectorAll('.btn-del-ad').forEach(b => b.addEventListener('click', () => _delete(b.dataset.id)))
  document.querySelectorAll('.btn-toggle-ad').forEach(b => b.addEventListener('click', () => _toggle(b.dataset.id)))
}

function _updateStats() {
  const statsEl = document.getElementById('ad-stats')
  if (!statsEl) return
  const active = _ads.filter(a => a.active).length
  const totalImp = _ads.reduce((s,a) => s + (a.impressions||0), 0)
  const totalClk = _ads.reduce((s,a) => s + (a.clicks||0), 0)
  const vals = [_ads.length, active, _fmtNum(totalImp), _fmtNum(totalClk)]
  const labels = ['Total Ads','Active','Total Impressions','Total Clicks']
  const icons  = ['📢','✅','👁','🖱']
  statsEl.innerHTML = vals.map((v,i) => `
    <div class="stat-card">
      <div class="flex items-center gap-2"><span class="text-xl">${icons[i]}</span></div>
      <div class="stat-val">${v}</div>
      <div class="stat-label">${labels[i]}</div>
    </div>`).join('')
}

function _openModal(id = null) {
  const ad = id ? _ads.find(a => String(a.id) === String(id)) : null
  const root = document.getElementById('ad-modal-root')
  root.innerHTML = `
  <div class="modal-overlay open" id="ad-overlay">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">${ad ? 'Edit Ad' : 'New Ad'}</h2>
        <button class="btn btn-icon btn-ghost" id="am-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-field col-span-2">
            <label class="label">Ad Title *</label>
            <input class="input" id="am-title" value="${ad?.title||''}" placeholder="Ad headline" />
          </div>
          <div class="form-field">
            <label class="label">Slot</label>
            <select class="select" id="am-slot">
              ${['banner','sidebar','inline'].map(s => `<option value="${s}" ${ad?.slot===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="label">Advertiser</label>
            <input class="input" id="am-adv" value="${ad?.advertiser||''}" placeholder="Company name" />
          </div>
          <div class="form-field col-span-2">
            <label class="label">Destination URL *</label>
            <input class="input" id="am-url" value="${ad?.url||''}" placeholder="https://…" type="url" />
          </div>
          <div class="form-field col-span-2">
            <label class="label">Description</label>
            <textarea class="textarea" id="am-desc" rows="2">${ad?.description||''}</textarea>
          </div>
          <div class="form-field">
            <label class="label">Image URL</label>
            <input class="input" id="am-img" value="${ad?.image_url||''}" placeholder="https://…" />
          </div>
          <div class="form-field">
            <label class="label">CTA Text</label>
            <input class="input" id="am-cta" value="${ad?.cta||'Learn More'}" />
          </div>
          <div class="form-field col-span-2 flex items-center gap-3">
            <input type="checkbox" id="am-active" class="rounded border-line" ${ad?.active!==false?'checked':''} />
            <label class="label mb-0 cursor-pointer" for="am-active">Active (show on site)</label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="am-cancel">Cancel</button>
        <button class="btn btn-primary" id="am-save">${ad ? 'Save Changes' : 'Create Ad'}</button>
      </div>
    </div>
  </div>`

  const close = () => { root.innerHTML = '' }
  document.getElementById('am-close').addEventListener('click', close)
  document.getElementById('am-cancel').addEventListener('click', close)
  document.getElementById('ad-overlay').addEventListener('click', e => { if (e.target.id === 'ad-overlay') close() })

  document.getElementById('am-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const payload = {
      title:       document.getElementById('am-title').value.trim(),
      slot:        document.getElementById('am-slot').value,
      advertiser:  document.getElementById('am-adv').value.trim(),
      url:         document.getElementById('am-url').value.trim(),
      description: document.getElementById('am-desc').value.trim(),
      image_url:   document.getElementById('am-img').value.trim(),
      cta:         document.getElementById('am-cta').value.trim(),
      active:      document.getElementById('am-active').checked,
    }
    if (!payload.title || !payload.url) { toastError('Title and URL required'); return }
    btn.disabled = true; btn.textContent = 'Saving…'
    try {
      if (ad) { await api.ads.update(ad.id, payload); toastSuccess('Ad updated') }
      else    { await api.ads.create(payload);        toastSuccess('Ad created!') }
      close(); await _load()
    } catch(err) { toastError(err.message) }
    finally { btn.disabled = false }
  })
}

async function _delete(id) {
  if (!confirm('Delete this ad?')) return
  try { await api.ads.delete(id); toastSuccess('Deleted'); _ads = _ads.filter(a => String(a.id) !== id); _renderTable(); _updateStats() }
  catch(err) { toastError(err.message) }
}

async function _toggle(id) {
  const ad = _ads.find(a => String(a.id) === String(id))
  if (!ad) return
  try {
    await api.ads.update(id, { active: !ad.active })
    ad.active = !ad.active
    _renderTable(); _updateStats()
    toastSuccess(ad.active ? 'Ad activated' : 'Ad paused')
  } catch(err) { toastError(err.message) }
}

function _bindEvents() {
  document.getElementById('btn-new-ad')?.addEventListener('click', () => _openModal())
}

function _fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
  return String(n)
}

const MOCK_ADS = [
  { id:'1', title:'Bookwalker — Global Novel Store', slot:'banner',  active:true,  advertiser:'Bookwalker',  url:'https://bookwalker.jp', description:'Buy LN, manga & webtoons', cta:'Shop Now',   impressions:45200, clicks:904  },
  { id:'2', title:'NovelAI — Write with AI',         slot:'sidebar', active:true,  advertiser:'NovelAI',     url:'https://novelai.net',   description:'AI writing assistant',     cta:'Try Free',   impressions:28100, clicks:1124 },
  { id:'3', title:'Premium — Go Ad-Free',            slot:'inline',  active:true,  advertiser:'Novelora',   url:'/premium',              description:'Unlock premium features',  cta:'Upgrade',    impressions:87400, clicks:1748 },
  { id:'4', title:'Anime Corner — Vol. 18',          slot:'banner',  active:false, advertiser:'Anime Corner',url:'https://animecorner.me', description:'Latest anime news',        cta:'Read More',  impressions:12000, clicks:180  },
]
