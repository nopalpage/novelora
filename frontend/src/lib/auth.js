/**
 * Auth store — user session, role management.
 * Roles: 'admin' | 'author' | 'reader' | null (guest)
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

async function _loadProfile(session) {
  _state.session = session
  _state.user    = session.user

  if (sb) {
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
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
      emailRedirectTo: undefined, // kita handle verifikasi sendiri
    },
  })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  if (!sb) throw new Error('Supabase not configured')
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
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
}
