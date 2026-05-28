import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// Get encryption key from environment or use a fallback for development
const ENCRYPTION_KEY = import.meta.env.VITE_STORAGE_ENCRYPTION_KEY || 'novelora-secure-fallback-key-313';

// Helper to encrypt and decrypt
const encrypt = (data: string) => CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
const decrypt = (data: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return null;
  }
};

// Custom storage adapter that satisfies the "Remember me" and encryption requirements
export const SecureStorage = {
  getItem: (key: string): string | null => {
    // 1. Try to get from sessionStorage (fast, plaintext but isolated to tab)
    let val = sessionStorage.getItem(key);
    if (val) return val;
    
    // 2. If not found, check localStorage for "Remember me" persisted data
    const encryptedVal = localStorage.getItem(key);
    if (encryptedVal) {
      const decrypted = decrypt(encryptedVal);
      if (decrypted) {
        // Hydrate sessionStorage for faster subsequent access in this tab
        sessionStorage.setItem(key, decrypted);
        return decrypted;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    // Always store in sessionStorage so it works across page reloads in the current tab
    sessionStorage.setItem(key, value);
    
    // If the user checked "Remember me", persist to localStorage but encrypted
    if (localStorage.getItem('rememberMe') === 'true') {
      localStorage.setItem(key, encrypt(value));
    } else {
      // Ensure it's not in localStorage if they didn't check "Remember me"
      localStorage.removeItem(key);
    }
  },
  removeItem: (key: string): void => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
