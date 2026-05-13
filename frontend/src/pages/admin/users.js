/**
 * Admin Users Page — manage users, roles, ban status
 * Hanya accessible oleh role 'admin'
 */
import { isAdmin, getUser } from '../../lib/auth.js'
import { api }     from '../../lib/api.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { _layout } from './dashboard.js'
import { navigate } from '../../lib/router.js'

let _users = []
let _currentUserId = null

export async function render() {
  const c = document.getElementById('page-content')

  // Guard: hanya admin
  if (!isAdmin()) {
    c.innerHTML = `
      <div class="flex flex-col items-center justify-center h-64 gap-3">
        <span class="text-5xl">🔒</span>
        <h2 class="text-[18px] font-semibold">Akses Ditolak</h2>
        <p class="text-ink-3 text-[14px]">Halaman ini hanya untuk administrator.</p>
        <a href="/" data-link class="btn btn-primary">Kembali ke Beranda</a>
      </div>`
    return
  }

  _currentUserId = getUser()?.id
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
    <div class="flex items-center gap-2 text-[11px] text-ink-3">
      <span class="realtime-dot"></span>
      Live
    </div>
  </div>

  <!-- Search & Filter -->
  <div class="flex flex-wrap gap-3 mb-4">
    <input class="input w-64" type="text" placeholder="Search by username or email…" id="user-search" />
    <select class="select w-36" id="user-filter-role">
      <option value="">All Roles</option>
      <option value="admin">⚡ Admin</option>
      <option value="author">✍️ Author</option>
      <option value="reader">📖 Reader</option>
    </select>
    <select class="select w-36" id="user-filter-status">
      <option value="">All Status</option>
      <option value="active">✅ Active</option>
      <option value="banned">🚫 Banned</option>
    </select>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="user-stats">
    ${[['👥','Total Users','—'],['⚡','Admins','—'],['✍️','Authors','—'],['📖','Readers','—']].map(([i,l,v]) =>
      `<div class="stat-card">
        <span class="text-xl">${i}</span>
        <div class="stat-val" id="stat-${l.toLowerCase().replace(' ','-')}">${v}</div>
        <div class="stat-label">${l}</div>
      </div>`
    ).join('')}
  </div>

  <!-- Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr>
            <th class="w-[280px]">User</th>
            <th class="w-[130px]">Role</th>
            <th class="w-[100px]">Status</th>
            <th class="w-[120px]">Joined</th>
            <th class="w-[140px]">Actions</th>
          </tr>
        </thead>
        <tbody id="users-tbody">
          ${_skeletonRows(5)}
        </tbody>
      </table>
    </div>
    <div id="users-empty" class="hidden py-12 text-center text-ink-3 text-[14px]">
      No users found.
    </div>
  </div>`
}

function _skeletonRows(n) {
  return Array(n).fill(0).map(() =>
    `<tr>${Array(5).fill('<td><div class="skel h-4 rounded w-full"></div></td>').join('')}</tr>`
  ).join('')
}

async function _load() {
  try {
    const r = await api.users.list()
    _users = r.data || MOCK_USERS
  } catch(_) {
    _users = MOCK_USERS
  }
  _renderTable()
  _updateStats()
}

function _renderTable(list = _users) {
  const el = document.getElementById('users-tbody')
  const empty = document.getElementById('users-empty')
  if (!el) return

  if (!list.length) {
    el.innerHTML = ''
    empty?.classList.remove('hidden')
    return
  }
  empty?.classList.add('hidden')

  const ROLE_BADGE = {
    admin:  'badge-accent',
    author: 'badge-purple',
    reader: 'badge-gray',
  }
  const ROLE_ICON  = { admin: '⚡', author: '✍️', reader: '📖' }

  el.innerHTML = list.map(u => {
    const isSelf    = u.id === _currentUserId
    const roleClass = ROLE_BADGE[u.role || 'reader'] || 'badge-gray'
    const roleBadge = `<span class="badge ${roleClass} text-[10px]">${ROLE_ICON[u.role || 'reader']} ${u.role || 'reader'}</span>`

    return `
    <tr class="${u.is_banned ? 'opacity-60' : ''}">

      <!-- User info -->
      <td>
        <div class="flex items-center gap-3">
          ${u.avatar_url
            ? `<img src="${u.avatar_url}" class="w-8 h-8 rounded-full object-cover shrink-0" alt="" />`
            : `<div class="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-paper text-[12px] font-bold shrink-0">
                 ${(u.username || u.email || '?')[0].toUpperCase()}
               </div>`
          }
          <div class="min-w-0">
            <div class="font-medium text-[13.5px] truncate flex items-center gap-1.5">
              ${u.username || '—'}
              ${isSelf ? `<span class="badge badge-blue text-[9px]">You</span>` : ''}
              ${u.email_verified ? `<span title="Email verified" class="text-green-500 text-[11px]">✓</span>` : ''}
            </div>
            <div class="text-[11px] text-ink-3 truncate">${u.email || ''}</div>
          </div>
        </div>
      </td>

      <!-- Role selector -->
      <td>
        ${isSelf
          ? roleBadge  // Tidak bisa ubah role sendiri
          : `<select
               class="select h-[28px] text-[12px] w-28 py-0 role-select"
               data-id="${u.id}"
               data-current="${u.role || 'reader'}"
               title="Change role"
             >
               <option value="reader"  ${(u.role||'reader')==='reader' ?'selected':''}>📖 reader</option>
               <option value="author"  ${u.role==='author' ?'selected':''}>✍️ author</option>
               <option value="admin"   ${u.role==='admin'  ?'selected':''}>⚡ admin</option>
             </select>`
        }
      </td>

      <!-- Status -->
      <td>
        <span class="badge ${u.is_banned ? 'badge-red' : 'badge-green'} text-[11px]">
          ${u.is_banned ? '🚫 Banned' : '✓ Active'}
        </span>
      </td>

      <!-- Joined date -->
      <td class="text-[12px] text-ink-3 whitespace-nowrap">${_fmtDate(u.created_at)}</td>

      <!-- Actions -->
      <td>
        ${isSelf
          ? `<span class="text-[11px] text-ink-4 italic">—</span>`
          : `<div class="flex gap-1.5">
               <button
                 class="btn btn-sm ${u.is_banned ? 'btn-outline' : 'btn-danger'} btn-ban"
                 data-id="${u.id}"
                 data-banned="${u.is_banned ? 'true' : 'false'}"
                 data-username="${u.username || u.email}"
                 title="${u.is_banned ? 'Unban user' : 'Ban user'}"
               >
                 ${u.is_banned ? '✓ Unban' : '🚫 Ban'}
               </button>
             </div>`
        }
      </td>
    </tr>`
  }).join('')

  // ── Role change listeners ──
  document.querySelectorAll('.role-select').forEach(sel =>
    sel.addEventListener('change', async e => {
      const id      = sel.dataset.id
      const newRole = e.target.value
      const oldRole = sel.dataset.current

      if (newRole === oldRole) return

      if (!confirm(`Ubah role "${_userName(id)}" dari "${oldRole}" → "${newRole}"?`)) {
        e.target.value = oldRole
        return
      }

      try {
        await api.users.update(id, { role: newRole })
        const u = _users.find(u => u.id === id)
        if (u) { u.role = newRole; sel.dataset.current = newRole }
        toastSuccess(`Role diupdate ke "${newRole}" ✓`)
        _updateStats()
      } catch(err) {
        toastError(err.message)
        e.target.value = oldRole
      }
    })
  )

  // ── Ban toggle listeners ──
  document.querySelectorAll('.btn-ban').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id       = btn.dataset.id
      const banned   = btn.dataset.banned === 'true'
      const username = btn.dataset.username

      if (!confirm(`${banned ? 'Unban' : 'Ban'} user "${username}"?`)) return

      try {
        await api.users.update(id, { is_banned: !banned })
        const u = _users.find(u => u.id === id)
        if (u) u.is_banned = !banned
        toastSuccess(`User "${username}" ${banned ? 'dibanned' : 'diunban'} ✓`)
        _renderTable(_getFilteredList())
      } catch(err) {
        toastError(err.message)
      }
    })
  )
}

function _userName(id) {
  const u = _users.find(u => u.id === id)
  return u?.username || u?.email || id
}

function _updateStats() {
  const counts = {
    total:  _users.length,
    admin:  _users.filter(u => u.role === 'admin').length,
    author: _users.filter(u => u.role === 'author').length,
    reader: _users.filter(u => !u.role || u.role === 'reader').length,
  }

  document.querySelector('[id="stat-total-users"]')?.replaceChildren()
  const statsEl = document.getElementById('user-stats')
  if (!statsEl) return

  statsEl.innerHTML = [
    ['👥', 'Total Users', counts.total],
    ['⚡', 'Admins',      counts.admin],
    ['✍️', 'Authors',     counts.author],
    ['📖', 'Readers',     counts.reader],
  ].map(([i, l, v]) =>
    `<div class="stat-card">
      <span class="text-xl">${i}</span>
      <div class="stat-val">${v}</div>
      <div class="stat-label">${l}</div>
    </div>`
  ).join('')
}

function _getFilteredList() {
  const q      = (document.getElementById('user-search')?.value || '').toLowerCase()
  const role   = document.getElementById('user-filter-role')?.value || ''
  const status = document.getElementById('user-filter-status')?.value || ''

  return _users.filter(u => {
    const matchQ = !q ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    const matchRole   = !role   || (u.role || 'reader') === role
    const matchStatus = !status ||
      (status === 'active' && !u.is_banned) ||
      (status === 'banned' && u.is_banned)
    return matchQ && matchRole && matchStatus
  })
}

function _bindEvents() {
  let _t
  const refilter = () => {
    clearTimeout(_t)
    _t = setTimeout(() => _renderTable(_getFilteredList()), 250)
  }

  document.getElementById('user-search')?.addEventListener('input', refilter)
  document.getElementById('user-filter-role')?.addEventListener('change', refilter)
  document.getElementById('user-filter-status')?.addEventListener('change', refilter)
}

function _fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

/* ── Mock data (digunakan jika API tidak tersedia) ── */
const MOCK_USERS = [
  { id: '1', username: 'admin',         email: 'admin@novelora.my.id',  role: 'admin',  is_banned: false, email_verified: true,  created_at: '2024-01-01' },
  { id: '2', username: 'AriannaKusuma', email: 'ariana@example.com',    role: 'author', is_banned: false, email_verified: true,  created_at: '2024-02-15' },
  { id: '3', username: 'yamazaki_ren',  email: 'ren@example.jp',        role: 'author', is_banned: false, email_verified: true,  created_at: '2024-03-01' },
  { id: '4', username: 'tanaka_reader', email: 'tanaka@example.jp',     role: 'reader', is_banned: false, email_verified: false, created_at: '2024-04-12' },
  { id: '5', username: 'spamuser99',    email: 'spam@example.com',      role: 'reader', is_banned: true,  email_verified: false, created_at: '2024-05-20' },
  { id: '6', username: 'dewi_writes',   email: 'dewi@example.id',       role: 'author', is_banned: false, email_verified: true,  created_at: '2024-06-08' },
]
