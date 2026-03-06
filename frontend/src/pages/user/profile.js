/**
 * User profile page
 */
import { getAuth, updateProfile, isLoggedIn } from '../../lib/auth.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { navigate } from '../../lib/router.js'

export async function render() {
  const c = document.getElementById('page-content')

  if (!isLoggedIn()) {
    c.innerHTML = `<div class="flex flex-col items-center justify-center h-64 gap-3">
      <span class="text-4xl">🔒</span>
      <p class="text-ink-2">Please sign in to view your profile.</p>
      <button class="btn btn-primary" id="btn-goto-login">Sign In</button>
    </div>`
    document.getElementById('btn-goto-login')?.addEventListener('click', () =>
      import('../../components/auth-modal.js').then(m => m.openAuthModal('login'))
    )
    return
  }

  const { user, profile } = getAuth()

  c.innerHTML = `
  <div class="container mx-auto px-6 py-10 max-w-2xl">
    <h1 class="text-[26px] font-bold font-serif mb-8">My Profile</h1>

    <div class="card card-lg mb-6">
      <div class="flex items-center gap-5 mb-6 pb-6 border-b border-line">
        <div class="w-16 h-16 rounded-full bg-ink flex items-center justify-center text-paper text-[24px] font-bold font-serif shrink-0">
          ${(profile?.username || user?.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <div class="text-[18px] font-bold">${profile?.username || 'User'}</div>
          <div class="text-[13px] text-ink-3">${user?.email}</div>
          <div class="mt-1">
            <span class="badge ${profile?.role === 'admin' ? 'badge-accent' : profile?.role === 'author' ? 'badge-purple' : 'badge-gray'}">
              ${profile?.role || 'reader'}
            </span>
          </div>
        </div>
      </div>

      <!-- Edit form -->
      <div class="space-y-4">
        <div class="form-field">
          <label class="label">Username</label>
          <input class="input" id="p-username" value="${profile?.username || ''}" placeholder="Your username" />
        </div>
        <div class="form-field">
          <label class="label">Bio</label>
          <textarea class="textarea" id="p-bio" rows="3" placeholder="Tell readers about yourself…">${profile?.bio || ''}</textarea>
        </div>
        <div class="flex justify-end">
          <button class="btn btn-primary" id="btn-save-profile">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Reading stats -->
    <div class="card card-lg">
      <h2 class="text-[17px] font-bold font-serif mb-4">Reading Stats</h2>
      <div class="grid grid-cols-3 gap-4">
        ${[['📚','0','Bookmarks'],['❤️','0','Likes'],['📖','0','Chapters Read']].map(([icon,val,label]) => `
          <div class="text-center p-4 bg-paper-2 rounded-lg">
            <div class="text-2xl mb-1">${icon}</div>
            <div class="text-[20px] font-bold font-serif">${val}</div>
            <div class="text-[11px] text-ink-3">${label}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`

  document.getElementById('btn-save-profile')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const username = document.getElementById('p-username').value.trim()
    const bio      = document.getElementById('p-bio').value.trim()
    if (!username) { toastError('Username is required'); return }
    btn.disabled = true; btn.textContent = 'Saving…'
    try {
      await updateProfile({ username, bio })
      toastSuccess('Profile updated!')
    } catch(err) { toastError(err.message) }
    finally { btn.disabled = false; btn.textContent = 'Save Changes' }
  })
}
