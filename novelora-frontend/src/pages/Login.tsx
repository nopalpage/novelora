import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Mail, Lock, LogIn, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    // Set the preference so the custom storage adapter knows what to do
    localStorage.setItem("rememberMe", rememberMe ? "true" : "false");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4 min-h-[calc(100vh-140px)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#1a1b26] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 sm:p-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
            <BookOpen size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("auth.welcomeBack") || "Welcome Back"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {t("auth.loginDesc") || "Sign in to continue"}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("auth.email") || "Email"}</label>
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
                placeholder={t("auth.emailPlaceholder") || "Email"}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("auth.password") || "Password"}</label>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                {t("auth.forgotPassword") || "Forgot password?"}
              </Link>
            </div>
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
                placeholder={t("auth.passwordPlaceholder") || "Password"}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email || !password}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800/50 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                {t("auth.signIn") || "Sign In"}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {t("auth.noAccount") || "No account?"} <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors">
            {t("auth.signUp") || "Sign Up"} <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
