/**
 * Supabase client — single instance for the whole app.
 * Realtime subscriptions manager included.
 */
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL      || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const sb = URL && KEY
  ? createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'nn-auth' },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null

/* ─── Realtime subscription manager ─── */
const _channels = new Map()

/**
 * Subscribe to a Supabase table with Postgres Changes.
 * @param {string} table - table name
 * @param {function} cb  - callback({ eventType, new, old })
 * @param {object}  opts - { filter, schema }
 * @returns {function} unsubscribe
 */
export function subscribe(table, cb, opts = {}) {
  if (!sb) return () => {}

  const key = `${table}:${JSON.stringify(opts)}`
  if (_channels.has(key)) {
    sb.removeChannel(_channels.get(key))
  }

  const channel = sb
    .channel(`rt:${key}`)
    .on(
      'postgres_changes',
      {
        event:  opts.event  || '*',
        schema: opts.schema || 'public',
        table,
        filter: opts.filter,
      },
      cb
    )
    .subscribe()

  _channels.set(key, channel)
  return () => {
    sb.removeChannel(channel)
    _channels.delete(key)
  }
}

/**
 * Subscribe to a realtime broadcast (e.g. visitor presence).
 */
export function subscribeBroadcast(room, event, cb) {
  if (!sb) return () => {}
  const channel = sb.channel(room)
  channel.on('broadcast', { event }, cb).subscribe()
  return () => sb.removeChannel(channel)
}

/**
 * Track page view for analytics (upsert via edge function).
 */
export async function trackView(path, referrer = '') {
  if (!sb) return
  await sb.from('page_views').insert({
    path,
    referrer: referrer || document.referrer || '',
    user_agent: navigator.userAgent,
    language: navigator.language,
  }).then(() => {})  // fire-and-forget
}
