import { User, Settings, Bookmark, LogOut, ChevronRight, Share2, Clock, MessageSquare, Trash2, Camera, Edit2, CheckCircle2 } from "lucide-react";
import { Novel } from "../data";
import { PopularNovelSkeleton } from "../components/NovelCards";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

export function Profile() {
  const { userId } = useParams();
  const { user, isLoggedIn, logout } = useAuth();
  
  // If we have a userId in the URL and it's not the currently logged in user's ID
  // we are viewing someone else's profile. (Since we don't have real user IDs, we'll assume any userId means public profile unless it matches a specific logged-in ID)
  // For demonstration, we'll pretend the logged-in user has ID 'me'.
  const isOwnProfile = !userId || userId === (user?.id || 'me');
  
  const [activeTab, setActiveTab] = useState<"novels" | "history" | "settings" | "comments">("novels");
  const [bookmarkedNovels, setBookmarkedNovels] = useState<Novel[]>([]);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings Form State
  const [displayName, setDisplayName] = useState(user?.name || "Ariez Cytz");
  const [bio, setBio] = useState("Avid reader of fantasy and sci-fi novels. Always looking for the next great adventure!");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    // If viewing someone else's profile, we could load their public bookmarks here.
    // For now, we'll just mock it or show own bookmarks if viewing own profile.
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (isOwnProfile) {
          const savedBookmarks = localStorage.getItem("bookmarks");
          if (savedBookmarks) {
            const bookmarkIds = JSON.parse(savedBookmarks);
            if (Array.isArray(bookmarkIds) && bookmarkIds.length > 0) {
              const novelsPromises = bookmarkIds.map((id: string) => api.getNovelById(id));
              const novelsData = await Promise.all(novelsPromises);
              const validNovels = novelsData.filter(Boolean) as Novel[];
              
              const unique = Array.from(new Map(validNovels.map((item: Novel) => [item.id, item])).values()) as Novel[];
              setBookmarkedNovels(unique);
            }
          }
          
          // Load reading history
          const historyRaw = localStorage.getItem("readingHistory");
          if (historyRaw) {
            setReadingHistory(JSON.parse(historyRaw));
          }
          
          // Fetch user comments
          const comments = await api.getUserComments(user?.id || userId || 'me');
          setUserComments(comments);
        } else {
          // Fetch some popular novels for public mock profile
          const publicBookmarks = await api.getNovels({ sort: 'popular', limit: 3 });
          setBookmarkedNovels(publicBookmarks);
          
          const comments = await api.getUserComments(userId || 'me');
          setUserComments(comments);
        }
      } catch (e) {
        console.error("Failed to parse data", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    if (isOwnProfile) {
      window.addEventListener("storage", loadData);
      return () => window.removeEventListener("storage", loadData);
    }
  }, [isOwnProfile]);

  const profileName = isOwnProfile ? displayName : `User ${userId}`;
  const profileEmail = isOwnProfile ? (user?.email || "ariez@example.com") : "";
  const avatarSeed = isOwnProfile ? displayName.replace(/\s+/g, '') : (userId || "user");

  const handleRemoveBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newBookmarks = bookmarkedNovels.filter(n => n.id !== id);
    setBookmarkedNovels(newBookmarks);
    localStorage.setItem("bookmarks", JSON.stringify(newBookmarks.map(n => n.id)));
  };

  const handleClearHistory = () => {
    if(confirm("Are you sure you want to clear your entire reading history?")) {
      setReadingHistory([]);
      localStorage.removeItem("readingHistory");
    }
  };

  const handleDeleteComment = (id: number) => {
    if(confirm("Delete this comment?")) {
      setUserComments(userComments.filter(c => c.id !== id));
    }
  };

  const handleSaveChanges = () => {
    // In a real app, send data to the backend
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10 transition-colors">
      
      {/* Banner Area */}
      <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 relative bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm border border-gray-100 dark:border-gray-800">
         <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Banner" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
         {isOwnProfile && (
           <button className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-white/20">
             <Camera size={16} /> Edit Cover
           </button>
         )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative -mt-24 md:-mt-32">
        {/* Sidebar */}
        <div className="w-full md:w-72 shrink-0 relative z-20">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-lg border border-gray-100 dark:border-gray-800/50 p-6 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-[#1a1b26] shadow-lg bg-gray-200 dark:bg-gray-700">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=b6e3f4`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-colors border-2 border-white dark:border-[#1a1b26]">
                  <Edit2 size={14} />
                </button>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">{profileName}</h2>
            {isOwnProfile && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate max-w-full">{profileEmail}</p>}
            
            <div className="w-full px-4 mb-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-3">
                "{bio}"
              </p>
            </div>

            <div className="flex gap-2 sm:gap-4 mb-6 w-full justify-center text-center">
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 py-2 rounded-lg">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{bookmarkedNovels.length}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Bookmarks</p>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 py-2 rounded-lg">
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{readingHistory.length}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">History</p>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 py-2 rounded-lg">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{userComments.length}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">Comments</p>
              </div>
            </div>

            <div className="w-full flex-col space-y-2 mt-2">
              <button 
                onClick={() => setActiveTab("novels")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium border ${
                  activeTab === "novels" 
                    ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 shadow-sm" 
                    : "text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bookmark size={18} className={activeTab === "novels" ? "fill-current opacity-20" : ""} />
                  {isOwnProfile ? "My Bookmarks" : "Public Bookmarks"}
                </div>
                <ChevronRight size={16} className={`transition-transform ${activeTab === "novels" ? "translate-x-1" : "opacity-50"}`} />
              </button>
              
              <button 
                onClick={() => setActiveTab("comments")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium border ${
                  activeTab === "comments" 
                    ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 shadow-sm" 
                    : "text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className={activeTab === "comments" ? "fill-current opacity-20" : ""} />
                  {isOwnProfile ? "My Comments" : "Public Comments"}
                </div>
                <ChevronRight size={16} className={`transition-transform ${activeTab === "comments" ? "translate-x-1" : "opacity-50"}`} />
              </button>
              
              {isOwnProfile && (
                <>
                  <button 
                    onClick={() => setActiveTab("history")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium border ${
                      activeTab === "history" 
                        ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 shadow-sm" 
                        : "text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={18} className={activeTab === "history" ? "fill-current opacity-20" : ""} />
                      Reading History
                    </div>
                    <ChevronRight size={16} className={`transition-transform ${activeTab === "history" ? "translate-x-1" : "opacity-50"}`} />
                  </button>
                  
                  <div className="h-px w-full bg-gray-100 dark:bg-gray-800 my-2"></div>

                  <button 
                    onClick={() => setActiveTab("settings")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium border ${
                      activeTab === "settings" 
                        ? "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-600 shadow-sm" 
                        : "text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={18} className={activeTab === "settings" ? "animate-spin-slow" : ""} />
                      Account Settings
                    </div>
                    <ChevronRight size={16} className={`transition-transform ${activeTab === "settings" ? "translate-x-1" : "opacity-50"}`} />
                  </button>
                  
                  <button onClick={logout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-100 dark:hover:border-red-900/50 mt-4">
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 mt-8 md:mt-[100px] z-10 w-full sm:min-w-0">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-lg border border-gray-100 dark:border-gray-800/50 p-6 md:p-8 min-h-[600px]">
            {activeTab === "novels" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <Bookmark className="text-blue-500" />
                      {isOwnProfile ? "My Bookmarked Novels" : `${profileName}'s Bookmarks`}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and access your saved stories.</p>
                  </div>
                  {!isOwnProfile && (
                     <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors shadow-sm shrink-0">
                        <Share2 size={16} />
                        Share
                     </button>
                  )}
                </div>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <PopularNovelSkeleton key={i} />
                    ))}
                  </div>
                ) : bookmarkedNovels.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {bookmarkedNovels.map((novel) => (
                      <Link key={novel.id} to={`/novel/${novel.id}`} className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80 hover:-translate-y-1">
                        <div className="aspect-[3/4] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <img 
                            src={novel.image} 
                            alt={novel.title}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/novelora-fallback.svg"; }}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          {isOwnProfile && (
                            <button 
                              onClick={(e) => handleRemoveBookmark(novel.id, e)}
                              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-600 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0"
                              title="Remove Bookmark"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <div className="p-3 sm:p-4 flex-grow flex flex-col justify-between">
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm sm:text-base leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {novel.title}
                          </h3>
                          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-auto pt-2 border-t border-gray-200 dark:border-gray-700/50">
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{novel.latestChapter}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                     <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
                       <Bookmark size={40} className="text-blue-400 dark:text-blue-500" />
                     </div>
                     <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No bookmarks yet</h4>
                     <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">Explore our vast collection of novels and bookmark your favorites to read them later.</p>
                     <Link to="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                        Explore Novels
                     </Link>
                   </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <Clock className="text-amber-500" />
                       Reading History
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Pick up right where you left off.</p>
                  </div>
                  {readingHistory.length > 0 && (
                    <button 
                      onClick={handleClearHistory}
                      className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0"
                    >
                      <Trash2 size={16} />
                      Clear History
                    </button>
                  )}
                </div>
                
                {readingHistory.length > 0 ? (
                  <div className="space-y-4">
                    {readingHistory.map((item, i) => (
                      <Link 
                        key={`${item.novelId}-${i}`} 
                        to={`/novel/${item.novelId}/chapter/${item.chapterId}`}
                        className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                      >
                        <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden shadow-sm hidden sm:block">
                          <img src={item.novelImage} alt={item.novelTitle} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/novelora-fallback.svg"; }} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-2 mb-2">
                             <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                               Last read
                             </span>
                             <span className="text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(item.readAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.novelTitle}</h4>
                          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                            <span className="bg-blue-100 dark:bg-blue-500/10 px-3 py-1 rounded-md">Chapter {item.chapterNum || item.chapterId}</span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center pr-2">
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-md">
                            <ChevronRight size={20} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6">
                      <Clock size={40} className="text-amber-400 dark:text-amber-500" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No history recorded</h4>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">Start reading chapters to build up your history and quickly return to your favorite stories.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <MessageSquare className="text-purple-500" />
                      {isOwnProfile ? "My Comments" : `${profileName}'s Comments`}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Discussions and thoughts on novels.</p>
                  </div>
                </div>
                
                {userComments.length > 0 ? (
                  <div className="space-y-4">
                    {userComments.map((comment) => (
                      <div key={comment.id} className="p-5 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <Link to={`/novel/${comment.novelId}`} className="font-semibold text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                            {comment.novelTitle}
                          </Link>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-gray-700">{comment.date}</span>
                            {isOwnProfile && (
                               <button 
                                 onClick={() => handleDeleteComment(comment.id)}
                                 className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                 <Trash2 size={16} />
                               </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm relative">
                           <span className="absolute top-0 left-4 -translate-y-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-gray-100 dark:border-gray-700/50 rotate-45"></span>
                          "{comment.content}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6">
                      <MessageSquare size={40} className="text-purple-400 dark:text-purple-500" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No comments posted yet</h4>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">Join the discussion by sharing your thoughts on the novels you read.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                   <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       <Settings className="text-gray-500" />
                       Account Settings
                   </h3>
                   <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your personal information and preferences.</p>
                </div>
                
                {showSuccessToast && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} />
                    <p className="font-medium">Changes saved successfully!</p>
                  </div>
                )}
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#1a1b26] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        defaultValue={profileEmail}
                        readOnly
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-2">Email address cannot be changed directly.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio / About Me</label>
                    <textarea 
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell everyone a bit about yourself..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#1a1b26] transition-all resize-none"
                    ></textarea>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Security</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#1a1b26] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#1a1b26] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button className="px-6 py-3 bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveChanges}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
