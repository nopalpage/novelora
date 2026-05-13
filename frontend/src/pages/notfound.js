export function render(container) {
  const c = container || document.getElementById('page-content')
  if (!c) return
  c.innerHTML = `
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
    <div class="font-serif text-[80px] font-bold text-ink-4 leading-none mb-4">404</div>
    <h1 class="text-[24px] font-bold font-serif mb-2">Page not found</h1>
    <p class="text-[14px] text-ink-3 mb-8 max-w-sm">The page you're looking for doesn't exist or has been moved.</p>
    <div class="flex gap-3">
      <a href="/" data-link class="btn btn-primary btn-lg">Go Home</a>
      <a href="/browse" data-link class="btn btn-outline btn-lg">Browse Novels</a>
    </div>
  </div>`
}
