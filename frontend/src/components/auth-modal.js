import { signIn, signUp, signInWithGoogle, sendVerificationCode, verifyCode } from '../lib/auth.js'
import { toastSuccess, toastError } from '../lib/toast.js'

export function openAuthModal(tab = 'login') {
  const root = document.getElementById('modal-root')
  root.innerHTML = _html()
  const overlay = document.getElementById('auth-overlay')
  requestAnimationFrame(() => overlay.classList.add('open'))
  _bind(tab)
}

function _close() {
  const overlay = document.getElementById('auth-overlay')
  if (!overlay) return
  overlay.classList.remove('open')
  setTimeout(() => { if (overlay) overlay.remove() }, 200)
}

function _html() {
  return `
  <div class="modal-overlay" id="auth-overlay">
    <div class="modal-box w-[400px]">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="5" fill="#191917"/>
            <rect x="8" y="9" width="7" height="11" rx="1" fill="#e8c89a"/>
            <rect x="17" y="9" width="7" height="11" rx="1" fill="#c9a060"/>
            <rect x="15.5" y="8.5" width="1" height="12" rx=".5" fill="#f5e0b8"/>
            <path d="M6 23 Q16 18.5 26 23" stroke="#c9a060" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          </svg>
          <span class="modal-title">NovelNest</span>
        </div>
        <button class="btn btn-icon btn-ghost text-ink-3" id="auth-close">✕</button>
      </div>

      <!-- ── Tabs Login / Register ── -->
      <div class="tabs px-6 pt-2" id="auth-tabs">
        <div class="tab active" data-tab="login"    id="tab-login">Masuk</div>
        <div class="tab"        data-tab="register" id="tab-register">Daftar</div>
      </div>

      <div class="modal-body pt-4" id="auth-body">

        <!-- ── Google button (shared) ── -->
        <button class="btn btn-outline w-full flex items-center justify-center gap-3 mb-4" id="btn-google">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.9 2.2 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.4l7.9 6.1C12.3 13.1 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.5 28.5c-.6-1.6-.9-3.3-.9-5s.3-3.4.9-5l-7.9-6.1C.9 15.4 0 19.6 0 24s.9 8.6 2.6 12.1l7.9-6.1-.6-.5z"/>
            <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-3.7-13.5-9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          <span id="google-btn-text">Lanjutkan dengan Google</span>
        </button>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px bg-ink-4 opacity-30"></div>
          <span class="text-ink-3 text-xs">atau</span>
          <div class="flex-1 h-px bg-ink-4 opacity-30"></div>
        </div>

        <!-- ── Form Login ── -->
        <div id="form-login">
          <div class="form-field">
            <label class="label">Email</label>
            <input class="input" type="email" id="l-email" placeholder="kamu@contoh.com" autocomplete="email" />
          </div>
          <div class="form-field">
            <label class="label">Password</label>
            <input class="input" type="password" id="l-pass" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <button class="btn btn-primary btn-lg w-full mt-1" id="btn-do-login">Masuk</button>
          <p class="text-center text-[12px] text-ink-3 mt-3">
            <a href="/forgot" class="text-accent">Lupa password?</a>
          </p>
        </div>

        <!-- ── Form Register ── -->
        <div id="form-register" class="hidden">
          <div class="form-field">
            <label class="label">Username</label>
            <input class="input" type="text" id="r-user" placeholder="NamaMu" autocomplete="username" />
          </div>
          <div class="form-field">
            <label class="label">Email</label>
            <input class="input" type="email" id="r-email" placeholder="kamu@contoh.com" autocomplete="email" />
          </div>
          <div class="form-field">
            <label class="label">Password</label>
            <input class="input" type="password" id="r-pass" placeholder="Min. 8 karakter" autocomplete="new-password" />
          </div>
          <button class="btn btn-primary btn-lg w-full mt-1" id="btn-do-register">Buat Akun</button>
          <p class="text-center text-[12px] text-ink-3 mt-3">
            Dengan mendaftar kamu setuju <a href="/terms" class="text-accent">Syarat & Ketentuan</a>
          </p>
        </div>

        <!-- ── Step Verifikasi (hidden awalnya) ── -->
        <div id="form-verify" class="hidden">
          <div class="text-center mb-5">
            <div class="text-4xl mb-3">📬</div>
            <h3 class="text-base font-semibold text-ink-1 mb-1">Cek email kamu!</h3>
            <p class="text-sm text-ink-3">Kami sudah kirim kode 6 digit ke</p>
            <p class="text-sm font-medium text-accent mt-1" id="verify-email-display"></p>
          </div>
          <div class="form-field">
            <label class="label text-center block">Kode Verifikasi</label>
            <input
              class="input text-center text-2xl font-bold tracking-[0.5em] py-4"
              type="text"
              id="v-code"
              placeholder="— — — — — —"
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code"
            />
          </div>
          <button class="btn btn-primary btn-lg w-full mt-1" id="btn-do-verify">Verifikasi</button>
          <div class="text-center mt-3">
            <button class="text-[12px] text-ink-3 hover:text-accent transition-colors" id="btn-resend">
              Tidak dapat email? <span class="text-accent underline" id="resend-label">Kirim ulang</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>`
}

