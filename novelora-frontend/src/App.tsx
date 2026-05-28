import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { Genre } from "./pages/Genre";
import { Tags } from "./pages/Tags";
import { Request } from "./pages/Request";
import { Category } from "./pages/Category";
import { NovelDetail } from "./pages/NovelDetail";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ControlPanel } from "./pages/ControlPanel";
import { NotFound } from "./pages/NotFound";
import { Chapter } from "./pages/Chapter";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AdsterraBackground, AdsterraBanner } from "./components/AdsterraAd";
import { api } from "./lib/api";
import { useEffect } from "react";

function RandomRedirect() {
  const navigate = useNavigate();
  
  useEffect(() => {
    let isMounted = true;
    api.getNovels({ limit: 50 }).then(novels => {
      if (isMounted && novels.length > 0) {
        const randomId = novels[Math.floor(Math.random() * novels.length)].id;
        navigate(`/novel/${randomId}`, { replace: true });
      } else if (isMounted) {
        navigate('/', { replace: true });
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) navigate('/', { replace: true });
    });
    
    return () => { isMounted = false; };
  }, [navigate]);
  
  return (
    <div className="flex-grow flex items-center justify-center">
      <div className="text-gray-500 animate-pulse">Finding a random novel...</div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const saved = localStorage.getItem("novelora_settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.siteTitle) {
          document.title = settings.siteTitle;
        }
      } catch (e) {}
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-transparent relative font-sans flex flex-col transition-colors duration-300">
          {/* Actual background layer */}
          <div className="fixed inset-0 bg-gray-50 dark:bg-[#121213] z-[-2]"></div>
          
          <AdsterraBackground />
          
          <Header />
          
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <AdsterraBanner width={728} height={90} />
          </div>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/novel/:novelId" element={<NovelDetail />} />
            <Route path="/novel/:novelId/chapter/:chapterId" element={<Chapter />} />
            <Route path="/category/:categoryId" element={<Category />} />
            <Route path="/genre" element={<Genre />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/request" element={<Request />} />
            <Route path="/random" element={<RandomRedirect />} />
            <Route path="/control-panel" element={<ControlPanel />} />
            <Route path="/admin" element={<Navigate to="/control-panel" replace />} />
            <Route path="/owner" element={<Navigate to="/control-panel" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

