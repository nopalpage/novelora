import { isAdmin } from '../../lib/auth.js'
import { api }     from '../../lib/api.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { _layout } from './dashboard.js'
import { navigate } from '../../lib/router.js'
import { subscribe } from '../../lib/supabase.js'

let _chapters = []
let _novelId  = null
let _novelTitle = ''

export async function render(novelId) {
  const c = document.getElementById('page-content')
  if (!isAdmin()) { navigate('/'); return }

  _novelId = novelId
  c.innerHTML = _layout(_html(), 'novels')

  // Load novel info
  try {
    const r = await api.novels.get(novelId)
    _novelTitle = r.data?.title || 'Novel'
    const titleEl = document.getElementById('novel-title-crumb')
    if (titleEl) titleEl.textContent = _novelTitle
  } catch(_) {}

  await _load()
  _bindEvents()

  // Realtime
  subscribe('chapters', p => {
    if (p.new?.novel_id !== novelId && p.old?.novel_id !== novelId) return
    _load()
  })
}

function _html() {
  return `
  <div class="flex items-center gap-2 text-[13px] text-ink-3 mb-1">
    <a href="/admin/novels" data-link class="hover:text-ink transition-colors">Novels</a>
    <span>/</span>
    <span class="text-ink" id="novel-title-crumb">Novel</span>
    <span>/</span>
    <span class="text-ink">Chapters</span>
  </div>

  <div class="flex items-center justify-between mb-6">
    <h1 class="text-[22px] font-bold font-serif">Chapter Manager</h1>
    <button class="btn btn-primary btn-lg gap-2" id="btn-new-ch">+ New Chapter</button>
  </div>

  <div class="card overflow-hidden">
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Ch. #</th><th>Title</th><th>Words</th><th>Views</th><th>Status</th><th>Published</th><th></th>
        </tr></thead>
        <tbody id="ch-tbody">
          ${Array(5).fill(0).map(() => `<tr>${Array(7).fill('<td><div class="skel h-4 rounded"></div></td>').join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <div id="ch-modal-root"></div>`
}

async function _load() {
  try {
    const r = await api.chapters.list(_novelId)
    _chapters = r.data || []
  } catch(_) { _chapters = [] }
  _renderTable()
}

function _renderTable() {
  const el = document.getElementById('ch-tbody')
  if (!el) return
  if (!_chapters.length) {
    el.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-ink-3">No chapters yet. Create the first one!</td></tr>`
    return
  }
  el.innerHTML = [..._chapters].reverse().map(ch => `
    <tr>
      <td class="font-serif font-bold text-[16px]">${ch.chapter_num}</td>
      <td class="font-medium max-w-[240px]"><div class="truncate">${ch.title}</div></td>
      <td>${ch.word_count ? _fmtNum(ch.word_count) : '—'}</td>
      <td>${_fmtNum(ch.views||0)}</td>
      <td>
        <span class="badge ${ch.is_draft ? 'badge-gray' : 'badge-green'}">
          ${ch.is_draft ? 'Draft' : 'Published'}
        </span>
        ${ch.is_premium ? '<span class="badge badge-yellow ml-1">Premium</span>' : ''}
      </td>
      <td class="text-[12px] text-ink-3">${_timeAgo(ch.created_at)}</td>
      <td>
        <div class="flex gap-1.5">
          <a href="/read/${ch.id}" target="_blank" class="btn btn-sm btn-outline" title="Preview">👁</a>
          <button class="btn btn-sm btn-outline btn-edit-ch" data-id="${ch.id}" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger btn-del-ch"  data-id="${ch.id}" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`).join('')

  document.querySelectorAll('.btn-edit-ch').forEach(b => b.addEventListener('click', () => _openModal(b.dataset.id)))
  document.querySelectorAll('.btn-del-ch').forEach(b  => b.addEventListener('click', () => _confirmDelete(b.dataset.id)))
}

