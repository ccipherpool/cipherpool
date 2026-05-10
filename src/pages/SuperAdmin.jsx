import { useState, useEffect } from "react";
import { useNavigate, Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  Users2, 
  Trophy, 
  Wallet, 
  BarChart3, 
  Activity, 
  Settings, 
  AlertCircle,
  Database,
  History,
  Lock,
  Zap,
  Layout,
  MoreVertical,
  ChevronRight
} from "lucide-react";

// Tabs
import DashboardTab    from "./superadmin/tabs/DashboardTab";
import UsersTab        from "./superadmin/tabs/UsersTab";
import TournamentsTab  from "./superadmin/tabs/TournamentsTab";
import ReportsTab      from "./superadmin/tabs/ReportsTab";
import EconomyTab      from "./superadmin/tabs/EconomyTab";
import SecurityTab     from "./superadmin/tabs/SecurityTab";
import LogsTab         from "./superadmin/tabs/LogsTab";
import SystemTab       from "./superadmin/tabs/SystemTab";
import SeasonsTab      from "./superadmin/tabs/SeasonsTab";

// Modals
import RoleModal          from "./superadmin/modals/RoleModal";
import BanModal           from "./superadmin/modals/BanModal";
import WalletModal        from "./superadmin/modals/WalletModal";
import DeleteConfirmModal from "./superadmin/modals/DeleteConfirmModal";
import TournamentModal    from "./superadmin/modals/TournamentModal";

const TABS = [
  { id: "dashboard",   label: "Control",     icon: BarChart3, color: "text-mint" },
  { id: "users",       label: "Units",       icon: Users2, color: "text-blue-400" },
  { id: "tournaments", label: "Operations",  icon: Trophy, color: "text-amber-400" },
  { id: "reports",     label: "Alerts",      icon: AlertCircle, color: "text-red-500" },
  { id: "economy",     label: "Logistics",   icon: Wallet, color: "text-emerald-400" },
  { id: "seasons",     label: "Campaigns",   icon: History, color: "text-cyber-gold" },
  { id: "logs",        label: "Audit",       icon: Database, color: "text-slate-400" },
  { id: "system",      label: "Kernel",      icon: Settings, color: "text-purple-400" },
];

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeTournaments: 0,
    totalCoins: 0,
    pendingReports: 0
  });

  // Global State for Tabs
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tournaments, setTournaments] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);

  useEffect(() => {
    if (profile && profile.role !== "super_admin") {
      navigate("/dashboard");
      return;
    }
    fetchGlobalData();
  }, [profile]);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const [
        { count: uCount },
        { data: uData },
        { data: tData },
        { data: rData },
        { data: lData }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: 'exact', head: true }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
        supabase.from("reports").select("*").eq("status", "pending"),
        supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(50)
      ]);

      setUsers(uData || []);
      setFilteredUsers(uData || []);
      setTournaments(tData || []);
      setReports(rData || []);
      setLogs(lData || []);
      
      setStats({
        totalUsers: uCount || 0,
        onlineUsers: Math.floor((uCount || 0) * 0.1), // Mock online
        activeTournaments: tData?.filter(t => t.status === 'active').length || 0,
        pendingReports: rData?.length || 0
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-obsidian-light/40 border border-white/10 p-8 md:p-12 rounded-[3rem] backdrop-blur-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12">
            <ShieldAlert size={240} />
         </div>
         <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
               <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Root Administrator</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter leading-none text-glow-red">
               SYSTEM <span className="text-white/40">OVERRIDE</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg uppercase tracking-widest max-w-xl">
               High-level operational control. Manage units, logistics, and system kernels from a centralized tactical hub.
            </p>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto relative z-10">
            {[
              { l: "Units", v: stats.totalUsers, c: "text-blue-400" },
              { l: "Ops", v: stats.activeTournaments, c: "text-amber-400" },
              { l: "Threats", v: stats.pendingReports, c: "text-red-500" },
              { l: "Uptime", v: "99.9%", c: "text-mint" }
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/5 px-6 py-4 rounded-2xl text-center backdrop-blur-md">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.l}</p>
                 <p className={`text-2xl font-impact ${s.c}`}>{s.v}</p>
              </div>
            ))}
         </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
         {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === tab.id 
                  ? 'bg-white text-obsidian border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-obsidian' : tab.color} />
              {tab.label}
            </button>
         ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px] relative">
         <AnimatePresence mode="wait">
            <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
            >
               {activeTab === "dashboard"   && <DashboardTab stats={stats} tournaments={tournaments} reports={reports} logs={logs} />}
               {activeTab === "users"       && <UsersTab filteredUsers={filteredUsers} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} setSelectedUser={setSelectedUser} setShowRoleModal={setShowRoleModal} setShowBanModal={setShowBanModal} setShowWalletModal={setShowWalletModal} />}
               {activeTab === "tournaments" && <TournamentsTab tournaments={tournaments} setTournaments={setTournaments} setSelectedTournament={setSelectedTournament} setShowTournamentModal={setShowTournamentModal} />}
               {activeTab === "reports"     && <ReportsTab reports={reports} />}
               {activeTab === "economy"     && <EconomyTab />}
               {activeTab === "seasons"     && <SeasonsTab />}
               {activeTab === "logs"        && <LogsTab logs={logs} users={users} />}
               {activeTab === "system"      && <SystemTab />}
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
         {showRoleModal && selectedUser && (
            <RoleModal user={selectedUser} onClose={() => setShowRoleModal(false)} onUpdate={fetchGlobalData} />
         )}
         {showBanModal && selectedUser && (
            <BanModal user={selectedUser} onClose={() => setShowBanModal(false)} onUpdate={fetchGlobalData} />
         )}
         {showWalletModal && selectedUser && (
            <WalletModal user={selectedUser} onClose={() => setShowWalletModal(false)} onUpdate={fetchGlobalData} />
         )}
      </AnimatePresence>

    </div>
  );
}
