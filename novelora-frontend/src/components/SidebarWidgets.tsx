import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronDown, ChevronUp } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";
import { Novel } from "../data";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export function SidebarChat() {
  const { t } = useLanguage();
  const { isLoggedIn, user, login } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const socket = io({
      timeout: 5000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on("init_messages", (initialMessages: ChatMessage[]) => {
      setMessages(initialMessages);
    });

    socket.on("new_message", (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isMinimized]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      userId: user.id || user.email,
      userName: user.name,
      userAvatar: user.avatar,
      text: newMessage,
    });

    setNewMessage("");
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    let day = date.getDate().toString().padStart(2, '0');
    let monthIndex = date.getMonth();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${months[monthIndex]} ${year} ${hours}:${minutes}`;
  };

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded flex flex-col overflow-hidden text-gray-900 dark:text-[#e4e6eb] border border-gray-200 dark:border-[#2d2d2d]">
      <div 
        className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d] flex items-center justify-between cursor-pointer select-none bg-gray-50 dark:bg-[#242424]"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-wide uppercase">{t("sidebar.chat")}</span>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto p-4 space-y-5 bg-white dark:bg-[#1a1a1a] custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p className="text-sm">Belum ada pesan apapun.</p>
                <p className="text-xs">mungkin sudah dihapus atau direset</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <Link to={`/profile/${msg.userId}`} className="shrink-0 pt-0.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-[#242526]">
                      <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex justify-between items-start mb-0.5 gap-2">
                      <Link to={`/profile/${msg.userId}`} className="font-semibold text-[13px] text-gray-900 dark:text-white hover:underline truncate">
                        {msg.userName}
                      </Link>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 mt-0.5">{formatTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[#2d2d2d] relative">
            {isLoggedIn ? (
              <form onSubmit={handleSendMessage} className="relative">
                <div className="w-full bg-gray-100 dark:bg-[#111111] border border-gray-300 dark:border-[#333] rounded focus-within:border-gray-400 dark:focus-within:border-[#444] transition-colors flex flex-col">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      const val = e.target.value;
                      const wordsCount = val.split(/\s+/).filter(w => w.length > 0).length;
                      if (wordsCount <= 120 || val.length < newMessage.length) {
                        setNewMessage(val);
                      }
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    placeholder={t("chat.placeholder")}
                    className="w-full bg-transparent text-gray-900 dark:text-gray-200 text-sm px-3 py-3 focus:outline-none resize-none overflow-y-auto custom-scrollbar"
                    style={{ minHeight: '60px', height: '60px' }}
                  />
                  
                  <div className="flex items-center justify-between px-3 pb-2 pt-1">
                    <div className="flex items-center gap-2 text-gray-500">
                       <button type="button" onClick={() => alert("GIF feature coming soon!")} className="text-[10px] border border-gray-400 dark:border-gray-600 rounded px-1 text-gray-500 dark:text-gray-400 font-bold tracking-widest cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors">GIF</button>
                       <button type="button" onClick={() => alert("Image upload feature coming soon!")} className="p-0.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></button>
                       <div className="relative group">
                         <button type="button" className="p-0.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
                         </button>
                         <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 gap-1 w-[180px] flex-wrap z-10">
                            {["😀","😂","😍","😭","🙏","👍","🔥","✨","👀","💔"].map(emoji => (
                              <button key={emoji} type="button" onClick={() => setNewMessage(prev => prev + emoji)} className="text-lg hover:scale-110 transition-transform px-1.5 py-0.5">
                                {emoji}
                              </button>
                            ))}
                         </div>
                       </div>
                       <button type="button" onClick={() => alert("Settings coming soon!")} className="p-0.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg></button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-gray-500 font-medium">
                        {(() => {
                          const words = newMessage.split(/\s+/).filter(w => w.length > 0).length;
                          return (
                            <>
                              <span className={words >= 120 ? "text-red-500" : "text-gray-700 dark:text-gray-300"}>{words}</span>
                              <span className="text-gray-400"> / 120</span>
                            </>
                          );
                        })()}
                      </div>
                      <button 
                        type="submit"
                        disabled={!newMessage.trim() || newMessage.split(/\s+/).filter(w => w.length > 0).length > 120}
                        className="px-4 py-1.5 bg-[#b53a3a] hover:bg-[#a03030] disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                      >
                        {t("chat.send")}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-gray-100 dark:bg-[#111111] rounded p-4 flex flex-col items-center justify-center text-center opacity-90 border border-gray-300 dark:border-[#333]">
                 <Link 
                  to="/login"
                  className="px-5 py-1.5 bg-[#b53a3a] hover:bg-[#a03030] text-white text-xs font-semibold rounded transition-colors"
                 >
                   Login
                 </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


export function SidebarLastRead() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [lastRead, setLastRead] = useState<Novel[]>([]);
  
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    api.getNovels({ sort: 'popular', limit: 4 }).then(res => {
      if (isMounted) {
        setLastRead(res);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoading(false);
    });
    
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded flex flex-col overflow-hidden text-gray-900 dark:text-[#e4e6eb] border border-gray-200 dark:border-[#2d2d2d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d] bg-gray-50 dark:bg-[#242424]">
        <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-wide uppercase">{t("sidebar.lastRead")}</span>
      </div>
      <div className="p-0 max-h-[400px] overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1a1a]">
        {isLoading ? (
           Array.from({ length: 4 }).map((_, idx) => (
             <div key={idx} className={`flex gap-3 group p-4 ${idx !== 3 ? 'border-b border-gray-200 dark:border-[#2d2d2d]' : ''}`}>
               <div className="w-[52px] h-[72px] shrink-0 rounded overflow-hidden shadow-sm shimmer-wrapper"></div>
               <div className="min-w-0 flex flex-col justify-start gap-2 py-0.5 w-full">
                 <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded shimmer-wrapper"></div>
                 <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded shimmer-wrapper"></div>
                 <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800 rounded mt-1 shimmer-wrapper"></div>
               </div>
             </div>
           ))
        ) : lastRead.map((novel, idx) => {
          return (
          <Link key={novel.id} to={`/novel/${novel.id}`} className={`flex gap-3 group p-4 ${idx !== lastRead.length - 1 ? 'border-b border-gray-200 dark:border-[#2d2d2d]' : ''}`}>
            <div className="w-[52px] h-[72px] shrink-0 rounded overflow-hidden shadow-sm relative">
              <img src={novel.image} alt={novel.title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/novelora-fallback.svg"; }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="min-w-0 flex flex-col justify-start gap-1 py-0.5">
              <h4 className="text-[13px] text-gray-900 dark:text-white font-medium line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {novel.title}
              </h4>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Chapter {novel.latestChapter || '01'}</span>
            </div>
          </Link>
        )})}
      </div>
    </div>
  );
}
