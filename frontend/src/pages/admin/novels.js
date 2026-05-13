/**
 * Admin — Novels CRUD
 */
import { isAdmin }    from '../../lib/auth.js'
import { api }        from '../../lib/api.js'
import { subscribe }  from '../../lib/supabase.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { _layout }    from './dashboard.js'
import { navigate }   from '../../lib/router.js'

let _novels = []
let _unsubNovel = null

export async function render() {
  const c = document.getElementById('page-content')
  if (!isAdmin()) { navigate('/'); return }

  c.innerHTML = _layout(_html(), 'novels')
  await _loadNovels()

  // Realtime
  _unsubNovel = subscribe('novels', (p) => {
    if (p.eventType === 'INSERT') { _novels.unshift(p.new); _renderTable() }
    if (p.eventType === 'UPDATE') {
      const i = _novels.findIndex(n => n.id === p.new.id)
      if (i !== -1) { _novels[i] = { ..._novels[i], ...p.new }; _renderTable() }
    }
    if (p.eventType === 'DELETE') {
      _novels = _novels.filter(n => n.id !== p.old.id); _renderTable()
    }
  })

  _bindEvents()
}

function _html() {
  return `
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-[22px] font-bold font-serif">Novels</h1>
      <p class="text-[13px] text-ink-3 mt-0.5">Manage all novels on the platform</p>
    </div>
    <button class="btn btn-primary btn-lg gap-2" id="btn-new-novel">
      <span>+</span> New Novel
    </button>
  </div>

  <!-- Filters -->
  <div class="flex gap-3 mb-4">
    <input class="input w-56" type="text" placeholder="Search novels…" id="novel-search" />
    <select class="select w-36" id="novel-filter-origin">
      <option value="">All Origins</option>
      <option value="id">🇮🇩 Indonesia</option>
      <option value="jp">🇯🇵 Japan</option>
      <option value="us">🇺🇸 USA</option>
      <option value="kr">🇰🇷 Korea</option>
      <option value="cn">🇨🇳 China</option>
    </select>
    <select class="select w-36" id="novel-filter-status">
      <option value="">All Status</option>
      <option value="ongoing">Ongoing</option>
      <option value="completed">Completed</option>
      <option value="hiatus">Hiatus</option>
      <option value="draft">Draft</option>
    </select>
  </div>

  <!-- Table -->
  <div class="card overflow-hidden">
    <div class="table-wrap">
      <table class="table" id="novels-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Origin</th>
            <th>Status</th>
            <th>Chapters</th>
            <th>Views</th>
            <th>Rating</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="novels-tbody">
          ${Array(6).fill(0).map(() => `<tr>${Array(8).fill('<td><div class="skel h-4 rounded"></div></td>').join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal -->
  <div id="novel-modal-root"></div>`
}

async function _loadNovels() {
  try {
    const r = await api.novels.list({ limit: 50 })
    _novels = r.data || MOCK_NOVELS
  } catch(_) { _novels = MOCK_NOVELS }
  _renderTable()
}

function _renderTable(list = _novels) {
  const el = document.getElementById('novels-tbody')
  if (!el) return

  const statusBadge = {
    ongoing:   'badge-green',
    completed: 'badge-blue',
    hiatus:    'badge-yellow',
    draft:     'badge-gray',
  }

  el.innerHTML = list.map(n => `
    <tr>
      <td class="font-medium max-w-[220px]">
        <div class="truncate">${n.title}</div>
        <div class="text-[11px] text-ink-4 mt-0.5">ID: ${n.id}</div>
      </td>
      <td>${n.author_name||n.author||'—'}</td>
      <td>${_originFlag(n.origin)}</td>
      <td><span class="badge ${statusBadge[n.status]||'badge-gray'}">${n.status||'—'}</span></td>
      <td>${n.chapter_count||n.chapters||0}</td>
      <td>${_fmtNum(n.total_views||0)}</td>
      <td>
        <div class="flex items-center gap-1">
          <span class="text-yellow-500">★</span>
          <span>${n.avg_rating||n.rating||'—'}</span>
        </div>
      </td>
      <td>
        <div class="flex items-center gap-1.5">
          <a href="/admin/chapters/${n.id}" data-link class="btn btn-sm btn-outline" title="Chapters">📑</a>
          <button class="btn btn-sm btn-outline btn-edit" data-id="${n.id}" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger btn-del" data-id="${n.id}" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`).join('')

  // Bind row actions
  document.querySelectorAll('.btn-edit').forEach(b =>
    b.addEventListener('click', () => _openNovelModal(b.dataset.id))
  )
  document.querySelectorAll('.btn-del').forEach(b =>
    b.addEventListener('click', () => _confirmDelete(b.dataset.id))
  )
}

async function _openNovelModal(id = null) {
  const novel = id ? _novels.find(n => String(n.id) === String(id)) : null
  const root  = document.getElementById('novel-modal-root')

  root.innerHTML = `
  <div class="modal-overlay open" id="novel-overlay">
    <div class="modal-box w-[580px]">
      <div class="modal-header">
        <h2 class="modal-title">${novel ? 'Edit Novel' : 'New Novel'}</h2>
        <button class="btn btn-icon btn-ghost" id="nm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-field col-span-2">
            <label class="label">Title *</label>
            <input class="input" id="nm-title" value="${novel?.title||''}" placeholder="Novel title" />
          </div>
          <div class="form-field">
            <label class="label">Origin</label>
            <select class="select" id="nm-origin">
              ${['id','jp','us','kr','cn','original'].map(o =>
                `<option value="${o}" ${novel?.origin===o?'selected':''}>${o.toUpperCase()}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="label">Language</label>
            <select class="select" id="nm-lang">
              ${['id','en','ja','ko','zh'].map(l =>
                `<option value="${l}" ${novel?.language===l?'selected':''}>${l.toUpperCase()}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="label">Status</label>
            <select class="select" id="nm-status">
              ${['ongoing','completed','hiatus','draft'].map(s =>
                `<option value="${s}" ${novel?.status===s?'selected':''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="label">Cover URL</label>
            <input class="input" id="nm-cover" value="${novel?.cover_url||''}" placeholder="https://…" />
          </div>
          <div class="form-field col-span-2">
            <label class="label">Tags (comma-separated)</label>
            <input class="input" id="nm-tags" value="${(novel?.tags||[]).join(', ')}" placeholder="fantasy, action, romance" />
          </div>
          <div class="form-field col-span-2">
            <label class="label">Description</label>
            <textarea class="textarea" id="nm-desc" rows="4" placeholder="Novel synopsis…">${novel?.description||''}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="nm-cancel">Cancel</button>
        <button class="btn btn-primary" id="nm-save">${novel ? 'Save Changes' : 'Create Novel'}</button>
      </div>
    </div>
  </div>`

  const close = () => { root.innerHTML = '' }
  document.getElementById('nm-close').addEventListener('click', close)
  document.getElementById('nm-cancel').addEventListener('click', close)
  document.getElementById('novel-overlay').addEventListener('click', e => { if (e.target.id === 'novel-overlay') close() })

  document.getElementById('nm-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const payload = {
      title:       document.getElementById('nm-title').value.trim(),
      origin:      document.getElementById('nm-origin').value,
      language:    document.getElementById('nm-lang').value,
      status:      document.getElementById('nm-status').value,
      cover_url:   document.getElementById('nm-cover').value.trim(),
      description: document.getElementById('nm-desc').value.trim(),
      tags:        document.getElementById('nm-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    }
    if (!payload.title) { toastError('Title is required'); return }
    btn.disabled = true; btn.textContent = 'Saving…'
    try {
      if (novel) {
        await api.novels.update(novel.id, payload)
        toastSuccess('Novel updated')
      } else {
        await api.novels.create(payload)
        toastSuccess('Novel created!')
      }
      close(); await _loadNovels()
    } catch(err) { toastError(err.message) }
    finally { btn.disabled = false }
  })
}

async function _confirmDelete(id) {
  const novel = _novels.find(n => String(n.id) === String(id))
  if (!confirm(`Delete "${novel?.title}"? This is permanent.`)) return
  try {
    await api.novels.delete(id)
    toastSuccess('Deleted')
    _novels = _novels.filter(n => String(n.id) !== String(id))
    _renderTable()
  } catch(err) { toastError(err.message) }
}

function _bindEvents() {
  document.getElementById('btn-new-novel')?.addEventListener('click', () => _openNovelModal())

  let _t
  document.getElementById('novel-search')?.addEventListener('input', e => {
    clearTimeout(_t)
    _t = setTimeout(() => {
      const q = e.target.value.toLowerCase()
      _renderTable(q ? _novels.filter(n => n.title.toLowerCase().includes(q)) : _novels)
    }, 300)
  })

  document.getElementById('novel-filter-origin')?.addEventListener('change', e => {
    const v = e.target.value
    _renderTable(v ? _novels.filter(n => n.origin === v) : _novels)
  })
  document.getElementById('novel-filter-status')?.addEventListener('change', e => {
    const v = e.target.value
    _renderTable(v ? _novels.filter(n => n.status === v) : _novels)
  })
}

function _originFlag(o) {
  const flags = { id:'🇮🇩', jp:'🇯🇵', us:'🇺🇸', kr:'🇰🇷', cn:'🇨🇳', original:'🌐' }
  return `<span class="text-[14px]">${flags[o]||'🌐'}</span>`
}

function _fmtNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
  return String(n)
}

const MOCK_NOVELS = [
  { id:'1', title:'Sang Raja yang Dilupakan',    author_name:'Ariana Kusuma',  origin:'id', status:'ongoing',   avg_rating:4.8, chapter_count:142, total_views:890000 },
  { id:'2', title:'異世界転生の英雄譚',           author_name:'YamazakiRen',   origin:'jp', status:'ongoing',   avg_rating:4.9, chapter_count:387, total_views:2400000 },
  { id:'3', title:'The Last Dungeon Crawler',    author_name:'MarcusWilde',   origin:'us', status:'ongoing',   avg_rating:4.7, chapter_count:204, total_views:1100000 },
  { id:'4', title:'Dewa Pedang Tak Terkalahkan', author_name:'Bagas Saputra', origin:'id', status:'completed', avg_rating:4.6, chapter_count:510, total_views:3200000 },
  { id:'5', title:'마법사의 두 번째 삶',          author_name:'LeeJiHoon',     origin:'kr', status:'ongoing',   avg_rating:4.8, chapter_count:89,  total_views:670000 },
  { id:'6', title:'仙道修真录',                  author_name:'CloudMtn',      origin:'cn', status:'ongoing',   avg_rating:4.6, chapter_count:1240,total_views:5100000 },
]
