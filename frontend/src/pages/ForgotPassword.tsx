import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4 min-h-[calc(100vh-140px)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-[#1a1b26] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 sm:p-10 relative overflow-hidden"
      >
        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center py-4"
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("auth.checkEmail")}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm px-4">
              {t("auth.checkEmailDesc").replace('{email}', email)}
            </p>
            <Link 
              to="/login"
              className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t("auth.backToSignIn")}
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                <KeyRound size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">{t("auth.resetPassword")}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                {t("auth.resetDesc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <button 
                type="submit" 
                disabled={isLoading || !email}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800/50 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t("auth.sendResetLink")
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
              <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors">
                <ArrowLeft size={16} /> {t("auth.backToSignIn")}
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}
