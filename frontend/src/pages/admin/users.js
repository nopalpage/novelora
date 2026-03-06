import { isAdmin } from '../../lib/auth.js'
import { api }     from '../../lib/api.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { _layout } from './dashboard.js'
import { navigate } from '../../lib/router.js'

let _users = []

export async function render() {
  const c = document.getElementById('page-content')
  if (!isAdmin()) { navigate('/'); return }
  c.innerHTML = _layout(_html(), 'users')
  await _load()
  _bindEvents()
}

function _html() {
  return `
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-[22px] font-bold font-serif">Users</h1>
      <p class="text-[13px] text-ink-3 mt-0.5">Manage registered users and their roles</p>
    </div>
  </div>

  <!-- Search -->
  <div class="flex gap-3 mb-4">
    <input class="input w-64" type="text" placeholder="Search by username or email…" id="user-search" />
    <select class="select w-36" id="user-filter-role">
      <option value="">All Roles</option>
      <option value="admin">Admin</option>
      <option value="author">Author</option>
      <option value="reader">Reader</option>
    </select>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="user-stats">
    ${[['👥','Total','—'],['⚡','Admins','—'],['✍️','Authors','—'],['📖','Readers','—']].map(([i,l,v]) =>
      `<div class="stat-card"><span class="text-xl">${i}</span><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`
    ).join('')}
  </div>

  <!-- Table -->
  <div class="card overflow-hidden">
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>User</th><th>Role</th><th>Status</th><th>Joined</th><th></th>
        </tr></thead>
        <tbody id="users-tbody">
          ${Array(5).fill(0).map(() => `<tr>${Array(5).fill('<td><div class="skel h-4 rounded"></div></td>').join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div id="user-modal-root"></div>`
}

async function _load() {
  try {
    const r = await api.users.list()
    _users = r.data || MOCK_USERS
  } catch(_) { _users = MOCK_USERS }
  _renderTable()
  _updateStats()
}

function _renderTable(list = _users) {
  const el = document.getElementById('users-tbody')
  if (!el) return

  const roleBadge = { admin:'badge-accent', author:'badge-purple', reader:'badge-gray' }

  el.innerHTML = list.map(u => `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-paper text-[12px] font-bold shrink-0">
            ${(u.username||u.email||'?')[0].toUpperCase()}
          </div>
          <div>
            <div class="font-medium text-[13.5px]">${u.username||'—'}</div>
            <div class="text-[11px] text-ink-3">${u.email||''}</div>
          </div>
        </div>
      </td>
      <td>
        <select class="select h-[28px] text-[12px] w-28 py-0 role-select" data-id="${u.id}" data-current="${u.role||'reader'}">
          <option value="reader"  ${(u.role||'reader')==='reader' ?'selected':''}>reader</option>
          <option value="author"  ${u.role==='author' ?'selected':''}>author</option>
          <option value="admin"   ${u.role==='admin'  ?'selected':''}>admin</option>
        </select>
      </td>
      <td>
        <span class="badge ${u.is_banned ? 'badge-red' : 'badge-green'}">
          ${u.is_banned ? '🚫 Banned' : '✓ Active'}
        </span>
      </td>
      <td class="text-[12px] text-ink-3">${_fmtDate(u.created_at)}</td>
      <td>
        <div class="flex gap-1.5">
          <button class="btn btn-sm ${u.is_banned ? 'btn-outline' : 'btn-danger'} btn-ban"
            data-id="${u.id}" data-banned="${u.is_banned||false}" title="${u.is_banned ? 'Unban' : 'Ban'}">
            ${u.is_banned ? '✓ Unban' : '🚫 Ban'}
          </button>
        </div>
      </td>
    </tr>`).join('')

  // Role change
  document.querySelectorAll('.role-select').forEach(sel =>
    sel.addEventListener('change', async e => {
      const id   = sel.dataset.id
      const role = e.target.value
      try {
        await api.users.update(id, { role })
        const u = _users.find(u => u.id === id)
        if (u) u.role = role
        toastSuccess(`Role updated to ${role}`)
        _updateStats()
      } catch(err) { toastError(err.message); e.target.value = sel.dataset.current }
    })
  )

  // Ban toggle
  document.querySelectorAll('.btn-ban').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id      = btn.dataset.id
      const banned  = btn.dataset.banned === 'true'
      const u       = _users.find(u => u.id === id)
      if (!confirm(`${banned ? 'Unban' : 'Ban'} user "${u?.username}"?`)) return
      try {
        await api.users.update(id, { is_banned: !banned })
        if (u) u.is_banned = !banned
        toastSuccess(banned ? 'User unbanned' : 'User banned')
        _renderTable()
      } catch(err) { toastError(err.message) }
    })
  )
}

function _updateStats() {
  const statsEl = document.getElementById('user-stats')
  if (!statsEl) return
  const counts = {
    total:   _users.length,
    admin:   _users.filter(u => u.role === 'admin').length,
    author:  _users.filter(u => u.role === 'author').length,
    reader:  _users.filter(u => !u.role || u.role === 'reader').length,
  }
  statsEl.innerHTML = [
    ['👥','Total Users', counts.total],
    ['⚡','Admins',      counts.admin],
    ['✍️','Authors',     counts.author],
    ['📖','Readers',     counts.reader],
  ].map(([i,l,v]) =>
    `<div class="stat-card"><span class="text-xl">${i}</span><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`
  ).join('')
}

function _bindEvents() {
  let _t
  document.getElementById('user-search')?.addEventListener('input', e => {
    clearTimeout(_t)
    _t = setTimeout(() => {
      const q = e.target.value.toLowerCase()
      _renderTable(q ? _users.filter(u =>
        (u.username||'').toLowerCase().includes(q) ||
        (u.email||'').toLowerCase().includes(q)
      ) : _users)
    }, 300)
  })

  document.getElementById('user-filter-role')?.addEventListener('change', e => {
    const v = e.target.value
    _renderTable(v ? _users.filter(u => (u.role||'reader') === v) : _users)
  })
}

function _fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en', { year:'numeric', month:'short', day:'numeric' })
}

const MOCK_USERS = [
  { id:'1', username:'admin',          email:'admin@novelora.my.id',    role:'admin',  is_banned:false, created_at:'2024-01-01' },
  { id:'2', username:'AriannaKusuma',  email:'ariana@example.com',    role:'author', is_banned:false, created_at:'2024-02-15' },
  { id:'3', username:'yamazaki_ren',   email:'ren@example.jp',        role:'author', is_banned:false, created_at:'2024-03-01' },
  { id:'4', username:'tanaka_reader',  email:'tanaka@example.jp',     role:'reader', is_banned:false, created_at:'2024-04-12' },
  { id:'5', username:'spamuser99',     email:'spam@example.com',      role:'reader', is_banned:true,  created_at:'2024-05-20' },
  { id:'6', username:'dewi_writes',    email:'dewi@example.id',       role:'author', is_banned:false, created_at:'2024-06-08' },
  { id:'7', username:'cloudmtn',       email:'cloudmtn@example.cn',   role:'author', is_banned:false, created_at:'2024-07-14' },
]
