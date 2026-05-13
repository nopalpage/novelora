/**
 * Ad Display System
 * Supports: banner (728×90), sidebar (300×250), inline (468×60), interstitial
 * Tracks impressions + clicks via /api/ads/:id/impression and /click
 */
import { api } from '../lib/api.js'

let _ads = []
let _loaded = false

async function loadAds() {
  if (_loaded) return _ads
  try { const r = await api.ads.list(); _ads = r.data || []; _loaded = true }
  catch(_) { _ads = FALLBACK_ADS }
  return _ads
}

function getAdsBySlot(slot) {
  return _ads.filter(a => a.slot === slot && a.active)
}

function pickAd(slot) {
  const pool = getAdsBySlot(slot)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

/* ── Render helpers ── */

export async function renderBannerAd(container) {
  await loadAds()
  const ad = pickAd('banner') || FALLBACK_ADS.find(a => a.slot === 'banner')
  if (!ad) return
  container.innerHTML = _bannerHtml(ad)
  _trackImpression(ad.id)
  container.querySelector('[data-ad-click]')?.addEventListener('click', () => _trackClick(ad.id))
}

export async function renderSidebarAd(container) {
  await loadAds()
  const ad = pickAd('sidebar') || FALLBACK_ADS.find(a => a.slot === 'sidebar')
  if (!ad) return
  container.innerHTML = _sidebarHtml(ad)
  _trackImpression(ad.id)
  container.querySelector('[data-ad-click]')?.addEventListener('click', () => _trackClick(ad.id))
}

export async function renderInlineAd(container) {
  await loadAds()
  const ad = pickAd('inline') || FALLBACK_ADS.find(a => a.slot === 'inline')
  if (!ad) return
  container.innerHTML = _inlineHtml(ad)
  _trackImpression(ad.id)
  container.querySelector('[data-ad-click]')?.addEventListener('click', () => _trackClick(ad.id))
}

/* ── HTML templates ── */

function _bannerHtml(ad) {
  return `
  <div class="ad-slot w-full h-[90px] flex items-center justify-center cursor-pointer group" data-ad-click>
    <div class="ad-label">Ad</div>
    <a href="${ad.url || '#'}" target="_blank" rel="noopener sponsored" class="w-full h-full flex items-center justify-center">
      ${ad.image_url
        ? `<img src="${ad.image_url}" alt="${ad.title}" class="max-h-full object-contain" />`
        : `<div class="flex flex-col items-center gap-1 text-center px-4">
             <div class="text-[16px] font-semibold font-serif text-ink">${ad.title}</div>
             <div class="text-[12px] text-ink-3">${ad.description || ''}</div>
             <span class="mt-1 badge badge-accent text-[9px]">${ad.cta || 'Learn More'}</span>
           </div>`}
    </a>
  </div>`
}

function _sidebarHtml(ad) {
  return `
  <div class="ad-slot w-[300px] h-[250px] flex flex-col items-center justify-center cursor-pointer p-4 text-center gap-3" data-ad-click>
    <div class="ad-label">Sponsored</div>
    ${ad.image_url
      ? `<img src="${ad.image_url}" alt="${ad.title}" class="w-24 h-24 object-cover rounded-lg" />`
      : `<div class="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-3xl">
           ${ad.icon || '📚'}
         </div>`}
    <div>
      <div class="text-[15px] font-semibold font-serif">${ad.title}</div>
      <div class="text-[12px] text-ink-3 mt-1 line-clamp-2">${ad.description || ''}</div>
    </div>
    <a href="${ad.url || '#'}" target="_blank" rel="noopener sponsored"
       class="btn btn-accent btn-sm">${ad.cta || 'Learn More'}</a>
  </div>`
}

function _inlineHtml(ad) {
  return `
  <div class="ad-slot w-full py-4 px-5 flex items-center gap-4 cursor-pointer" data-ad-click>
    <div class="ad-label">Ad</div>
    ${ad.image_url
      ? `<img src="${ad.image_url}" alt="" class="w-12 h-12 rounded object-cover shrink-0" />`
      : `<div class="w-12 h-12 rounded bg-accent/10 flex items-center justify-center text-xl shrink-0">${ad.icon || '📖'}</div>`}
    <div class="flex-1 min-w-0">
      <div class="text-[14px] font-semibold">${ad.title}</div>
      <div class="text-[12px] text-ink-3">${ad.description || ''}</div>
    </div>
    <a href="${ad.url || '#'}" target="_blank" rel="noopener sponsored"
       class="btn btn-outline btn-sm shrink-0">${ad.cta || 'Visit'}</a>
  </div>`
}

async function _trackImpression(id) {
  if (!id || id.startsWith('mock')) return
  api.ads.impression(id).catch(() => {})
}

async function _trackClick(id) {
  if (!id || id.startsWith('mock')) return
  api.ads.click(id).catch(() => {})
}

/* ── Fallback / mock ads ── */
const FALLBACK_ADS = [
  {
    id: 'mock-1', slot: 'banner', active: true,
    title: 'Bookwalker — Global Novel Store',
    description: 'Buy and read light novels, manga, and webtoons.',
    cta: 'Shop Now', url: '#', icon: '🛒',
  },
  {
    id: 'mock-2', slot: 'sidebar', active: true,
    title: 'NovelAI — Write with AI',
    description: 'Generate story ideas, plot twists, and character bios with AI assistance.',
    cta: 'Try Free', url: '#', icon: '🤖',
  },
  {
    id: 'mock-3', slot: 'inline', active: true,
    title: 'Premium Plan — Go Ad-Free',
    description: 'Remove all ads and unlock exclusive early-access chapters.',
    cta: 'Upgrade', url: '#', icon: '⭐',
  },
  {
    id: 'mock-4', slot: 'banner', active: true,
    title: 'KonoSuba Light Novel — Vol. 18 Out Now',
    description: 'The legendary isekai comedy continues.',
    cta: 'Read More', url: '#', icon: '📚',
  },
]
