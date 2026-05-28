import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export function Header() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
        return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    return saved ? JSON.parse(saved) : {};
  });
  const { isLoggedIn, login, logout, user } = useAuth();
  const { language, t } = useLanguage();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const smartlinks = [
    "https://commendtwisted.com/fx46ytf3?key=19c8d09d425cf8b968c8e3b263624f85",
    "https://commendtwisted.com/i53s7a1j?key=c9f99a424b17bd9ca885694265b318e5",
    "https://commendtwisted.com/q61hw05vm?key=5d805d2656d3b5eea34a9aaa1f1f8943"
  ];

  const handleSupportClick = () => {
    const randomLink = smartlinks[Math.floor(Math.random() * smartlinks.length)];
    window.open(randomLink, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="bg-blue-600 dark:bg-blue-800 border-b border-blue-700 dark:border-blue-900 shadow-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                novelora
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-1 items-center">
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-blue-50 hover:bg-blue-700 dark:hover:bg-blue-900 transition-colors">
                  {t("nav.novel")} <ion-icon name="chevron-down-outline"></ion-icon>
                </button>
                <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1b26] rounded-md shadow-lg border border-gray-100 dark:border-gray-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    {["Light Novel", "Web Novel"].map(item => (
                      <Link key={item} to={`/search?type=${encodeURIComponent(item)}&autoSearch=true`} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                to="/genre"
                className="px-3 py-2 rounded-md text-sm font-medium text-blue-50 hover:bg-blue-700 dark:hover:bg-blue-900 transition-colors"
              >
                {t("nav.genre")}
              </Link>
              <Link
                to="/tags"
                className="px-3 py-2 rounded-md text-sm font-medium text-blue-50 hover:bg-blue-700 dark:hover:bg-blue-900 transition-colors"
              >
                {t("nav.tags")}
              </Link>
              <Link
                to="/request"
                className="px-3 py-2 rounded-md text-sm font-medium text-blue-50 hover:bg-blue-700 dark:hover:bg-blue-900 transition-colors"
                >
                {t("nav.request")}
                </Link>
              <Link
                to="/random"
                className="px-3 py-2 rounded-md text-sm font-medium text-blue-50 hover:bg-blue-700 dark:hover:bg-blue-900 transition-colors"
              >
                {t("nav.random")}
              </Link>
              <button
                onClick={handleSupportClick}
                className="px-3 py-2 rounded-md text-sm font-bold text-amber-300 hover:bg-blue-700 dark:hover:bg-blue-900 hover:text-amber-100 transition-colors flex items-center gap-1"
              >
                <ion-icon name="heart"></ion-icon>
                Support Us
              </button>
            </nav>

            {/* Search and Theme */}
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder={t("search.placeholder")}
                  className="w-48 lg:w-64 pl-4 pr-16 py-1.5 rounded-full border border-blue-500 dark:border-blue-700 bg-blue-700 dark:bg-blue-900 text-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-blue-300">
                  <button className="p-1 hover:text-white transition-colors" title="Search">
                    <ion-icon name="search-outline"></ion-icon>
                  </button>
                  <Link to="/search" className="p-1 hover:text-white transition-colors" title="Advanced Search">
                    <ion-icon name="options-outline"></ion-icon>
                  </Link>
                </div>
              </div>
              
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-700 dark:bg-blue-900 text-white hover:bg-blue-800 dark:hover:bg-blue-950 transition-colors border border-blue-500 dark:border-blue-700 shrink-0"
                aria-label="Toggle theme"
                title={isDark ? t("theme.light") : t("theme.dark")}
              >
                {isDark ? <ion-icon name="sunny-outline"></ion-icon> : <ion-icon name="moon-outline"></ion-icon>}
              </button>

              {/* Authentication */}
              <div className="ml-2 flex items-center gap-3">
                {!isLoggedIn ? (
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-700 dark:bg-blue-900 text-white hover:bg-blue-800 dark:hover:bg-blue-950 transition-colors border border-blue-500 dark:border-blue-700 shrink-0"
                      aria-label="Account Menu"
                    >
                      <ion-icon name="person-outline"></ion-icon>
                    </button>
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1b21] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                        <>
                          <Link 
                            to="/login"
                            onClick={() => setShowProfileDropdown(false)}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            {t("auth.login")}
                          </Link>
                          <Link 
                            to="/register"
                            onClick={() => setShowProfileDropdown(false)}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            {t("auth.register")}
                          </Link>
                        </>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-full bg-blue-700 dark:bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 dark:hover:bg-blue-950 transition-colors border border-blue-500 dark:border-blue-700 relative shrink-0" aria-label="Notifications">
                      <ion-icon name="notifications-outline" style={{ fontSize: '18px' }}></ion-icon>
                    </button>
                    
                    <div className="relative" ref={dropdownRef}>
                      <button 
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-white transition-colors focus:outline-none flex items-center justify-center bg-gray-200 dark:bg-gray-700"
                      >
                         <img src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Ariez"} alt="Profile" className="w-full h-full object-cover" />
                      </button>
                      
                      {showProfileDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1b21] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                          <>
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                              <p className="text-base font-medium text-gray-900 dark:text-white">{user?.name}</p>
                            </div>
                            <div className="pt-2">
                              {(user?.role === "admin" || user?.role === "owner") && (
                                <Link 
                                  to="/control-panel" 
                                  onClick={() => setShowProfileDropdown(false)}
                                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  {t("profile.controlPanel")}
                                </Link>
                              )}
                              <Link 
                                to="/profile" 
                                onClick={() => setShowProfileDropdown(false)}
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                {t("profile.myProfile")}
                              </Link>
                              <button 
                                onClick={() => {
                                  logout();
                                  setShowProfileDropdown(false);
                                }} 
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                {t("profile.logout")}
                              </button>
                            </div>
                          </>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden p-1.5 ml-1 text-white hover:text-blue-200 focus:outline-none transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <ion-icon name="close-outline" style={{ fontSize: '24px' }}></ion-icon> : <ion-icon name="menu-outline" style={{ fontSize: '24px' }}></ion-icon>}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#1a1b26] border-b border-gray-100 dark:border-gray-800 absolute top-full left-0 w-full z-40 shadow-lg animate-in slide-in-from-top-2">
            <div className="px-4 pt-3 pb-4 space-y-1">
              <div className="mb-4 relative px-1">
                <input
                type="text"
                placeholder="Search novels..."
                className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                <button className="p-1 hover:text-blue-600 transition-colors" title="Search">
                  <ion-icon name="search-outline"></ion-icon>
                </button>
                <Link to="/search" onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:text-blue-600 transition-colors" title="Advanced Search">
                  <ion-icon name="options-outline"></ion-icon>
                </Link>
              </div>
            </div>
            
            <div className="space-y-1 px-1">
              {["Light Novel", "Web Novel"].map(item => (
                <Link 
                  key={item} 
                  to={`/search?type=${encodeURIComponent(item)}&autoSearch=true`} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {item}
                </Link>
              ))}
              {["Genre", "Tags", "Request"].map((item) => (
                 <Link
                   key={item}
                   to={`/${item.toLowerCase()}`}
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="block px-3 py-2.5 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                 >
                   {item}
                 </Link>
              ))}
              <Link
                to="/random"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                Random Novel
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSupportClick();
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <ion-icon name="heart"></ion-icon>
                Support Us
              </button>
            </div>
          </div>
        </div>
      )}
      </header>
      

    </>
  );
}
