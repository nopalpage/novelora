import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  id: {
    "nav.novel": "Novel",
    "nav.genre": "Genre",
    "nav.tags": "Tags",
    "nav.request": "Request",
    "nav.random": "Random",
    "nav.settings": "Settings",
    "search.placeholder": "Cari novels, authors...",
    "search.advanced": "Advanced",
    "search.search": "Search",
    "search.title": "Title",
    "search.author": "Author",
    "search.year": "Year",
    "search.statusAndType": "Status & Type",
    "search.status": "Status",
    "search.type": "Type",
    "search.country": "Country",
    "search.sortingOptions": "Sorting Options",
    "search.orderBy": "Order by",
    "search.genres": "Genres",
    "search.tags": "Tags",
    "search.searchGenres": "Search genres...",
    "search.noGenres": "No genres found matching \"{query}\"",
    "search.clearAll": "Clear All",
    "search.searchTags": "Search tags...",
    "search.noTags": "No tags found matching \"{query}\"",
    "search.clearAllFilters": "Clear All Filters",
    "search.searching": "Mencari...",
    "search.searchResults": "Hasil Pencarian",
    "search.all": "All",
    "search.ongoing": "Ongoing",
    "search.completed": "Completed",
    "search.latestUpdate": "Latest Update",
    "search.latestAdded": "Latest Added",
    "search.popular": "Popular",
    "search.rating": "Rating",
    "theme.dark": "Dark Mode",
    "theme.light": "Light Mode",
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.welcomeBack": "Selamat Datang Kembali",
    "auth.loginDesc": "Masuk untuk mengakses history bacaan, bookmarks, dan preferences kamu.",
    "auth.email": "Email Address",
    "auth.emailPlaceholder": "emailmu@example.com",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "••••••••",
    "auth.forgotPassword": "Lupa Password?",
    "auth.noAccount": "Tidak punya Akun?",
    "auth.signUp": "Daftar",
    "auth.signIn": "Masuk",
    "auth.createAccount": "Buat Akun",
    "auth.registerDesc": "Masuk untuk menyimpan bookmarks, meninggalkan komentar, dan menelusuri novel - novel baru.",
    "auth.fullName": "Nama Lengkap",
    "auth.namePlaceholder": "Nama kamu",
    "auth.backToSignIn": "Kembali ke Login",
    "auth.resetPassword": "Reset Password",
    "auth.resetDesc": "Masukkan emailmu dan sebuah link akan dikirimkan untuk meresest passwordmu.",
    "auth.checkEmail": "Cek emailmu",
    "auth.checkEmailDesc": "Sebuah link untuk mereset password telah dikirim ke {email}. Tolong periksa inbox kamu.",
    "auth.sendResetLink": "Kirim Link reset",
    "profile.myProfile": "Profil saya",
    "profile.adminPanel": "Admin Panel",
    "profile.ownerPanel": "Owner Panel",
    "profile.controlPanel": "Control Panel",
    "profile.logout": "Logout",
    "home.popular": "Popular Novels",
    "home.popularHeading": "Popular",
    "home.latest": "Latest",
    "home.update": "Updates",
    "home.tab1": "Hari ini",
    "home.tab2": "Minggu ini",
    "home.tab3": "Bulan ini",
    "home.tab4": "Sepanjang Waktu",
    "home.viewAll": "View All",
    "home.chapters": "Bab",
    "detail.chapters": "Chapters",
    "detail.bookmark": "Tambah ke Bookmark",
    "detail.unbookmark": "Hapus Bookmark",
    "detail.latestUpdated": "Latest Updated",
    "detail.chaptersCount": "{count} Chapters",
    "detail.relatedWorks": "Related Works",
    "detail.alternative": "Alternatif:",
    "detail.langId": "Bahasa Indonesia",
    "detail.humanTranslation": "Human Translation (Diterjemahin Manusia)",
    "detail.machineTranslation": "Machine Translation (Diterjemahin oleh Mesin)",
    "detail.noMoreChapters": "No more chapters",
    "comments.title": "Komentar",
    "comments.sortNewest": "Terbaru",
    "comments.sortOldest": "Terlama",
    "comments.sortMostLiked": "Paling Banyak Disukai",
    "comments.sortLeastLiked": "Paling Sedikit Disukai",
    "comments.placeholder": "Ketik komentarmu di sini...",
    "comments.post": "Kirim",
    "comments.join": "signup untuk komentar",
    "comments.needLogin": "masuk dulu untuk komentar.",
    "comments.login": "Masuk untuk komentar",
    "admin.confirmRole": "Confirm Role Change",
    "admin.confirmRoleDesc": "kamu yakin ingin mengubah role user ini ke {role}?",
    "admin.cancel": "Cancel",
    "admin.confirm": "Confirm",
    "admin.activeUsers": "Active Users",
    "admin.bannedUsers": "Banned Users",
    "admin.banUser": "Ban User",
    "admin.unbanUser": "Unban User",
    "admin.makeAdmin": "Make Admin",
    "admin.demote": "Demote to User",
    "chapter.next": "Chapter Selanjutnya",
    "chapter.prev": "Chapter Sebelumnya",
    "chapter.settings": "Settings",
    "chapter.comments": "Komentar",
    "chapter.index": "Index",
    "chapter.fontSize": "ukuran tulisan",
    "chapter.theAwakening": "Kebangkitan",
    "chapter.notFound": "Chapter tidak ditemukan",
    "chapter.notFoundDesc": "chapter yang kamu cari belum ada.",
    "chapter.backToHome": "Balik ke Home",
    "sidebar.chat": "Chat",
    "sidebar.lastRead": "Terakhir dibaca",
    "sidebar.popular": "Popular Now",
    "chat.placeholder": "Ketik pesanmu disini...",
    "chat.words": "Words",
    "chat.send": "Kirim",
    "chat.join": "",
    "chat.login": "Login"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('novelora_lang') as Language;
    return saved || 'id';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('novelora_lang', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
