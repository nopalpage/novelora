import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Users, BookOpen, Settings, LayoutDashboard, ShieldAlert, Edit, Trash2, Plus, MessageSquare, Flag, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { Novel } from "../data";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";

export function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [localNovels, setLocalNovels] = useState<Novel[]>([]);

  const [localComments, setLocalComments] = useState<any[]>([]);
  const [localReports, setLocalReports] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);

  const loadNovels = async () => {
    try {
      const novels = await api.getNovels({ sort: 'new', limit: 100 });
      setLocalNovels(novels);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdminData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const stats = await api.getAdminStats('dummy-token');
        setAdminStats(stats);
      } else if (activeTab === 'novels') {
        await loadNovels();
      } else if (activeTab === 'users') {
        const users = await api.getUsers('dummy-token');
        setLocalUsers(users);
      } else if (activeTab === 'comments') {
        const comments = await api.getAdminComments('dummy-token');
        setLocalComments(comments);
      } else if (activeTab === 'reports') {
        const reports = await api.getAdminReports('dummy-token');
        setLocalReports(reports);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const [localUsers, setLocalUsers] = useState<any[]>([]);

  const [confirmRoleModal, setConfirmRoleModal] = useState<{userId: number, newRole: string} | null>(null);
  const [showBanned, setShowBanned] = useState(false);

  const confirmRoleUpdate = async () => {
    if (!confirmRoleModal) return;
    const { userId, newRole } = confirmRoleModal;
    try {
      await api.updateUser(userId, { role: newRole }, 'dummy-token');
      await loadAdminData();
    } catch (e) {
      console.error(e);
      alert(`Failed to update role: ${(e as Error).message || "Unknown error"}`);
    }
    setConfirmRoleModal(null);
  };

  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);

  const handleUpdateRole = (id: number, newRole: string) => {
    setConfirmRoleModal({ userId: id, newRole });
  };

  const handleBanUser = async (id: number) => {
    if (confirm("Are you sure you want to ban this user?")) {
      try {
        await api.updateUser(id, { status: 'Banned' }, 'dummy-token');
        await loadAdminData();
      } catch (e) {
        console.error(e);
        alert(`Failed to ban user: ${(e as Error).message || "Unknown error"}`);
      }
    }
  };

  const handleUnbanUser = async (id: number) => {
    if (confirm("Are you sure you want to unban this user?")) {
      try {
        await api.updateUser(id, { status: 'Active' }, 'dummy-token');
        await loadAdminData();
      } catch (e) {
        console.error(e);
        alert(`Failed to unban user: ${(e as Error).message || "Unknown error"}`);
      }
    }
  };

  const handleDeleteNovel = async (id: string) => {
    if (confirm("Are you sure you want to delete this novel?")) {
      try {
        await api.deleteNovel(id, 'dummy-token');
        await loadNovels();
      } catch (e) {
        console.error(e);
        alert(`Failed to delete novel: ${(e as Error).message || "Unknown error"}`);
      }
    }
  };

  const handleAddNovel = () => {
    setEditingNovel({
      id: `custom-${Date.now()}`,
      title: '',
      author: '',
      origin: 'JP',
      image: '',
      status: 'Ongoing',
      description: ''
    });
  };

  const handleSaveEditNovel = async () => {
    if (!editingNovel) return;
    
    const title = editingNovel.title?.trim() || '';
    const author = editingNovel.author?.trim() || '';
    
    if (!title) {
      alert("Title cannot be empty.");
      return;
    }
    const titleRegex = /^[^<>{}[\]`~@#$%^*+=|\\]{1,100}$/;
    if (title.length > 100 || !titleRegex.test(title)) {
      alert("Title must be under 100 characters and cannot contain special characters like <>{}[].");
      return;
    }

    if (!author) {
      alert("Author cannot be empty.");
      return;
    }
    const authorRegex = /^[^<>{}[\]`~@#$%^*+=|\\]{1,80}$/;
    if (author.length > 80 || !authorRegex.test(author)) {
      alert("Author must be under 80 characters and cannot contain special characters like <>{}[].");
      return;
    }

    try {
      if (editingNovel.id.toString().startsWith('custom-')) {
        // Add new
        await api.addNovel(editingNovel, 'dummy-token');
      } else {
        // Update existing
        await api.updateNovel(editingNovel.id, editingNovel, 'dummy-token');
      }
      await loadNovels();
      setEditingNovel(null);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to save novel: ${e.message || "Unknown error"}`);
    }
  };

  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    return saved ? JSON.parse(saved) : { siteTitle: "Novelora", maintenanceMode: "off", allowRegistration: "on" };
  });

  const handleSaveSettings = () => {
    localStorage.setItem("novelora_settings", JSON.stringify(siteSettings));
    document.title = siteSettings.siteTitle;
    alert("Settings saved successfully!");
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1a1b21] p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-800 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You do not have permission to view the admin panel.
          </p>
          <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "novels", label: "Manage Novels", icon: BookOpen },
    { id: "comments", label: "Comments Moderate", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: Flag },
  ];

  return (
    <div className="flex-grow max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-24">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Admin Panel
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user.name}</p>
          </div>
          <nav className="p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                    activeTab === tab.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 min-h-[500px]">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 capitalize">{activeTab}</h1>
          
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Novels", value: adminStats?.totalNovels || localNovels.length },
                  { label: "Total Users", value: adminStats?.totalUsers || 0 },
                  { label: "Comments Mod", value: adminStats?.commentsMod || 0 },
                  { label: "Reports", value: adminStats?.pendingRequests || 0 },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "novels" && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <p className="text-gray-600 dark:text-gray-400">Manage existing novels or create new ones.</p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="text" placeholder="Search..." className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                  <button onClick={handleAddNovel} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                    Add Novel
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Origin</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {localNovels.map((novel) => (
                      <tr key={novel.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{novel.title}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{novel.origin}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${novel.status === 'Ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {novel.status || 'Ongoing'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2 w-max">
                          <button onClick={() => setEditingNovel(novel)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-500/10 p-2 rounded"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteNovel(novel.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-500/10 p-2 rounded"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {activeTab === "comments" && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Review and moderate user comments.</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comment</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {localComments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">No comments found.</td>
                      </tr>
                    ) : (
                      localComments.map((comment) => (
                        <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{comment.profiles?.username || 'Unknown'}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">{comment.content}</td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right space-x-2 w-max">
                            <button onClick={async () => {
                              try {
                                await api.deleteAdminComment(comment.id, 'dummy-token');
                                loadAdminData();
                              } catch(e) {
                                console.error(e);
                                alert("Failed to delete comment");
                              }
                            }} className="text-red-600 dark:text-red-400 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-500/10 p-2 rounded"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Review reports submitted by users.</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported Item</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {localReports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">No reports found.</td>
                      </tr>
                    ) : (
                      localReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{report.type}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">{report.item_id || report.item}</td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">{report.reason}</td>
                          <td className="p-4 text-right space-x-2 w-max">
                            <button onClick={async () => {
                              try {
                                await api.resolveAdminReport(report.id, 'dummy-token');
                                loadAdminData();
                              } catch(e) {
                                console.error(e);
                                alert("Failed to resolve report");
                              }
                            }} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors font-medium">Resolve</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}



        </div>
      </main>

      {confirmRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("admin.confirmRole")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t("admin.confirmRoleDesc").replace('{role}', confirmRoleModal.newRole)}
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmRoleModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t("admin.cancel")}
                </button>
                <button 
                  onClick={confirmRoleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  {t("admin.confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingNovel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Edit Novel</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input type="text" value={editingNovel.title} onChange={e => setEditingNovel({...editingNovel, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
                  <input type="text" value={editingNovel.author || ''} onChange={e => setEditingNovel({...editingNovel, author: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover Image URL</label>
                  <input type="text" value={editingNovel.image || ''} onChange={e => setEditingNovel({...editingNovel, image: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Synopsis</label>
                  <textarea value={editingNovel.description || ''} onChange={e => setEditingNovel({...editingNovel, description: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none" rows={4}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origin</label>
                  <select value={editingNovel.origin} onChange={e => setEditingNovel({...editingNovel, origin: e.target.value as "JP"|"KR"|"CN"})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="JP">JP</option>
                    <option value="KR">KR</option>
                    <option value="CN">CN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={editingNovel.type || "Web Novel"} onChange={e => setEditingNovel({...editingNovel, type: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="Web Novel">Web Novel</option>
                    <option value="Light Novel">Light Novel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={editingNovel.status || "Ongoing"} onChange={e => setEditingNovel({...editingNovel, status: e.target.value})} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Hiatus">Hiatus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genres (comma separated)</label>
                  <input type="text" value={editingNovel.genres?.join(", ") || ""} onChange={e => setEditingNovel({...editingNovel, genres: e.target.value.split(",").map(g => g.trim()).filter(Boolean)})} placeholder="Action, Adventure, Fantasy" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
                  <input type="text" value={editingNovel.tags?.join(", ") || ""} onChange={e => setEditingNovel({...editingNovel, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)})} placeholder="Magic, Overpowered, System" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setEditingNovel(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEditNovel}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
