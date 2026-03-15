/**
 * Auth store — user session, role management.
 * Roles: 'admin' | 'author' | 'reader' | null (guest)
 *
 * FIX v1.3.1:
 *  - signInWithGoogle: gunakan VITE_SITE_URL untuk redirect yang benar
 *  - _loadProfile: retry logic jika profile belum ada (race condition Google OAuth)
 *  - handleOAuthCallback: tangani hash/query param dari Supabase setelah redirect
 */
import { sb } from './supabase.js'

const _listeners = new Set()
let _state = { user: null, session: null, profile: null, role: null, loading: true }

export function getAuth()    { return { ..._state } }
export function getUser()    { return _state.user }
export function getRole()    { return _state.role }
export function isAdmin()    { return _state.role === 'admin' }
export function isAuthor()   { return _state.role === 'author' || isAdmin() }
export function isLoggedIn() { return !!_state.user }

export function onAuthChange(fn) {
  _listeners.add(fn)
  fn({ ..._state })
  return () => _listeners.delete(fn)
}

function emit() { _listeners.forEach(fn => fn({ ..._state })) }

export async function initAuth() {
  if (!sb) { _state.loading = false; emit(); return }

  const { data: { session } } = await sb.auth.getSession()
  if (session) await _loadProfile(session)
  else { _state.loading = false; emit() }

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await _loadProfile(session)
    } else {
      _state = { user: null, session: null, profile: null, role: null, loading: false }
      emit()
    }
  })
}

/**
 * Load user profile dari tabel `profiles`.
 * Jika profile belum ada (misalnya trigger belum selesai), retry hingga 3x.
 */
async function _loadProfile(session) {
  _state.session = session
  _state.user    = session.user

  if (sb) {
    let profile = null
    let attempts = 0

    // Retry karena trigger DB kadang butuh ~500ms setelah OAuth callback
    while (!profile && attempts < 3) {
      if (attempts > 0) await new Promise(r => setTimeout(r, 600 * attempts))

      const { data } = await sb
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      profile = data
      attempts++
    }

    // Jika masih null (trigger gagal), buat profil manual sebagai fallback
    if (!profile) {
      const meta = session.user.user_metadata || {}
      const fallbackUsername =
        meta.full_name || meta.name ||
        session.user.email?.split('@')[0] || 'user'

      const { data: newProfile } = await sb
        .from('profiles')
        .upsert({
          id:         session.user.id,
          email:      session.user.email,
          username:   fallbackUsername,
          avatar_url: meta.avatar_url || meta.picture || null,
          role:       'reader',
        }, { onConflict: 'id' })
        .select()
        .single()

      profile = newProfile
    }

    _state.profile = profile
    _state.role    = profile?.role || 'reader'
  }

  _state.loading = false
  emit()
}

/* ─── Auth actions ─── */

export async function signIn(email, password) {
  if (!sb) throw new Error('Supabase not configured')
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(email, password, username) {
  if (!sb) throw new Error('Supabase not configured')
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: undefined,
    },
  })
  if (error) throw error
  return data
}

/**
 * Login dengan Google OAuth.
 *
 * FIX UTAMA: Gunakan VITE_SITE_URL (bukan window.location.origin) agar
 * redirect selalu ke https://novelora.my.id — bukan ke URL Supabase dengan
 * domain kamu sebagai path (bug yang menyebabkan error "requested path is invalid").
 */
export async function signInWithGoogle() {
  if (!sb) throw new Error('Supabase not configured')

  // Prioritas: env var → window.location.origin (fallback localhost)
  const siteUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) ||
    window.location.origin

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/`,   // ← https://novelora.my.id/
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  if (error) throw error
}

export async function sendVerificationCode(email) {
  const res = await fetch('/api/auth/send-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.message || 'Gagal mengirim kode')
  return json.data
}

export async function verifyCode(email, code) {
  const res = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.message || 'Kode tidak valid')
  return json.data
}

export async function signOut() {
  if (!sb) return
  await sb.auth.signOut()
}

export async function updateProfile(updates) {
  if (!sb || !_state.user) throw new Error('Not logged in')
  const { error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', _state.user.id)
  if (error) throw error
  // Refresh local state
  if (_state.profile) _state.profile = { ..._state.profile, ...updates }
  if (updates.role)   _state.role = updates.role
  emit()
}
