let _container = null

export function initToast() {
  _container = document.createElement('div')
  _container.className = 'toast-container'
  document.body.appendChild(_container)
}

export function toast(msg, type = 'success', duration = 3000) {
  if (!_container) initToast()

  const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' }
  const el = document.createElement('div')
  el.className = `toast-item toast-${type}`
  el.innerHTML = `<span>${icons[type] || '✓'}</span><span>${msg}</span>`
  _container.appendChild(el)

  requestAnimationFrame(() => el.classList.add('show'))

  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, duration)
}

export const toastSuccess = (m) => toast(m, 'success')
export const toastError   = (m) => toast(m, 'error')
export const toastInfo    = (m) => toast(m, 'info')
export const toastWarn    = (m) => toast(m, 'warn')
