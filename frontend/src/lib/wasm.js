let _ready = false

export async function initWasm(url) {
  await _loadScript('/wasm/wasm_exec.js')
  const go = new Go()
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`WASM ${resp.status}`)
  const { instance } = await WebAssembly.instantiateStreaming(resp, go.importObject)
  go.run(instance); _ready = true
  console.info('[WASM] Go module ready ✓')
}

function _loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return }
    const s = Object.assign(document.createElement('script'), { src, onload: res, onerror: rej })
    document.head.appendChild(s)
  })
}

export const searchScore = (q, t, d = '') =>
  _ready && globalThis.NoveloraWasm?.searchScore
    ? globalThis.NoveloraWasm.searchScore(q, t, d)
    : _jsSearch(q, t, d)

export const rankScore = (v, l, r, a = 0) =>
  _ready && globalThis.NoveloraWasm?.rankScore
    ? globalThis.NoveloraWasm.rankScore(v, l, r, a)
    : (Math.log1p(v) / Math.log1p(1e7) * 0.4 + Math.log1p(l) / Math.log1p(5e5) * 0.3 + (r - 1) / 4 * 0.3) / (1 + a / 720)

export const readingTime = (wc) =>
  _ready && globalThis.NoveloraWasm?.readingTime
    ? globalThis.NoveloraWasm.readingTime(wc)
    : Math.ceil(wc / 250)

function _jsSearch(q, title, desc) {
  const words = q.toLowerCase().split(/\s+/)
  const text = (title + ' ' + desc).toLowerCase()
  return words.filter(w => text.includes(w)).length / Math.max(words.length, 1)
}
