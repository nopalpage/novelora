const BASE = '/api'

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  const data = await res.json().catch(() => ({ ok: false, message: 'Parse error' }))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export const api = {
  novels: {
    list:   (p) => req(`/novels?${new URLSearchParams(p)}`),
    get:    (id) => req(`/novels/${id}`),
    search: (q)  => req(`/novels/search?q=${encodeURIComponent(q)}`),
    create: (b)  => req('/novels',    { method:'POST',   body: JSON.stringify(b) }),
    update: (id,b) => req(`/novels/${id}`, { method:'PUT', body: JSON.stringify(b) }),
    delete: (id) => req(`/novels/${id}`, { method:'DELETE' }),
  },
  chapters: {
    list:   (nid) => req(`/novels/${nid}/chapters`),
    get:    (id)  => req(`/chapters/${id}`),
    create: (b)   => req('/chapters',       { method:'POST',   body: JSON.stringify(b) }),
    update: (id,b) => req(`/chapters/${id}`, { method:'PUT',    body: JSON.stringify(b) }),
    delete: (id)  => req(`/chapters/${id}`, { method:'DELETE' }),
  },
  rankings: {
    weekly:  () => req('/rankings/weekly'),
    monthly: () => req('/rankings/monthly'),
  },
  analytics: {
    summary:   () => req('/analytics/summary'),
    pageviews:  (days) => req(`/analytics/pageviews?days=${days||7}`),
    topNovels:  () => req('/analytics/top-novels'),
    topChapters:() => req('/analytics/top-chapters'),
  },
  ads: {
    list:   () => req('/ads'),
    create: (b)  => req('/ads',    { method:'POST',   body: JSON.stringify(b) }),
    update: (id,b) => req(`/ads/${id}`, { method:'PUT', body: JSON.stringify(b) }),
    delete: (id)  => req(`/ads/${id}`, { method:'DELETE' }),
    click:  (id)  => req(`/ads/${id}/click`, { method:'POST' }),
    impression: (id) => req(`/ads/${id}/impression`, { method:'POST' }),
  },
  users: {
    list:   () => req('/users'),
    update: (id,b) => req(`/users/${id}`, { method:'PUT', body: JSON.stringify(b) }),
    ban:    (id) => req(`/users/${id}/ban`, { method:'POST' }),
  },
  auth: {
    login:    (e,p)   => req('/auth/login',    { method:'POST', body: JSON.stringify({ email:e, password:p }) }),
    register: (e,p,u) => req('/auth/register', { method:'POST', body: JSON.stringify({ email:e, password:p, username:u }) }),
  },
  user: {
    bookmark:   (novelId) => req('/me/bookmarks',  { method:'POST',   body: JSON.stringify({ novel_id: novelId }) }),
    unbookmark: (novelId) => req(`/me/bookmarks/${novelId}`, { method:'DELETE' }),
    like:       (novelId) => req('/me/likes',      { method:'POST',   body: JSON.stringify({ novel_id: novelId }) }),
    unlike:     (novelId) => req(`/me/likes/${novelId}`,     { method:'DELETE' }),
    bookmarks:  () => req('/me/bookmarks'),
    progress:   (chapterId, pos) => req('/me/progress', { method:'PUT', body: JSON.stringify({ chapter_id: chapterId, position: pos }) }),
    getProgress: (novelId) => req(`/me/progress/${novelId}`),
    notifications: () => req('/me/notifications'),
    markRead:   (id) => req(`/me/notifications/${id}/read`, { method:'PUT' }),
  },
}
