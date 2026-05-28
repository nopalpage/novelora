import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MessageSquare, Send, ThumbsUp, MoreVertical, Flag, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
  timestamp: number;
  likes: number;
}

const DUMMY_COMMENTS: Comment[] = [
  {
    id: "c1",
    userId: "u1",
    userName: "Reva_23",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Reva",
    text: "This novel is absolutely amazing! The world building is top notch. Can't wait for the next chapter.",
    createdAt: "2 days ago",
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    likes: 15
  },
  {
    id: "c2",
    userId: "u2",
    userName: "ShadowReader",
    userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow",
    text: "The pacing is a bit slow in the beginning, but it gets really good after chapter 50.",
    createdAt: "1 week ago",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    likes: 8
  }
];

type SortOption = "Newest" | "Oldest" | "Most Liked" | "Least Liked";

export function NovelComments() {
  const { t } = useLanguage();
  const { isLoggedIn, user, login } = useAuth();
  const [comments, setComments] = useState<Comment[]>(DUMMY_COMMENTS);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{ isOpen: boolean; commentId: string | null }>({ isOpen: false, commentId: null });
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModal.commentId) return;
    try {
      await api.submitReport({
        target_id: reportModal.commentId,
        target_type: "comment",
        reason: reportReason,
        details: reportDetails
      }, "dummy-token");
      alert("Report submitted successfully");
      setReportModal({ isOpen: false, commentId: null });
      setReportDetails("");
    } catch (error) {
      console.error(error);
      alert("Failed to submit report");
    }
  };
  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("Newest");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: "currentUser",
      userName: user.name,
      userAvatar: user.avatar,
      text: newComment,
      createdAt: "Just now",
      timestamp: Date.now(),
      likes: 0
    };

    setComments([comment, ...comments]);
    setNewComment("");
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "Newest") return b.timestamp - a.timestamp;
    if (sortBy === "Oldest") return a.timestamp - b.timestamp;
    if (sortBy === "Most Liked") return b.likes - a.likes;
    if (sortBy === "Least Liked") return a.likes - b.likes;
    return 0;
  });

  return (
    <section className="bg-white dark:bg-[#1a1b26] p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-gray-900 dark:text-white" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("comments.title")} ({comments.length})</h2>
        </div>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
        >
          <option value="Newest">{t("comments.sortNewest")}</option>
          <option value="Oldest">{t("comments.sortOldest")}</option>
          <option value="Most Liked">{t("comments.sortMostLiked")}</option>
          <option value="Least Liked">{t("comments.sortLeastLiked")}</option>
        </select>
      </div>

      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-4">
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <img src={user?.avatar} alt={user?.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-grow flex flex-col items-end gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("comments.placeholder")}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 transition-colors"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <Send size={16} />
              {t("comments.post")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700 text-center flex flex-col items-center justify-center">
          <MessageSquare size={32} className="text-gray-400 mb-3" />
          <h3 className="text-gray-900 dark:text-white font-medium mb-1">{t("comments.join")}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{t("comments.needLogin")}</p>
          <Link 
            to="/login"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 inline-block"
          >
            {t("comments.login")}
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {sortedComments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group">
            <Link to={`/profile/${comment.userId}`} className="shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer">
                <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
              </div>
            </Link>
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Link to={`/profile/${comment.userId}`} className="font-semibold text-gray-900 dark:text-white text-sm hover:underline cursor-pointer">
                    {comment.userName}
                  </Link>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{comment.createdAt}</span>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setActiveDropdownId(activeDropdownId === comment.id ? null : comment.id)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeDropdownId === comment.id && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 z-10 py-1"
                    >
                      <button 
                        onClick={() => {
                          if (!user) {
                            alert("You must be logged in to report.");
                            return;
                          }
                          setReportModal({ isOpen: true, commentId: comment.id });
                          setActiveDropdownId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Flag size={14} /> Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">{comment.text}</p>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                <button className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900/50 bg-white dark:bg-gray-800 px-2 py-1 rounded-full transition-colors">
                  <ThumbsUp size={14} />
                  <span>{comment.likes > 0 ? comment.likes : ""}</span>
                </button>
                <button className="hover:text-gray-900 dark:hover:text-white transition-colors">Reply</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reportModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">Report Comment</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Help us keep the community safe</p>
              </div>
              <button 
                onClick={() => setReportModal({ isOpen: false, commentId: null })}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="p-5">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason for reporting</label>
                <select 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  required
                >
                  <option value="Spam">Spam or misleading</option>
                  <option value="Harassment">Harassment or bullying</option>
                  <option value="Inappropriate">Inappropriate content</option>
                  <option value="Spoilers">Unmarked Spoilers</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Additional Details (Optional)</label>
                <textarea 
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide more context..."
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none h-24"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setReportModal({ isOpen: false, commentId: null })}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-md shadow-red-600/20 transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
