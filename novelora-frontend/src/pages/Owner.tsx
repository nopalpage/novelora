import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Users, BookOpen, Settings, LayoutDashboard, ShieldAlert, Edit, Trash2, Plus, MessageSquare, Flag, Activity, ChevronLeft, ChevronRight, RefreshCw, Activity as ActivityIcon, Download, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Novel } from "../data";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from "socket.io-client";

export function Owner() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [localNovels, setLocalNovels] = useState<Novel[]>([]);

  const [localComments, setLocalComments] = useState<any[]>([]);
  const [localReports, setLocalReports] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);

  const loadNovels = async () => {
    try {
      const novels = await api.getNovels({ sort: 'new', limit: 100, _t: Date.now() });
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
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");

  const confirmRoleUpdate = async () => {
    if (!confirmRoleModal) return;
    const { userId, newRole } = confirmRoleModal;
    try {
      await api.updateUser(userId, { role: newRole }, 'dummy-token');
      await loadAdminData();
    } catch (e) {
      console.error(e);
      alert("Failed to update role");
    }
    setConfirmRoleModal(null);
  };

  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);

  const handleUpdateRole = (id: number, newRole: string) => {
    setConfirmRoleModal({ userId: id, newRole });
  };

  const handleToggleBan = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Banned' ? 'Active' : 'Banned';
    try {
      await api.updateUser(id, { status: newStatus }, 'dummy-token');
      await loadAdminData();
    } catch (e) {
      console.error(e);
      alert("Failed to update user status");
    }
  };

  const handleDeleteNovel = async (id: string) => {
    if (confirm("Are you sure you want to delete this novel?")) {
      try {
        await api.deleteNovel(id, 'dummy-token');
        await loadNovels();
      } catch (e) {
        console.error(e);
        alert("Failed to delete novel");
      }
    }
  };

  const [selectedNovels, setSelectedNovels] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const handleSelectAllNovels = (checked: boolean) => {
    if (checked) {
      setSelectedNovels(localNovels.map(n => n.id));
    } else {
      setSelectedNovels([]);
    }
  };

  const handleSelectNovel = (id: string) => {
    if (selectedNovels.includes(id)) {
      setSelectedNovels(selectedNovels.filter(nId => nId !== id));
    } else {
      setSelectedNovels([...selectedNovels, id]);
    }
  };

  const [showBulkStatusModal, setShowBulkStatusModal] = useState<"Ongoing" | "Completed" | null>(null);

  const handleBulkStatusUpdate = (status: "Ongoing" | "Completed") => {
    if (selectedNovels.length === 0) return;
    setShowBulkStatusModal(status);
  };

  const handleConfirmBulkStatus = async () => {
    if (!showBulkStatusModal) return;
    try {
      await Promise.all(selectedNovels.map(id => api.updateNovel(id, { status: showBulkStatusModal }, 'dummy-token')));
      await loadNovels();
      setSelectedNovels([]);
      setShowBulkStatusModal(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update status for some novels");
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedNovels.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await Promise.all(selectedNovels.map(id => api.deleteNovel(id, 'dummy-token')));
      await loadNovels();
      setSelectedNovels([]);
      setShowBulkDeleteModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to delete some novels");
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const headers = ["id", "title", "author", "image", "latestChapter", "timeAgo", "origin", "status", "rating", "views", "description"];
    const csvContent = [
      headers.join(","),
      ...localNovels.map(novel => {
        return headers.map(header => {
          let value = (novel as any)[header] || "";
          value = value.toString().replace(/"/g, '""');
          if (value.search(/("|,|\n)/g) >= 0) {
            value = `"${value}"`;
          }
          return value;
        }).join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "novels_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split("\n");
      if (lines.length <= 1) return;
      
      let headers = lines[0].split(",");
      headers = headers.map(h => h.trim().replace(/"/g, ''));
      
      const importedNovels: Novel[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = "";
        
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"' && lines[i][j+1] === '"') {
            currentValue += '"';
            j++;
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue);
            currentValue = "";
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue);
        
        const novelData: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            let val = values[index];
            if (val.startsWith('"') && val.endsWith('"') && val.length > 1) {
              val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            novelData[header] = val;
          }
        });
        
        if (novelData.title) {
          if (!novelData.id) novelData.id = `imported-${Date.now()}-${i}`;
          importedNovels.push(novelData as Novel);
        }
      }
      
      if (importedNovels.length > 0) {
        Promise.all(importedNovels.map(n => api.addNovel(n, 'dummy-token'))).then(() => {
          loadNovels();
          alert(`Successfully imported ${importedNovels.length} novels!`);
        }).catch(err => {
          console.error(err);
          alert("Failed to import some novels.");
        });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
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
      if (editingNovel.id.toString().startsWith('custom-') || editingNovel.id.toString().startsWith('imported-')) {
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
    const defaultSettings = { 
      siteTitle: "Novelora", 
      maintenanceMode: "off", 
      allowRegistration: "on",
      hidePopularNovels: "off",
      disableGenreTags: "off",
      disableMessage: "This feature has been disabled by the administrator."
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [activeOnlineUsers, setActiveOnlineUsers] = useState(0);

  useEffect(() => {
    const socket = io();
    socket.on("active_users_count", (count: number) => {
      setActiveOnlineUsers(count);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("novelora_settings", JSON.stringify(siteSettings));
    document.title = siteSettings.siteTitle;
    alert("Settings saved successfully!");
  };

  if (!user || user.role !== "owner") {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1a1b21] p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-800 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You do not have permission to view the owner panel.
          </p>
          <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");
  const [activitySearchKeyword, setActivitySearchKeyword] = useState("");
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const activityItemsPerPage = 10;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefreshLogs && activeTab === "activity") {
      interval = setInterval(() => {
        // In a real application, you would fetch fresh logs from the API here
        console.log("Auto-refreshing activity logs...");
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [autoRefreshLogs, activeTab]);

  const allActivityLogs = [
    { id: 1, date: "2026-05-21 22:00", admin: "Owner User", action: "Update Settings", details: "Disabled user registration", color: "purple" },
    { id: 2, date: "2026-05-21 21:05", admin: "Admin User", action: "Edit Novel", details: "Updated title of \"Shadow of the Erdtree\"", color: "green" },
    { id: 3, date: "2026-05-21 16:30", admin: "Owner User", action: "Change Role", details: "Promoted User123 to Admin", color: "orange" },
    { id: 4, date: "2026-05-20 14:15", admin: "Admin User", action: "Delete Comment", details: "Deleted spam comment by Spammer99", color: "red" },
    { id: 5, date: "2026-05-19 18:20", admin: "Owner User", action: "Update Settings", details: "Enabled maintenance mode", color: "purple" },
    { id: 6, date: "2026-05-19 19:45", admin: "Admin User", action: "Add Novel", details: "Added \"Mother of Learning\"", color: "blue" },
    { id: 7, date: "2026-05-18 10:30", admin: "Admin User", action: "Delete Novel", details: "Deleted \"Test Novel 123\"", color: "red" },
    { id: 8, date: "2026-05-18 11:15", admin: "Owner User", action: "Update Settings", details: "Disabled maintenance mode", color: "purple" },
    { id: 9, date: "2026-05-17 09:00", admin: "Admin User", action: "Edit Novel", details: "Updated cover for \"The Wandering Inn\"", color: "green" },
    { id: 10, date: "2026-05-16 14:20", admin: "Admin User", action: "Resolve Report", details: "Resolved spam report for comment #4592", color: "blue" },
    { id: 11, date: "2026-05-15 16:40", admin: "Owner User", action: "Ban User", details: "Banned Spammer99", color: "red" },
    { id: 12, date: "2026-05-14 12:10", admin: "Admin User", action: "Edit Novel", details: "Updated author name for \"Lord of the Mysteries\"", color: "green" },
    { id: 13, date: "2026-05-13 08:30", admin: "Admin User", action: "Delete Comment", details: "Deleted offensive comment by BadUser1", color: "red" },
  ];

  const filteredLogs = allActivityLogs.filter(log => {
    let matches = true;
    if (activitySearchKeyword) {
      const keyword = activitySearchKeyword.toLowerCase();
      if (!log.admin.toLowerCase().includes(keyword) && 
          !log.action.toLowerCase().includes(keyword) && 
          !log.details.toLowerCase().includes(keyword)) {
         matches = false;
      }
    }
    const logDateOnly = log.date.split(" ")[0];
    if (activityStartDate && logDateOnly < activityStartDate) matches = false;
    if (activityEndDate && logDateOnly > activityEndDate) matches = false;
    return matches;
  });

  const totalActivityPages = Math.ceil(filteredLogs.length / activityItemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (activityCurrentPage - 1) * activityItemsPerPage,
    activityCurrentPage * activityItemsPerPage
  );

  useEffect(() => {
    setActivityCurrentPage(1);
  }, [activityStartDate, activityEndDate, activitySearchKeyword]);

  const chartDataMap: Record<string, number> = {};
  filteredLogs.forEach(log => {
      const d = log.date.split(" ")[0];
      chartDataMap[d] = (chartDataMap[d] || 0) + 1;
  });
  const chartData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      actions: chartDataMap[dateStr] || 0
    };
  });

  const activeUserChartData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    // Generate some random plausible data
    const users = Math.floor(Math.random() * (2000 - 1000 + 1) + 1000); 
    return {
      name: dateStr,
      users: users,
    };
  });

  const handleDownloadCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No logs to download.");
      return;
    }
    const headers = ["Date", "Admin", "Action", "Details"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log => 
        `"${log.date}","${log.admin}","${log.action}","${log.details.replace(/"/g, '""')}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "novels", label: "Manage Novels", icon: BookOpen },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "comments", label: "Comments Moderate", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: Flag },
    { id: "activity", label: "Activity Log", icon: Activity },
    { id: "settings", label: "Site Settings", icon: Settings },
  ];

  return (
    <div className="flex-grow max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-24">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Owner Panel
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
                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
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
                  { label: "Total Users", value: adminStats?.totalUsers || localUsers.length },
                  { label: "Comments", value: adminStats?.commentsMod || 0 },
                  { label: "Pending Requests", value: adminStats?.pendingRequests || 0 },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-5">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Today's Summary</h3>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 uppercase font-bold tracking-wider mb-1">New Registrations</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">24</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 uppercase font-bold tracking-wider mb-1">Recent Reports</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">5</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xs text-green-600/90 dark:text-green-400/90 uppercase font-bold tracking-wider">Active Online</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{activeOnlineUsers}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-lg p-5">
                  <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">System Notice (Owner)</h3>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    All systems are running normally. No recent error logs detected.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1b26] border border-gray-100 dark:border-gray-800 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Active Users Trend (Past 7 Days)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeUserChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                        labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                      />
                      <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "novels" && (
            <div>
              <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center mb-6 gap-4">
                <p className="text-gray-600 dark:text-gray-400 min-w-0">Manage existing novels or create new ones.</p>
                <div className="flex flex-wrap gap-3 w-full 2xl:w-auto">
                  {selectedNovels.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                       <button onClick={() => handleBulkStatusUpdate("Ongoing")} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                         Mark Ongoing
                       </button>
                       <button onClick={() => handleBulkStatusUpdate("Completed")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                         Mark Completed
                       </button>
                       <button onClick={handleBulkDeleteClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                         Delete ({selectedNovels.length})
                       </button>
                     </div>
                  )}
                  <input type="text" placeholder="Search..." className="flex-1 sm:flex-none min-w-[200px] border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
                  <div className="flex flex-wrap gap-2">
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 flex items-center gap-1.5 border border-gray-300 dark:border-gray-600">
                      <Upload size={16} /> Import
                    </button>
                    <button onClick={handleExportCSV} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 flex items-center gap-1.5 border border-gray-300 dark:border-gray-600">
                      <Download size={16} /> Export
                    </button>
                    <button onClick={handleAddNovel} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                      Add Novel
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 w-12">
                        <input 
                          type="checkbox" 
                          checked={selectedNovels.length === localNovels.length && localNovels.length > 0} 
                          onChange={(e) => handleSelectAllNovels(e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Origin</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {localNovels.map((novel) => (
                      <tr key={novel.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-4">
                          <input 
                            type="checkbox"
                            checked={selectedNovels.includes(novel.id)}
                            onChange={() => handleSelectNovel(novel.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{novel.title}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{novel.origin}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${novel.status === 'Ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                            {novel.status || 'Ongoing'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2 w-max">
                          <button onClick={() => setEditingNovel(novel)} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors bg-purple-50 dark:bg-purple-500/10 p-2 rounded"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteNovel(novel.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-500/10 p-2 rounded"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                <p className="text-gray-600 dark:text-gray-400 min-w-0">Manage user roles, bans, and permissions.</p>
                <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                  <select 
                    value={userRoleFilter} 
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    <option value="All">All Roles</option>
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="User">User</option>
                  </select>
                  <select 
                    value={userStatusFilter} 
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Banned">Banned</option>
                  </select>
                  <input type="text" placeholder="Search Users..." className="ml-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {localUsers.filter((u: any) => {
                      if (userRoleFilter !== "All" && u.role !== userRoleFilter) return false;
                      if (userStatusFilter === "Active" && u.status === "Banned") return false;
                      if (userStatusFilter === "Banned" && u.status !== "Banned") return false;
                      return true;
                    }).map((u: any) => (
                      <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${u.status === 'Banned' ? 'opacity-50' : ''}`}>
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-200 flex items-center gap-3">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} alt={u.username || 'User'} className="w-8 h-8 rounded-full bg-gray-200" />
                          {u.username || 'Unknown'}
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            u.role === 'Owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 
                            u.role === 'Admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {u.role}
                          </span>
                          {u.status === 'Banned' && (
                             <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                               Banned
                             </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2 w-max">
                          {u.role !== 'Owner' && u.status !== 'Banned' && (
                             <button onClick={() => handleUpdateRole(u.id, u.role === 'Admin' ? 'User' : 'Admin')} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium">
                               {u.role === 'Admin' ? t("admin.demote") : t("admin.makeAdmin")}
                             </button>
                          )}
                          {u.role !== 'Owner' && (
                            <div className="inline-flex items-center gap-2 ml-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ban</span>
                              <button 
                                onClick={() => handleToggleBan(u.id, u.status)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1b26] ${
                                  u.status === 'Banned' ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                              >
                                <span 
                                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    u.status === 'Banned' ? 'translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          )}
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

          {activeTab === "activity" && (
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <p className="text-gray-600 dark:text-gray-400">Activity log of recent changes made by admins.</p>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <RefreshCw size={16} className={autoRefreshLogs ? "animate-spin text-purple-600" : "text-gray-400"} />
                      Auto-refresh (60s)
                    </span>
                    <button 
                      onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1b26] ${
                        autoRefreshLogs ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span 
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoRefreshLogs ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <button 
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </div>
              
              {chartData.length > 0 && (
                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <Line type="monotone" dataKey="actions" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }}
                        itemStyle={{ color: '#a855f7', fontWeight: 600 }}
                        labelStyle={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Search Logs</label>
                  <input 
                    type="text" 
                    placeholder="Search by admin, action, or details..." 
                    value={activitySearchKeyword}
                    onChange={(e) => setActivitySearchKeyword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={activityEndDate}
                    onChange={(e) => setActivityEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {paginatedLogs.length > 0 ? paginatedLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-4 text-gray-500 dark:text-gray-400">{log.date}</td>
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{log.admin}</td>
                        <td className={`p-4 text-${log.color}-600 dark:text-${log.color}-400 font-medium`}>{log.action}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{log.details}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">No activity logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {totalActivityPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing <span className="font-medium">{(activityCurrentPage - 1) * activityItemsPerPage + 1}</span> to <span className="font-medium">{Math.min(activityCurrentPage * activityItemsPerPage, filteredLogs.length)}</span> of <span className="font-medium">{filteredLogs.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActivityCurrentPage(p => Math.max(1, p - 1))}
                      disabled={activityCurrentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white px-2">
                      Page {activityCurrentPage} of {totalActivityPages}
                    </span>
                    <button 
                      onClick={() => setActivityCurrentPage(p => Math.min(totalActivityPages, p + 1))}
                      disabled={activityCurrentPage === totalActivityPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site Title</label>
                <input type="text" value={siteSettings.siteTitle} onChange={e => setSiteSettings(s => ({...s, siteTitle: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance Mode</label>
                <select value={siteSettings.maintenanceMode} onChange={e => setSiteSettings(s => ({...s, maintenanceMode: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allow User Registration</label>
                <select value={siteSettings.allowRegistration} onChange={e => setSiteSettings(s => ({...s, allowRegistration: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="on">Yes</option>
                  <option value="off">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hide Popular Novels</label>
                <select value={siteSettings.hidePopularNovels} onChange={e => setSiteSettings(s => ({...s, hidePopularNovels: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="off">No (Show Popular)</option>
                  <option value="on">Yes (Hide Popular)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disable Genre & Tags Pages</label>
                <select value={siteSettings.disableGenreTags} onChange={e => setSiteSettings(s => ({...s, disableGenreTags: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="off">No (Enabled)</option>
                  <option value="on">Yes (Disabled)</option>
                </select>
              </div>
              {siteSettings.disableGenreTags === "on" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disabled Notice Message</label>
                  <input type="text" value={siteSettings.disableMessage} onChange={e => setSiteSettings(s => ({...s, disableMessage: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              )}
              <button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Save Settings
              </button>
            </div>
          )}

        </div>
      </main>

      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                  <Edit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Status Update</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to mark the <strong>{selectedNovels.length}</strong> selected novel(s) as <strong>{showBulkStatusModal}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowBulkStatusModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmBulkStatus}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                >
                  Confirm Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to permanently delete the <strong>{selectedNovels.length}</strong> selected novel(s)? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                >
                  Delete {selectedNovels.length} {selectedNovels.length === 1 ? 'Novel' : 'Novels'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
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
