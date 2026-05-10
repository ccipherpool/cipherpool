import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Users2, 
  Trophy, 
  Wallet, 
  PlusCircle, 
  Activity, 
  BarChart3, 
  Search,
  Filter,
  ChevronRight,
  ExternalLink,
  Zap,
  Layout,
  MessageSquare,
  AlertCircle,
  Newspaper,
  ShoppingBag
} from "lucide-react";
import Button from "../components/ui/Button";

const StatCard = ({ label, value, icon: Icon, color = "text-mint", delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="ultra-glass p-6 flex flex-col justify-between group border-white/5 relative overflow-hidden"
  >
     <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={80} />
     </div>
     <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
           <Icon size={24} />
        </div>
        <div className="text-right">
           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
           <p className={`text-3xl font-impact uppercase leading-none ${color}`}>{value}</p>
        </div>
     </div>
     <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-600 relative z-10">
        <span>Network Status</span>
        <span className="text-mint">Synced</span>
     </div>
  </motion.div>
);

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
        supabase.from("profiles").select("id,username,email,role,created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalCoins = (walletSum || []).reduce((s, w) => s + (w.balance || 0), 0);

      setStats({
        totalUsers: usersCount || 0,
        verifiedUsers: verifiedCount || 0,
        totalCoins,
        totalTournaments: tournamentsCount || 0,
      });
      setRecentTournaments(recentT || []);
      setRecentUsers(recentU || []);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-obsidian-light/40 border border-white/10 p-8 md:p-12 rounded-[3rem] backdrop-blur-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12">
            <ShieldCheck size={240} />
         </div>
         <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
               <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">Administrative Hub</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter leading-none">
               CONTROL <span className="text-white/40">CENTER</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg uppercase tracking-widest max-w-xl">
               Platform oversight and squadron management. Execute high-level protocols from the localized node.
            </p>
         </div>

         <div className="flex items-center gap-4 relative z-10">
            <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-4 border border-white/5">
               <Activity size={20} className="text-orange-500 animate-pulse" />
               <div className="text-right">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Protocol Sync</p>
                  <p className="text-xs font-bold text-white uppercase">Active // Stable</p>
               </div>
            </div>
         </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard label="Total Units" value={stats.totalUsers} icon={Users2} color="text-blue-400" delay={0.1} />
         <StatCard label="Verified Ops" value={stats.verifiedUsers} icon={ShieldCheck} color="text-mint" delay={0.2} />
         <StatCard label="Live Missions" value={stats.totalTournaments} icon={Trophy} color="text-cyber-gold" delay={0.3} />
         <StatCard label="Economy Assets" value={stats.totalCoins.toLocaleString()} icon={Wallet} color="text-emerald-400" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* Operations Queue */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <Zap size={24} className="text-cyber-gold" /> Operational Deployment
               </h3>
               <Link to="/create-tournament">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:border-mint/30 hover:text-mint transition-all">
                     <PlusCircle size={14} /> Initialize Mission
                  </button>
               </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recentTournaments.map((t, i) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-6 flex flex-col justify-between group hover:border-mint/20"
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-white/5 text-mint group-hover:scale-110 transition-transform">
                           <Trophy size={20} />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          t.status === 'active' ? 'bg-mint/10 text-mint border-mint/20' : 'bg-white/5 text-slate-500 border-white/5'
                        }`}>
                           {t.status}
                        </span>
                     </div>
                     <div>
                        <h4 className="font-bold text-white uppercase tracking-tight truncate mb-1">{t.name}</h4>
                        <div className="flex justify-between items-center mt-4">
                           <div className="flex items-center gap-3 text-[9px] font-black text-slate-600 uppercase">
                              <Users2 size={12} /> {t.current_players}/{t.max_players}
                           </div>
                           <Link to={`/tournaments/${t.id}/manage`} className="text-[9px] font-black text-mint uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Command <ChevronRight size={12} />
                           </Link>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>

         {/* Command Links */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
               <Layout size={24} className="text-blue-400" /> Protocol Links
            </h3>
            <div className="ultra-glass p-6 space-y-2 border-white/5">
               {[
                 { to: "/admin/support", icon: ShieldCheck, label: "Tactical Support", color: "text-blue-400" },
                 { to: "/admin/results", icon: BarChart3, label: "Combat Results", color: "text-purple-400" },
                 { to: "/admin/news", icon: Newspaper, label: "Intelligence Feed", color: "text-amber-500" },
                 { to: "/admin-store", icon: ShoppingBag, label: "Logistic Store", color: "text-orange-500" },
                 { to: "/chat", icon: MessageSquare, label: "Global Commms", color: "text-mint" },
               ].map(link => (
                  <Link key={link.to} to={link.to} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] transition-all group">
                     <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg bg-white/5 ${link.color} group-hover:scale-110 transition-transform`}>
                           <link.icon size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-white uppercase transition-colors">{link.label}</span>
                     </div>
                     <ChevronRight size={14} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </Link>
               ))}
            </div>
         </div>

      </div>

      {/* Recent Enlistment */}
      <div className="space-y-6">
         <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Users2 size={24} className="text-purple-400" /> Unit Registry
         </h3>
         <div className="ultra-glass overflow-hidden border-white/5">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-white/[0.03] border-b border-white/5">
                     <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identified Unit</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Role</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Enlistment Date</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sync</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {recentUsers.map(user => (
                     <tr key={user.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-8 py-6 flex items-center gap-4">
                           <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-impact text-slate-600">
                              {user.username?.[0]?.toUpperCase() || 'U'}
                           </div>
                           <div>
                              <p className="font-bold text-white uppercase tracking-tight">{user.username || "Unknown"}</p>
                              <p className="text-[10px] text-slate-600 font-medium">{user.email}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              {user.role}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-[10px] font-medium text-slate-500 uppercase">
                           {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-6">
                           <Link to="/admin" className="p-2 rounded-lg bg-white/5 text-slate-700 hover:text-mint transition-colors">
                              <ExternalLink size={14} />
                           </Link>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}
