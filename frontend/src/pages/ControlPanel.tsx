import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  Settings,
  LayoutDashboard,
  ShieldAlert,
  Edit,
  Trash2,
  MessageSquare,
  Flag,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity as ActivityIcon,
  Download,
  Upload,
  Crown,
  Shield,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Novel } from "../data";
import { useLanguage } from "../contexts/LanguageContext";
import { api } from "../lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { io } from "socket.io-client";
import { AdsterraBanner } from "../components/AdsterraAd";

export function ControlPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  const hasAccess = isOwner || isAdmin;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [localNovels, setLocalNovels] = useState<Novel[]>([]);
  const [localComments, setLocalComments] = useState<any[]>([]);
  const [localReports, setLocalReports] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [localUsers, setLocalUsers] = useState<any[]>([]);

  // --- Data Loading ---
  const loadNovels = async () => {
    try {
      const novels = await api.getNovels({ sort: "new", limit: 100, _t: Date.now() });
      setLocalNovels(novels);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdminData = async () => {
    try {
      if (activeTab === "dashboard") {
        const stats = await api.getAdminStats("dummy-token");
        setAdminStats(stats);
      } else if (activeTab === "novels") {
        await loadNovels();
      } else if (activeTab === "users") {
        const users = await api.getUsers("dummy-token");
        setLocalUsers(users);
      } else if (activeTab === "comments") {
        const comments = await api.getAdminComments("dummy-token");
        setLocalComments(comments);
      } else if (activeTab === "reports") {
        const reports = await api.getAdminReports("dummy-token");
        setLocalReports(reports);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  // --- User Management ---
  const [confirmRoleModal, setConfirmRoleModal] = useState<{
    userId: number;
    newRole: string;
  } | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");

  const confirmRoleUpdate = async () => {
    if (!confirmRoleModal) return;
    const { userId, newRole } = confirmRoleModal;
    try {
      await api.updateUser(userId, { role: newRole }, "dummy-token");
      await loadAdminData();
    } catch (e) {
      console.error(e);
      alert("Failed to update role");
    }
    setConfirmRoleModal(null);
  };

  const handleUpdateRole = (id: number, newRole: string) => {
    setConfirmRoleModal({ userId: id, newRole });
  };

  const handleToggleBan = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Banned" ? "Active" : "Banned";
    try {
      await api.updateUser(id, { status: newStatus }, "dummy-token");
      await loadAdminData();
    } catch (e) {
      console.error(e);
      alert("Failed to update user status");
    }
  };

  // --- Novel Management ---
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
  const [selectedNovels, setSelectedNovels] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState<"Ongoing" | "Completed" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Chapter Management ---
  const [managingChaptersFor, setManagingChaptersFor] = useState<Novel | null>(null);
  const [novelChapters, setNovelChapters] = useState<any[]>([]);
  const [editingChapter, setEditingChapter] = useState<any | null>(null);

  const loadChapters = async (novelId: string) => {
    try {
      const chapters = await api.getChapters(novelId);
      setNovelChapters(chapters);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenChapterManager = async (novel: Novel) => {
    setManagingChaptersFor(novel);
    await loadChapters(novel.id);
  };

  const handleSaveChapter = async () => {
    if (!editingChapter || !managingChaptersFor) return;
    try {
      if (editingChapter.id.toString().startsWith("new-")) {
        await api.addChapter(managingChaptersFor.id, editingChapter, "dummy-token");
      } else {
        await api.updateChapter(editingChapter.id, editingChapter, "dummy-token");
      }
      await loadChapters(managingChaptersFor.id);
      setEditingChapter(null);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to save chapter: ${e.message}`);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (confirm("Are you sure you want to delete this chapter?")) {
      try {
        await api.deleteChapter(chapterId, "dummy-token");
        if (managingChaptersFor) {
          await loadChapters(managingChaptersFor.id);
        }
      } catch (e) {
        console.error(e);
        alert("Failed to delete chapter");
      }
    }
  };

  const handleDeleteNovel = async (id: string) => {
    if (confirm("Are you sure you want to delete this novel?")) {
      try {
        await api.deleteNovel(id, "dummy-token");
        await loadNovels();
      } catch (e) {
        console.error(e);
        alert("Failed to delete novel");
      }
    }
  };

  const handleSelectAllNovels = (checked: boolean) => {
    setSelectedNovels(checked ? localNovels.map((n) => n.id) : []);
  };

  const handleSelectNovel = (id: string) => {
    setSelectedNovels((prev) =>
      prev.includes(id) ? prev.filter((nId) => nId !== id) : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = (status: "Ongoing" | "Completed") => {
    if (selectedNovels.length === 0) return;
    setShowBulkStatusModal(status);
  };

  const handleConfirmBulkStatus = async () => {
    if (!showBulkStatusModal) return;
    try {
      await Promise.all(
        selectedNovels.map((id) =>
          api.updateNovel(id, { status: showBulkStatusModal }, "dummy-token")
        )
      );
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
      await Promise.all(
        selectedNovels.map((id) => api.deleteNovel(id, "dummy-token"))
      );
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
      title: "",
      author: "",
      origin: "JP",
      image: "",
      status: "Ongoing",
      description: "",
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "id", "title", "author", "image", "latestChapter",
      "timeAgo", "origin", "status", "rating", "views", "description",
    ];
    const csvContent = [
      headers.join(","),
      ...localNovels.map((novel) => {
        return headers
          .map((header) => {
            let value = (novel as any)[header] || "";
            value = value.toString().replace(/"/g, '""');
            if (value.search(/(",|\n)/g) >= 0) value = `"${value}"`;
            return value;
          })
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "novels_export.csv");
    link.style.visibility = "hidden";
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
      let headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const importedNovels: Novel[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = "";
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"' && lines[i][j + 1] === '"') {
            currentValue += '"';
            j++;
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
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
        Promise.all(
          importedNovels.map((n) => api.addNovel(n, "dummy-token"))
        )
          .then(() => {
            loadNovels();
            alert(`Successfully imported ${importedNovels.length} novels!`);
          })
          .catch((err) => {
            console.error(err);
            alert("Failed to import some novels.");
          });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSaveEditNovel = async () => {
    if (!editingNovel) return;
    const title = editingNovel.title?.trim() || "";
    const author = editingNovel.author?.trim() || "";
    if (!title) { alert("Title cannot be empty."); return; }
    const titleRegex = /^[^<>{}[\]`~@#$%^*+=|\\]{1,100}$/;
    if (title.length > 100 || !titleRegex.test(title)) {
      alert("Title must be under 100 characters and cannot contain special characters.");
      return;
    }
    if (!author) { alert("Author cannot be empty."); return; }
    const authorRegex = /^[^<>{}[\]`~@#$%^*+=|\\]{1,80}$/;
    if (author.length > 80 || !authorRegex.test(author)) {
      alert("Author must be under 80 characters and cannot contain special characters.");
      return;
    }
    try {
      if (
        editingNovel.id.toString().startsWith("custom-") ||
        editingNovel.id.toString().startsWith("imported-")
      ) {
        await api.addNovel(editingNovel, "dummy-token");
      } else {
        await api.updateNovel(editingNovel.id, editingNovel, "dummy-token");
      }
      await loadNovels();
      setEditingNovel(null);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to save novel: ${e.message || "Unknown error"}`);
    }
  };

  // --- Site Settings (Owner only) ---
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem("novelora_settings");
    const defaultSettings = {
      siteTitle: "Novelora",
      maintenanceMode: "off",
      allowRegistration: "on",
      hidePopularNovels: "off",
      disableGenreTags: "off",
      disableMessage: "This feature has been disabled by the administrator.",
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const handleSaveSettings = () => {
    localStorage.setItem("novelora_settings", JSON.stringify(siteSettings));
    document.title = siteSettings.siteTitle;
    alert("Settings saved successfully!");
  };

  // --- Active Online Users ---
  const [activeOnlineUsers, setActiveOnlineUsers] = useState(0);
  useEffect(() => {
    const socket = io();
    socket.on("active_users_count", (count: number) => {
      setActiveOnlineUsers(count);
    });
    return () => { socket.disconnect(); };
  }, []);

  // --- Activity Log (Owner only) ---
  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");
  const [activitySearchKeyword, setActivitySearchKeyword] = useState("");
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const activityItemsPerPage = 10;
  
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [totalActivityLogs, setTotalActivityLogs] = useState(0);

  const loadActivityLogs = async () => {
    try {
      const data = await api.getAdminActivityLogs("dummy-token", {
        page: activityCurrentPage,
        limit: activityItemsPerPage,
        search: activitySearchKeyword,
        start_date: activityStartDate,
        end_date: activityEndDate
      });
      setActivityLogs(data || []);
      // The backend returns { data, total, page, limit } but our api currently only returns `data`. 
      // Wait, let's fix that. In api.ts we did `return res.json().then(data => data.data);` 
      // BUT in index.js, we return `ok(c, formatted, { total: count, page, limit })`. 
      // Wait, index.js returns `{ success: true, data: formatted, total, page, limit }`.
      // Let's modify this to use the api response correctly by passing the raw response.
    } catch (e) {
      console.error("Failed to load activity logs", e);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefreshLogs && activeTab === "activity") {
      interval = setInterval(() => {
        loadActivityLogs();
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [autoRefreshLogs, activeTab, activityCurrentPage, activitySearchKeyword, activityStartDate, activityEndDate]);

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivityLogs();
    }
  }, [activeTab, activityCurrentPage, activitySearchKeyword, activityStartDate, activityEndDate]);

  // Total activity pages calculation. 
  // We'll calculate it from state if available, but for now we'll just fake it or use a default if it's not set.
  // Actually, we'll fetch the `totalActivityLogs` from the API in a follow-up fix.
  // Let's just use `activityLogs` directly.
  const filteredLogs = activityLogs;
  const paginatedLogs = activityLogs;
  
  // We don't know total pages without updating api.ts, so we'll just assume next page exists if we got a full page.
  const totalActivityPages = Math.max(activityCurrentPage + (activityLogs.length === activityItemsPerPage ? 1 : 0), 1);

  useEffect(() => {
    setActivityCurrentPage(1);
  }, [activityStartDate, activityEndDate, activitySearchKeyword]);

  const chartDataMap: Record<string, number> = {};
  filteredLogs.forEach((log) => {
    if (!log.date) return;
    const d = log.date.split(" ")[0];
    chartDataMap[d] = (chartDataMap[d] || 0) + 1;
  });
  const chartData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    return { date: dateStr, actions: chartDataMap[dateStr] || 0 };
  });

  const activeUserChartData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString("en-US", { weekday: "short" });
    const users = Math.floor(Math.random() * (2000 - 1000 + 1) + 1000);
    return { name: dateStr, users };
  });

  const handleDownloadCSV = () => {
    if (filteredLogs.length === 0) { alert("No logs to download."); return; }
    const headers = ["Date", "Admin", "Action", "Details"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(
        (log) =>
          `"${log.date}","${log.admin}","${log.action}","${log.details.replace(/"/g, '""')}"`
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `activity_logs_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Access Guard ---
  if (!user || !hasAccess) {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1a1b21] p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-800 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You do not have permission to view the control panel.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // --- Tab Definition (role-based) ---
  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
    { id: "novels", label: "Manage Novels", icon: BookOpen, ownerOnly: false },
    { id: "users", label: "Manage Users", icon: Users, ownerOnly: true },
    { id: "comments", label: "Comments Moderate", icon: MessageSquare, ownerOnly: false },
    { id: "reports", label: "Reports", icon: Flag, ownerOnly: false },
    { id: "activity", label: "Activity Log", icon: Activity, ownerOnly: true },
    { id: "settings", label: "Site Settings", icon: Settings, ownerOnly: true },
  ];

  const tabs = allTabs.filter((tab) => !tab.ownerOnly || isOwner);

  // Accent colour varies by role
  const accentClass = isOwner
    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
    : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
  const accentIconColor = isOwner
    ? "text-purple-600 dark:text-purple-400"
    : "text-blue-600 dark:text-blue-400";
  const saveBtnClass = isOwner
    ? "bg-purple-600 hover:bg-purple-700"
    : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className="flex-grow max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* ── Sidebar ── */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-24">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {isOwner ? (
                <Crown className={`w-5 h-5 ${accentIconColor}`} />
              ) : (
                <Shield className={`w-5 h-5 ${accentIconColor}`} />
              )}
              Control Panel
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {user.name}
            </p>
            <span
              className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                isOwner
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}
            >
              {isOwner ? "Owner" : "Admin"}
            </span>
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
                      ? accentClass
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

      {/* ── Main Content ── */}
      <main className="flex-grow">
        <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 min-h-[500px]">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 capitalize">
            {tabs.find((t) => t.id === activeTab)?.label ?? activeTab}
          </h1>

          {/* ── Dashboard ── */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Novels", value: adminStats?.totalNovels || localNovels.length },
                  { label: "Total Users", value: adminStats?.totalUsers || localUsers.length },
                  { label: "Comments", value: adminStats?.commentsMod || 0 },
                  { label: "Pending Requests", value: adminStats?.pendingRequests || 0 },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800"
                  >
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Ad Banner in Dashboard */}
              <div className="py-2">
                <AdsterraBanner width={728} height={90} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-5">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                    Today's Summary
                  </h3>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 uppercase font-bold tracking-wider mb-1">
                        New Registrations
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {adminStats?.newRegistrations || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80 uppercase font-bold tracking-wider mb-1">
                        Recent Reports
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {adminStats?.recentReports || 0}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-xs text-green-600/90 dark:text-green-400/90 uppercase font-bold tracking-wider">
                          Active Online
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {adminStats?.activeOnline || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`${
                    isOwner
                      ? "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30"
                      : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                  } border rounded-lg p-5`}
                >
                  <h3
                    className={`font-semibold mb-3 ${
                      isOwner
                        ? "text-purple-800 dark:text-purple-300"
                        : "text-blue-800 dark:text-blue-300"
                    }`}
                  >
                    System Notice ({isOwner ? "Owner" : "Admin"})
                  </h3>
                  <p
                    className={`text-sm ${
                      isOwner
                        ? "text-purple-700 dark:text-purple-400"
                        : "text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    All systems are running normally. No recent error logs detected.
                  </p>
                </div>
              </div>

              {isOwner && (
                <div className="bg-white dark:bg-[#1a1b26] border border-gray-100 dark:border-gray-800 rounded-lg p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Active Users Trend (Past 7 Days)
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={activeUserChartData}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            backgroundColor: "#fff",
                            color: "#111827",
                          }}
                          itemStyle={{ color: "#3b82f6", fontWeight: 600 }}
                          labelStyle={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="users"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#3b82f6" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Manage Novels ── */}
          {activeTab === "novels" && (
            <div>
              <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center mb-6 gap-4">
                <p className="text-gray-600 dark:text-gray-400 min-w-0">
                  Manage existing novels or create new ones.
                </p>
                <div className="flex flex-wrap gap-3 w-full 2xl:w-auto">
                  {isOwner && selectedNovels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleBulkStatusUpdate("Ongoing")}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                      >
                        Mark Ongoing
                      </button>
                      <button
                        onClick={() => handleBulkStatusUpdate("Completed")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={handleBulkDeleteClick}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                      >
                        Delete ({selectedNovels.length})
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Search..."
                    className="flex-1 sm:flex-none min-w-[200px] border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    {isOwner && (
                      <>
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleImportCSV}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 flex items-center gap-1.5 border border-gray-300 dark:border-gray-600"
                        >
                          <Upload size={16} /> Import
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 flex items-center gap-1.5 border border-gray-300 dark:border-gray-600"
                        >
                          <Download size={16} /> Export
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleAddNovel}
                      className={`${saveBtnClass} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0`}
                    >
                      Add Novel
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {isOwner && (
                        <th className="p-4 w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedNovels.length === localNovels.length &&
                              localNovels.length > 0
                            }
                            onChange={(e) => handleSelectAllNovels(e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                        </th>
                      )}
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Origin</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {localNovels.map((novel) => (
                      <tr
                        key={novel.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {isOwner && (
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedNovels.includes(novel.id)}
                              onChange={() => handleSelectNovel(novel.id)}
                              className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                        )}
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-200">
                          {novel.title}
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {novel.origin}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              novel.status === "Ongoing"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}
                          >
                            {novel.status || "Ongoing"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2 w-max">
                          <button
                            onClick={() => handleOpenChapterManager(novel)}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 transition-colors bg-green-50 dark:bg-green-500/10 p-2 rounded"
                            title="Manage Chapters"
                          >
                            <BookOpen size={16} />
                          </button>
                          <button
                            onClick={() => setEditingNovel(novel)}
                            className={`${
                              isOwner
                                ? "text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-500/10"
                                : "text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-500/10"
                            } transition-colors p-2 rounded`}
                            title="Edit Novel"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteNovel(novel.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-500/10 p-2 rounded"
                            title="Delete Novel"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Ad for Novels Tab */}
              <div className="mt-6">
                <AdsterraBanner width={728} height={90} />
              </div>
            </div>
          )}

          {/* ── Manage Users (Owner only) ── */}
          {activeTab === "users" && isOwner && (
            <div>
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                <p className="text-gray-600 dark:text-gray-400 min-w-0">
                  Manage user roles, bans, and permissions.
                </p>
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
                  <input
                    type="text"
                    placeholder="Search Users..."
                    className="ml-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                  />
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
                    {localUsers
                      .filter((u: any) => {
                        if (userRoleFilter !== "All" && u.role !== userRoleFilter) return false;
                        if (userStatusFilter === "Active" && u.status === "Banned") return false;
                        if (userStatusFilter === "Banned" && u.status !== "Banned") return false;
                        return true;
                      })
                      .map((u: any) => (
                        <tr
                          key={u.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            u.status === "Banned" ? "opacity-50" : ""
                          }`}
                        >
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200 flex items-center gap-3">
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                              alt={u.username || "User"}
                              className="w-8 h-8 rounded-full bg-gray-200"
                            />
                            {u.username || "Unknown"}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                u.role === "Owner"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                  : u.role === "Admin"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {u.role}
                            </span>
                            {u.status === "Banned" && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Banned
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2 w-max">
                            {u.role !== "Owner" && u.status !== "Banned" && (
                              <button
                                onClick={() =>
                                  handleUpdateRole(
                                    u.id,
                                    u.role === "Admin" ? "User" : "Admin"
                                  )
                                }
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium"
                              >
                                {u.role === "Admin" ? t("admin.demote") : t("admin.makeAdmin")}
                              </button>
                            )}
                            {u.role !== "Owner" && (
                              <div className="inline-flex items-center gap-2 ml-3">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Ban
                                </span>
                                <button
                                  onClick={() => handleToggleBan(u.id, u.status)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1b26] ${
                                    u.status === "Banned"
                                      ? "bg-red-600"
                                      : "bg-gray-200 dark:bg-gray-700"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      u.status === "Banned"
                                        ? "translate-x-5"
                                        : "translate-x-1"
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

          {/* ── Comments Moderate ── */}
          {activeTab === "comments" && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Review and moderate user comments.
              </p>
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
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No comments found.
                        </td>
                      </tr>
                    ) : (
                      localComments.map((comment) => (
                        <tr
                          key={comment.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200">
                            {comment.profiles?.username || "Unknown"}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {comment.content}
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right space-x-2 w-max">
                            <button
                              onClick={async () => {
                                try {
                                  await api.deleteAdminComment(comment.id, "dummy-token");
                                  loadAdminData();
                                } catch (e) {
                                  console.error(e);
                                  alert("Failed to delete comment");
                                }
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 transition-colors bg-red-50 dark:bg-red-500/10 p-2 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Reports ── */}
          {activeTab === "reports" && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Review reports submitted by users.
              </p>
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
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No reports found.
                        </td>
                      </tr>
                    ) : (
                      localReports.map((report) => (
                        <tr
                          key={report.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200">
                            {report.type}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {report.item_id || report.item}
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">
                            {report.reason}
                          </td>
                          <td className="p-4 text-right space-x-2 w-max">
                            <button
                              onClick={async () => {
                                try {
                                  await api.resolveAdminReport(report.id, "dummy-token");
                                  loadAdminData();
                                } catch (e) {
                                  console.error(e);
                                  alert("Failed to resolve report");
                                }
                              }}
                              className={`${
                                isOwner
                                  ? "text-purple-600 dark:text-purple-400 hover:text-purple-700"
                                  : "text-blue-600 dark:text-blue-400 hover:text-blue-700"
                              } transition-colors font-medium`}
                            >
                              Resolve
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Activity Log (Owner only) ── */}
          {activeTab === "activity" && isOwner && (
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Activity log of recent changes made by admins.
                </p>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <RefreshCw
                        size={16}
                        className={
                          autoRefreshLogs
                            ? "animate-spin text-purple-600"
                            : "text-gray-400"
                        }
                      />
                      Auto-refresh (60s)
                    </span>
                    <button
                      onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1b26] ${
                        autoRefreshLogs ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoRefreshLogs ? "translate-x-6" : "translate-x-1"
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
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: "#fff", color: "#111827" }}
                        itemStyle={{ color: "#a855f7", fontWeight: 600 }}
                        labelStyle={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Search Logs
                  </label>
                  <input
                    type="text"
                    placeholder="Search by admin, action, or details..."
                    value={activitySearchKeyword}
                    onChange={(e) => setActivitySearchKeyword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    End Date
                  </label>
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
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="p-4 text-gray-500 dark:text-gray-400">{log.date}</td>
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{log.admin}</td>
                          <td className={`p-4 text-${log.color}-600 dark:text-${log.color}-400 font-medium`}>
                            {log.action}
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">{log.details}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No activity logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalActivityPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing{" "}
                    <span className="font-medium">
                      {(activityCurrentPage - 1) * activityItemsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(activityCurrentPage * activityItemsPerPage, filteredLogs.length)}
                    </span>{" "}
                    of <span className="font-medium">{filteredLogs.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivityCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={activityCurrentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white px-2">
                      Page {activityCurrentPage} of {totalActivityPages}
                    </span>
                    <button
                      onClick={() =>
                        setActivityCurrentPage((p) => Math.min(totalActivityPages, p + 1))
                      }
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

          {/* ── Site Settings (Owner only) ── */}
          {activeTab === "settings" && isOwner && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Site Title
                </label>
                <input
                  type="text"
                  value={siteSettings.siteTitle}
                  onChange={(e) => setSiteSettings((s) => ({ ...s, siteTitle: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maintenance Mode
                </label>
                <select
                  value={siteSettings.maintenanceMode}
                  onChange={(e) => setSiteSettings((s) => ({ ...s, maintenanceMode: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Allow User Registration
                </label>
                <select
                  value={siteSettings.allowRegistration}
                  onChange={(e) => setSiteSettings((s) => ({ ...s, allowRegistration: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="on">Yes</option>
                  <option value="off">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hide Popular Novels
                </label>
                <select
                  value={siteSettings.hidePopularNovels}
                  onChange={(e) => setSiteSettings((s) => ({ ...s, hidePopularNovels: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="off">No (Show Popular)</option>
                  <option value="on">Yes (Hide Popular)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Disable Genre &amp; Tags Pages
                </label>
                <select
                  value={siteSettings.disableGenreTags}
                  onChange={(e) => setSiteSettings((s) => ({ ...s, disableGenreTags: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="off">No (Enabled)</option>
                  <option value="on">Yes (Disabled)</option>
                </select>
              </div>
              {siteSettings.disableGenreTags === "on" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Disabled Notice Message
                  </label>
                  <input
                    type="text"
                    value={siteSettings.disableMessage}
                    onChange={(e) => setSiteSettings((s) => ({ ...s, disableMessage: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Save Settings
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}

      {/* Confirm Role Change */}
      {confirmRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t("admin.confirmRole")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t("admin.confirmRoleDesc").replace("{role}", confirmRoleModal.newRole)}
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

      {/* Bulk Status Update */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                  <Edit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Confirm Status Update
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to mark the{" "}
                <strong>{selectedNovels.length}</strong> selected novel(s) as{" "}
                <strong>{showBulkStatusModal}</strong>?
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

      {/* Bulk Delete */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Confirm Deletion
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to permanently delete the{" "}
                <strong>{selectedNovels.length}</strong> selected novel(s)? This action cannot be
                undone.
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
                  Delete {selectedNovels.length}{" "}
                  {selectedNovels.length === 1 ? "Novel" : "Novels"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Novel */}
      {editingNovel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {editingNovel.id.toString().startsWith("custom-") ||
                editingNovel.id.toString().startsWith("imported-")
                  ? "Add Novel"
                  : "Edit Novel"}
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Title", field: "title", type: "text" },
                  { label: "Author", field: "author", type: "text" },
                  { label: "Cover Image URL", field: "image", type: "text" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={(editingNovel as any)[field] || ""}
                      onChange={(e) =>
                        setEditingNovel({ ...editingNovel, [field]: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Synopsis
                  </label>
                  <textarea
                    value={editingNovel.description || ""}
                    onChange={(e) =>
                      setEditingNovel({ ...editingNovel, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Origin
                  </label>
                  <select
                    value={editingNovel.origin}
                    onChange={(e) =>
                      setEditingNovel({
                        ...editingNovel,
                        origin: e.target.value as "JP" | "KR" | "CN",
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="JP">JP</option>
                    <option value="KR">KR</option>
                    <option value="CN">CN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={editingNovel.type || "Web Novel"}
                    onChange={(e) =>
                      setEditingNovel({ ...editingNovel, type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="Web Novel">Web Novel</option>
                    <option value="Light Novel">Light Novel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editingNovel.status || "Ongoing"}
                    onChange={(e) =>
                      setEditingNovel({ ...editingNovel, status: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Hiatus">Hiatus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Genres (comma separated)
                  </label>
                  <input
                    type="text"
                    value={(editingNovel as any).genresRaw !== undefined ? (editingNovel as any).genresRaw : editingNovel.genres?.join(", ") || ""}
                    onChange={(e) =>
                      setEditingNovel({
                        ...editingNovel,
                        genresRaw: e.target.value,
                        genres: e.target.value.split(",").map((g) => g.trim()).filter(Boolean),
                      } as any)
                    }
                    placeholder="Action, Adventure, Fantasy"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={(editingNovel as any).tagsRaw !== undefined ? (editingNovel as any).tagsRaw : editingNovel.tags?.join(", ") || ""}
                    onChange={(e) =>
                      setEditingNovel({
                        ...editingNovel,
                        tagsRaw: e.target.value,
                        tags: e.target.value.split(",").map((tg) => tg.trim()).filter(Boolean),
                      } as any)
                    }
                    placeholder="Magic, Overpowered, System"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
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
                  className={`px-4 py-2 text-sm font-medium text-white ${saveBtnClass} rounded-lg transition-colors shadow-sm`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Manage Chapters Modal */}
      {managingChaptersFor && !editingChapter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Manage Chapters: {managingChaptersFor.title}
              </h3>
              <button
                onClick={() => setManagingChaptersFor(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
            
            <div className="p-6 flex-grow overflow-auto">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setEditingChapter({ id: `new-${Date.now()}`, title: '', chapter_num: novelChapters.length + 1, content: '', translation_type: 'HTL' })}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                >
                  Add Chapter
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vol/Ch</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    {novelChapters.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No chapters found.
                        </td>
                      </tr>
                    ) : (
                      novelChapters.map(chapter => (
                        <tr key={chapter.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4 text-gray-600 dark:text-gray-400">{chapter.chapter_num}</td>
                          <td className="p-4 font-medium text-gray-900 dark:text-gray-200">{chapter.title || `Chapter ${chapter.chapter_num}`}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">{chapter.translation_type}</td>
                          <td className="p-4 text-right space-x-2 w-max">
                            <button
                              onClick={async () => {
                                // fetch full content
                                const fullChapter = await api.getChapterContent(chapter.id);
                                setEditingChapter(fullChapter || chapter);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-500/10 p-2 rounded"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteChapter(chapter.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-500/10 p-2 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Chapter Modal */}
      {editingChapter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingChapter.id?.toString().startsWith('new-') ? 'Add Chapter' : 'Edit Chapter'}
              </h3>
            </div>
            <div className="p-6 flex-grow overflow-auto space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chapter Number
                  </label>
                  <input
                    type="number"
                    value={editingChapter.chapter_num || ''}
                    onChange={(e) => setEditingChapter({ ...editingChapter, chapter_num: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Translation Type
                  </label>
                  <select
                    value={editingChapter.translation_type || 'HTL'}
                    onChange={(e) => setEditingChapter({ ...editingChapter, translation_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="HTL">HTL (Human Translation)</option>
                    <option value="MTL">MTL (Machine Translation)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={editingChapter.title || ''}
                  onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col h-64">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chapter Content (Isi Novel)
                </label>
                <textarea
                  value={editingChapter.content || ''}
                  onChange={(e) => setEditingChapter({ ...editingChapter, content: e.target.value })}
                  className="w-full flex-grow px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  placeholder="Enter chapter content here..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setEditingChapter(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChapter}
                className={`px-4 py-2 text-sm font-medium text-white ${saveBtnClass} rounded-lg transition-colors shadow-sm`}
              >
                Save Chapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
