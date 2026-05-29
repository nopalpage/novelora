import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Lock, ChevronDown, BookPlus } from "lucide-react";
import { motion } from "motion/react";
import { AdsterraBanner } from "../components/AdsterraAd";

type RequestComment = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timeAgo: string;
  content: string;
  upvotes: number;
  downvotes: number;
  replies?: RequestComment[];
};

export function Request() {
  const { isLoggedIn, user } = useAuth();
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [newRequest, setNewRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim()) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      const newComment: RequestComment = {
        id: Date.now().toString(),
        userId: user?.id || "me",
        userName: user?.name || "Ariez Cytz",
        userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "Ariez"}`,
        timeAgo: "Just now",
        content: newRequest,
        upvotes: 0,
        downvotes: 0,
      };
      setComments([newComment, ...comments]);
      setNewRequest("");
      setIsSubmitting(false);
    }, 800);
  };

  const CommentNode = ({ comment, isReply = false }: { comment: RequestComment, isReply?: boolean }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${isReply ? 'mt-4 ml-8 sm:ml-12' : 'mt-6'}`}
    >
      <Link to={`/profile/${comment.userId}`} className="shrink-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer hover:border-blue-400 transition-colors">
           <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/profile/${comment.userId}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
              {comment.userName}
            </Link>
            {isReply && <span className="text-xs text-gray-500 dark:text-gray-400">Membalas <span className="italic text-blue-600 dark:text-blue-400">Anomali</span></span>}
            <div className="flex items-center gap-1 text-xs text-gray-400">
               <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 hidden sm:inline-block"></span>
               {comment.timeAgo}
            </div>
          </div>
        </div>
        <div className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
          {comment.content}
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
           <div className="flex items-center gap-1 sm:gap-2">
             <button className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center transition-colors">
                <span className="text-lg leading-none transform -translate-y-px">+</span>
             </button>
             <span className={`min-w-[1ch] text-center ${comment.upvotes < 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{comment.upvotes}</span>
             <button className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center transition-colors">
                <span className="text-lg leading-none transform -translate-y-px">-</span>
             </button>
           </div>
           <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
             <ion-icon name="arrow-undo-outline" style={{ fontSize: '14px' }}></ion-icon> Balas
           </button>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="border-l-2 border-gray-100 dark:border-gray-800/80 pl-4 mt-3">
            {comment.replies.map(reply => (
              <CommentNode key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8 border-b-2 border-gray-100 dark:border-gray-800 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
          <BookPlus className="text-blue-600" />
          Request Novel
        </h2>
      </div>

      <div className="w-full">
        {/* Comment Input Section */}
        <div className="flex gap-4 mb-10">
          <div className="shrink-0 hidden sm:block">
             <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-2 ring-gray-100 dark:ring-gray-800">
               <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.name || "Guest"}`} alt="Avatar" className="w-full h-full object-cover" />
             </div>
          </div>
          <div className="flex-grow min-w-0">
            {!isLoggedIn ? (
               <div className="w-full py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 flex flex-col items-center justify-center text-center px-4">
                 <div className="w-14 h-14 bg-white dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                   <Lock size={24} />
                 </div>
                 <h4 className="text-gray-900 dark:text-white font-medium mb-2">Harus Login</h4>
                 <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm max-w-sm">kamu harus login terlebih dahulu untuk bisa mengirimkan request sebuah novel.</p>
                 <Link to="/login" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                   Login dulu untuk request
                 </Link>
               </div>
            ) : (
              <form onSubmit={handleSubmit} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors">
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-bold text-sm"></i></button>
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-italic text-sm"></i></button>
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-underline text-sm"></i></button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-list-ul text-sm"></i></button>
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-list-ol text-sm"></i></button>
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-quote-right text-sm"></i></button>
                    <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"><i className="fa-solid fa-link text-sm"></i></button>
                </div>
                <textarea
                  value={newRequest}
                  onChange={(e) => setNewRequest(e.target.value)}
                  placeholder="Format: [Judul] - [Penulis] - [Link Raw jika ada]..."
                  className="w-full p-4 min-h-[120px] outline-none resize-y bg-white dark:bg-[#1a1b26] text-gray-800 dark:text-gray-200 text-sm placeholder-gray-400"
                />
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 font-medium">
                    {newRequest.length} karakter
                  </span>
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1.5 transition-colors">
                      Pratinjau
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting || !newRequest.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <ion-icon name="paper-plane" style={{ fontSize: '16px' }}></ion-icon> Kirim Permintaan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>



        {/* Comments Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-100 dark:border-gray-800 pb-3 mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Permintaan Terbaru
            </h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {comments.length}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
             <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
               Terbaru <ChevronDown size={14} />
             </button>
          </div>
        </div>

        {/* Comment List */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <BookPlus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada permintaan.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Jadilah yang pertama melakukan request novel!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="relative">
                {/* Vertical line connecting replies */}
                {comment.replies && comment.replies.length > 0 && (
                   <div className="absolute left-[23px] sm:left-[27px] top-[50px] bottom-6 w-px bg-gray-200 dark:bg-gray-800/80"></div>
                )}
                <CommentNode comment={comment} />
                
                <div className="w-full border-b border-dashed border-gray-200 dark:border-gray-800/60 mt-6 sm:ml-[64px]" style={{width: 'calc(100% - 64px)'}}></div>
              </div>
            ))
          )}
        </div>


      </div>
    </main>
  );
}
