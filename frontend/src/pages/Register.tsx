import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Mail, Lock, User, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const siteSettings = JSON.parse(localStorage.getItem("novelora_settings") || '{"allowRegistration":"on"}');
  const isRegistrationDisabled = siteSettings.allowRegistration === "off";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistrationDisabled) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      login();
      navigate("/");
    }, 1500);
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4 min-h-[calc(100vh-140px)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#1a1b26] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 sm:p-10"
      >
        {isRegistrationDisabled ? (
           <div className="text-center py-8">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <Lock size={32} />
             </div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Disabled</h2>
             <p className="text-gray-500 dark:text-gray-400 mb-8">
               New user registration is currently disabled by the administrator. Please try again later.
             </p>
             <Link to="/login" className="inline-flex items-center justify-center w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
               Return to Login
             </Link>
           </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("auth.createAccount")}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                {t("auth.registerDesc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("auth.fullName")}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-400"
                    placeholder={t("auth.namePlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("auth.email")}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-400"
                    placeholder={t("auth.emailPlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("auth.password")}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-gray-400"
                    placeholder={t("auth.passwordPlaceholder")}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || !email || !password || !name}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800/50 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    {t("auth.signUp")}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors font-medium">
                <ArrowLeft size={16} /> {t("auth.backToSignIn")}
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}