function _openModal(id = null) {
  const ch   = id ? _chapters.find(c => String(c.id) === String(id)) : null
  const root = document.getElementById('ch-modal-root')
  const nextNum = ch ? ch.chapter_num : Math.max(0, ..._chapters.map(c => c.chapter_num)) + 1

  root.innerHTML = `
  <div class="modal-overlay open" id="ch-overlay">
    <div class="modal-box w-[680px] max-h-[90vh]">
      <div class="modal-header">
        <h2 class="modal-title">${ch ? `Edit Ch. ${ch.chapter_num}` : 'New Chapter'}</h2>
        <button class="btn btn-icon btn-ghost" id="cm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="form-field">
            <label class="label">Chapter #</label>
            <input class="input" type="number" id="cm-num" value="${nextNum}" min="1" />
          </div>
          <div class="form-field col-span-2">
            <label class="label">Title *</label>
            <input class="input" id="cm-title" value="${ch?.title||''}" placeholder="Chapter title" />
          </div>
        </div>
        <div class="form-field">
          <label class="label">Content *</label>
          <textarea class="textarea font-sans text-[13.5px] leading-relaxed" id="cm-content"
            rows="16" placeholder="Write chapter content here…">${ch?.content||''}</textarea>
        </div>
        <div class="flex gap-4 mt-2">
          <label class="flex items-center gap-2 text-[13px] cursor-pointer">
            <input type="checkbox" id="cm-draft" ${ch?.is_draft!==false?'checked':''} class="rounded border-line" />
            Save as draft
          </label>
          <label class="flex items-center gap-2 text-[13px] cursor-pointer">
            <input type="checkbox" id="cm-premium" ${ch?.is_premium?'checked':''} class="rounded border-line" />
            Premium chapter
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="cm-cancel">Cancel</button>
        <button class="btn btn-outline" id="cm-save-draft">Save Draft</button>
        <button class="btn btn-primary" id="cm-publish">
          ${ch?.is_draft === false ? 'Update' : 'Publish'}
        </button>
      </div>
    </div>
  </div>`

  const close = () => { root.innerHTML = '' }
  document.getElementById('cm-close').addEventListener('click', close)
  document.getElementById('cm-cancel').addEventListener('click', close)
  document.getElementById('ch-overlay').addEventListener('click', e => { if (e.target.id === 'ch-overlay') close() })

  const _save = async (asDraft) => {
    const payload = {
      novel_id:    _novelId,
      chapter_num: parseInt(document.getElementById('cm-num').value),
      title:       document.getElementById('cm-title').value.trim(),
      content:     document.getElementById('cm-content').value.trim(),
      is_draft:    asDraft,
      is_premium:  document.getElementById('cm-premium').checked,
    }
    if (!payload.title || !payload.content) { toastError('Title and content required'); return }
    try {
      if (ch) { await api.chapters.update(ch.id, payload); toastSuccess('Chapter updated') }
      else    { await api.chapters.create(payload);        toastSuccess(asDraft ? 'Draft saved' : 'Chapter published!') }
      close(); await _load()
    } catch(err) { toastError(err.message) }
  }

  document.getElementById('cm-save-draft').addEventListener('click', () => _save(true))
  document.getElementById('cm-publish').addEventListener('click', () => _save(false))
}

async function _confirmDelete(id) {
  const ch = _chapters.find(c => String(c.id) === String(id))
  if (!confirm(`Delete "Ch. ${ch?.chapter_num}: ${ch?.title}"? This cannot be undone.`)) return
  try {
    await api.chapters.delete(id)
    toastSuccess('Chapter deleted')
    _chapters = _chapters.filter(c => String(c.id) !== String(id))
    _renderTable()
  } catch(err) { toastError(err.message) }
}

function _bindEvents() {
  document.getElementById('btn-new-ch')?.addEventListener('click', () => _openModal())
}

function _fmtNum(n) {
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n)
}

function _timeAgo(d) {
  if (!d) return '—'
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 3600)  return Math.floor(s/60)  + 'm ago'
  if (s < 86400) return Math.floor(s/3600)+ 'h ago'
  return Math.floor(s/86400) + 'd ago'
}
