import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  ShieldCheck, Users2, Trophy, Wallet, PlusCircle,
  Activity, BarChart3, ChevronRight, ExternalLink,
  Zap, Layout, MessageSquare, Newspaper, ShoppingBag,
  TrendingUp, Shield,
} from "lucide-react";

const StatCard = ({ label, value, icon: Icon, accent = "violet", delay = 0 }) => {
  const accents = {
    violet: { text: "text-violet-400", bg: "bg-[rgba(139,92,246,0.08)]", border: "border-[rgba(139,92,246,0.18)]", glow: "rgba(139,92,246,0.3)" },
    cyan:   { text: "text-cyan-400",   bg: "bg-[rgba(6,182,212,0.08)]",   border: "border-[rgba(6,182,212,0.18)]",   glow: "rgba(6,182,212,0.3)" },
    gold:   { text: "text-yellow-400", bg: "bg-[rgba(234,179,8,0.08)]",   border: "border-[rgba(234,179,8,0.18)]",   glow: "rgba(234,179,8,0.3)" },
    green:  { text: "text-emerald-400",bg: "bg-[rgba(16,185,129,0.08)]",  border: "border-[rgba(16,185,129,0.18)]",  glow: "rgba(16,185,129,0.3)" },
  };
  const a = accents[accent] ?? accents.violet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative p-5 rounded-2xl bg-white/[0.03] border ${a.border} overflow-hidden`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.bg} ${a.text}`}>
          <Icon size={16} />
        </div>
        <TrendingUp size={12} className="text-white/15" />
      </div>
      <p className="text-2xl font-bold text-white leading-none mb-1">{value}</p>
      <p className="text-xs text-white/40">{label}</p>
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${a.glow}, transparent)` }}
      />
    </motion.div>
  );
};

export default function AdminDashboard() {
  const { profile } = useOutletContext() || {};
  const [stats, setStats] = useState({ totalUsers: 0, verifiedUsers: 0, totalCoins: 0, totalTournaments: 0 });
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        { count: usersCount },
        { count: verifiedCount },
        { count: tournamentsCount },
        { data: walletSum },
        { data: recentT },
        { data: recentU },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved"),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("wallets").select("balance"),
        supabase.from("tournaments").select("id,name,status,prize_coins,current_players,max_players,created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("id,username,email,role,created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const totalCoins = (walletSum || []).reduce((s, w) => s + (w.balance || 0), 0);
      setStats({ totalUsers: usersCount || 0, verifiedUsers: verifiedCount || 0, totalCoins, totalTournaments: tournamentsCount || 0 });
      setRecentTournaments(recentT || []);
      setRecentUsers(recentU || []);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-[rgba(139,92,246,0.3)] border-t-violet-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-12">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={13} className="text-orange-400" />
            <span className="text-xs font-medium text-orange-400">Admin</span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-xs text-white/35">Control Panel</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-white/40 mt-1">Platform oversight and management</p>
        </div>
        <Link
          to="/create-tournament"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.25)] text-violet-400 text-sm font-medium hover:bg-[rgba(139,92,246,0.18)] transition-all"
        >
          <PlusCircle size={14} />
          New Tournament
        </Link>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"     value={stats.totalUsers}                icon={Users2}     accent="violet" delay={0.05} />
        <StatCard label="Verified"        value={stats.verifiedUsers}             icon={ShieldCheck} accent="green"  delay={0.10} />
        <StatCard label="Tournaments"     value={stats.totalTournaments}          icon={Trophy}     accent="gold"   delay={0.15} />
        <StatCard label="Economy (CP)"    value={stats.totalCoins.toLocaleString()} icon={Wallet}   accent="cyan"   delay={0.20} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Tournaments */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-sm font-medium text-white/70">Recent Tournaments</span>
            </div>
            <Link to="/tournaments" className="text-xs text-violet-400/60 hover:text-violet-400 transition-colors">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentTournaments.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10] transition-all"
              >
                <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)] flex items-center justify-center">
                  <Trophy size={14} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/85 truncate">{t.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-white/35">{t.current_players ?? 0}/{t.max_players ?? "∞"}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                      t.status === "live" ? "bg-red-500/15 text-red-400" :
                      t.status === "registration_open" ? "bg-emerald-500/15 text-emerald-400" :
                      "bg-white/[0.06] text-white/35"
                    }`}>{t.status}</span>
                  </div>
                </div>
                <Link
                  to={`/tournaments/${t.id}/manage`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06]"
                >
                  <ExternalLink size={13} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <Layout size={14} className="text-white/40" />
            <span className="text-sm font-medium text-white/70">Quick Links</span>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            {[
              { to: "/admin/support",  icon: ShieldCheck,   label: "Support Tickets",  sub: "Manage reports" },
              { to: "/admin/results",  icon: BarChart3,     label: "Match Results",    sub: "Review outcomes" },
              { to: "/admin/news",     icon: Newspaper,     label: "News Feed",        sub: "Publish updates" },
              { to: "/admin-store",    icon: ShoppingBag,   label: "Store Manager",    sub: "Items & pricing" },
              { to: "/chat",           icon: MessageSquare, label: "Global Chat",      sub: "Monitor comms" },
            ].map((link, idx) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-all group ${idx !== 0 ? "border-t border-white/[0.04]" : ""}`}
              >
                <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-white/[0.04] flex items-center justify-center text-white/40 group-hover:text-violet-400 group-hover:bg-[rgba(139,92,246,0.08)] transition-all">
                  <link.icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{link.label}</p>
                  <p className="text-xs text-white/30">{link.sub}</p>
                </div>
                <ChevronRight size={13} className="text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users2 size={14} className="text-white/40" />
          <span className="text-sm font-medium text-white/70">Recent Registrations</span>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3 text-xs font-medium text-white/35">User</th>
                  <th className="px-5 py-3 text-xs font-medium text-white/35">Role</th>
                  <th className="px-5 py-3 text-xs font-medium text-white/35 hidden sm:table-cell">Joined</th>
                  <th className="px-5 py-3 text-xs font-medium text-white/35 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user, idx) => (
                  <tr key={user.id} className={`hover:bg-white/[0.03] transition-colors ${idx !== 0 ? "border-t border-white/[0.04]" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                          style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
                        >
                          {user.username?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/85">{user.username || "Unknown"}</p>
                          <p className="text-xs text-white/35 truncate max-w-[160px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        user.role === "admin" || user.role === "super_admin"
                          ? "bg-[rgba(139,92,246,0.12)] text-violet-400 border border-[rgba(139,92,246,0.20)]"
                          : "bg-white/[0.06] text-white/40"
                      }`}>
                        {user.role || "user"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/35 hidden sm:table-cell">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to="/admin"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white/25 hover:text-white hover:bg-white/[0.06] transition-all"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