let _resendTimer = null

function _bind(defaultTab) {
  _switchTab(defaultTab)

  document.getElementById('auth-close')?.addEventListener('click', _close)
  document.getElementById('auth-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'auth-overlay') _close()
  })
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { _close(); document.removeEventListener('keydown', esc) }
  })

  document.querySelectorAll('.tab[data-tab]').forEach(t =>
    t.addEventListener('click', () => _switchTab(t.dataset.tab))
  )

  // Format kode otomatis (hanya angka)
  document.getElementById('v-code')?.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
  })

  // ── Google OAuth ──
  document.getElementById('btn-google')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    document.getElementById('google-btn-text').textContent = 'Menghubungkan…'
    try {
      await signInWithGoogle()
      // Halaman akan redirect ke Google, tidak perlu close modal
    } catch (err) {
      toastError(err.message)
      btn.disabled = false
      document.getElementById('google-btn-text').textContent = 'Lanjutkan dengan Google'
    }
  })

  // ── Login ──
  document.getElementById('btn-do-login')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const email = document.getElementById('l-email').value.trim()
    const pass  = document.getElementById('l-pass').value
    if (!email || !pass) { toastError('Isi semua kolom'); return }
    btn.disabled = true; btn.textContent = 'Masuk…'
    try {
      await signIn(email, pass)
      _close()
      toastSuccess('Selamat datang kembali! 👋')
    } catch(err) {
      toastError(err.message)
    } finally {
      btn.disabled = false; btn.textContent = 'Masuk'
    }
  })

  // ── Register → kirim kode verifikasi ──
  document.getElementById('btn-do-register')?.addEventListener('click', async (e) => {
    const btn   = e.currentTarget
    const user  = document.getElementById('r-user').value.trim()
    const email = document.getElementById('r-email').value.trim()
    const pass  = document.getElementById('r-pass').value
    if (!user || !email || !pass) { toastError('Isi semua kolom'); return }
    if (pass.length < 8) { toastError('Password minimal 8 karakter'); return }
    btn.disabled = true; btn.textContent = 'Membuat akun…'
    try {
      await signUp(email, pass, user)
      await sendVerificationCode(email)
      _showVerifyStep(email)
      toastSuccess('Kode verifikasi dikirim! 📬')
    } catch(err) {
      toastError(err.message)
      btn.disabled = false; btn.textContent = 'Buat Akun'
    }
  })

  // ── Verifikasi kode ──
  document.getElementById('btn-do-verify')?.addEventListener('click', async (e) => {
    const btn  = e.currentTarget
    const code = document.getElementById('v-code').value.trim()
    const email = document.getElementById('verify-email-display').textContent
    if (code.length !== 6) { toastError('Kode harus 6 digit'); return }
    btn.disabled = true; btn.textContent = 'Memverifikasi…'
    try {
      await verifyCode(email, code)
      _close()
      toastSuccess('Email terverifikasi! Selamat datang di NovelNest 🎉')
    } catch(err) {
      toastError(err.message)
      document.getElementById('v-code').value = ''
      btn.disabled = false; btn.textContent = 'Verifikasi'
    }
  })
}

function _showVerifyStep(email) {
  // Sembunyikan tabs dan form lain
  document.getElementById('auth-tabs').classList.add('hidden')
  document.getElementById('form-login').classList.add('hidden')
  document.getElementById('form-register').classList.add('hidden')
  document.getElementById('form-verify').classList.remove('hidden')

  // Sembunyikan Google button dan divider
  document.getElementById('btn-google').closest('button').style.display = 'none'
  document.querySelector('.flex.items-center.gap-3.mb-4')?.style && 
    (document.querySelector('.flex.items-center.gap-3.mb-4').style.display = 'none')

  document.getElementById('verify-email-display').textContent = email

  // Tombol resend dengan cooldown 60 detik
  _startResendCooldown()
  document.getElementById('btn-resend')?.addEventListener('click', async () => {
    if (_resendTimer) return
    const resendLabel = document.getElementById('resend-label')
    resendLabel.textContent = 'Mengirim…'
    try {
      await sendVerificationCode(email)
      toastSuccess('Kode baru dikirim!')
      _startResendCooldown()
    } catch(err) {
      toastError(err.message)
      resendLabel.textContent = 'Kirim ulang'
    }
  })
}

function _startResendCooldown() {
  let sisa = 60
  const label = document.getElementById('resend-label')
  if (!label) return
  label.textContent = `Kirim ulang (${sisa}s)`
  _resendTimer = setInterval(() => {
    sisa--
    if (sisa <= 0) {
      clearInterval(_resendTimer)
      _resendTimer = null
      label.textContent = 'Kirim ulang'
    } else {
      label.textContent = `Kirim ulang (${sisa}s)`
    }
  }, 1000)
}

function _switchTab(tab) {
  document.querySelectorAll('.tab[data-tab]').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  )
  document.getElementById('form-login')?.classList.toggle('hidden',    tab !== 'login')
  document.getElementById('form-register')?.classList.toggle('hidden', tab !== 'register')
}
