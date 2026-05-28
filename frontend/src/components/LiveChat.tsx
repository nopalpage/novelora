import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export function LiveChat() {
  const { isLoggedIn, user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSockets
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
        // Prevent duplicate append
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      userId: user.email, // using email as id for simplicity
      userName: user.name,
      userAvatar: user.avatar,
      text: newMessage,
    });

    setNewMessage("");
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-900/20 flex items-center justify-center transition-transform hover:scale-110 z-50 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          aria-label="Open global chat"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[340px] sm:w-[380px] bg-white dark:bg-[#1a1b26] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 flex flex-col h-[550px] max-h-[calc(100vh-48px)] animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-white dark:bg-[#1a1b26] shrink-0 outline-none">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse outline outline-2 outline-green-500/30"></div>
              <h3 className="font-bold text-gray-900 dark:text-white">Global Chat</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50 dark:bg-gray-900/30 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <MessageCircle size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No messages yet.</p>
                <p className="text-xs mt-1">Be the first to say hi!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = isLoggedIn && user && msg.userId === user.email;
                const showAvatar = index === 0 || messages[index - 1].userId !== msg.userId;
                const showHeader = showAvatar;

                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && showAvatar && (
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto shadow-sm self-end bg-gray-200 dark:bg-gray-700 border border-white dark:border-gray-800">
                         <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!isMe && !showAvatar && <div className="w-8 shrink-0"></div>}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                       <div className="flex items-baseline gap-2 mb-1 px-1">
                          {(!isMe) && showHeader && <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{msg.userName}</span>}
                          {showHeader && <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(msg.createdAt)}</span>}
                       </div>
                       
                       <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                         isMe 
                          ? 'bg-blue-600 text-white rounded-br-sm shadow-blue-500/20' 
                          : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                       }`}>
                         {msg.text}
                       </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-[#1a1b26] shrink-0">
            {isLoggedIn ? (
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white rounded-full pl-5 pr-14 py-3 text-sm transition-all outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Send message"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </form>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-gray-100 dark:border-gray-700">
                 <Link 
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shadow-blue-500/20"
                 >
                   Login
                 </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
