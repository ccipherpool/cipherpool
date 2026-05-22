import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
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

const StatCard = ({ label, value, icon: Icon, color = "text-blue-500", delay = 0, rotation = "rotate-[-1deg]" }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className={cn(
      "card-creative p-6 flex flex-col justify-between group overflow-hidden bg-white dark:bg-zinc-900",
      rotation
    )}
  >
     <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
        <Icon size={80} />
     </div>
     <div className="flex justify-between items-start relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center transition-transform group-hover:scale-110",
          color
        )}>
           <Icon size={24} />
        </div>
        <div className="text-right">
           <p className="font-handwritten text-lg text-zinc-600 dark:text-zinc-400 mb-1">{label}</p>
           <p className={cn("text-4xl font-bold leading-none font-handwritten", color)}>{value}</p>
        </div>
     </div>
     <div className="mt-6 pt-4 border-t-2 border-zinc-900 dark:border-white flex justify-between items-center font-handwritten text-lg text-zinc-600 dark:text-zinc-400 relative z-10">
        <span>Status: Synced</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 border border-zinc-900 dark:border-white" />
          <div className="w-2 h-2 rounded-full bg-green-500 border border-zinc-900 dark:border-white animate-pulse" />
        </div>
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
       <div className="w-16 h-16 border-4 border-zinc-900 dark:border-white border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-12 pb-20 px-4">
      
      {/* Admin Header */}
      <div className="relative group rotate-[-0.5deg]">
         <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
         <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-white p-8 md:p-12 rounded-[2rem] shadow-[8px_8px_0px_0px] shadow-zinc-900 dark:shadow-white">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12">
               <ShieldCheck size={240} />
            </div>
            <div className="space-y-4 relative z-10">
               <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border-2 border-zinc-900 dark:border-white bg-amber-400 text-zinc-900 font-handwritten text-xl rotate-[-2deg]">
                  <ShieldCheck size={20} /> Administrative Hub
               </div>
               <h1 className="text-4xl md:text-7xl font-bold text-zinc-900 dark:text-white leading-none font-handwritten">
                  CONTROL <span className="text-blue-500 underline decoration-wavy">CENTER</span>
               </h1>
               <p className="font-handwritten text-2xl text-zinc-600 dark:text-zinc-400 max-w-xl">
                  Platform oversight and squadron management. Execute high-level protocols from the localized node. ✨
               </p>
            </div>

            <div className="flex items-center gap-4 relative z-10 rotate-[2deg]">
               <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-white rounded-xl flex items-center gap-4 shadow-[4px_4px_0px_0px] shadow-zinc-900 dark:shadow-white">
                  <Activity size={24} className="text-blue-500 animate-pulse" />
                  <div className="text-right">
                     <p className="font-handwritten text-sm text-zinc-500 uppercase tracking-widest">Protocol Sync</p>
                     <p className="font-handwritten text-lg font-bold text-zinc-900 dark:text-white uppercase">Active // Stable</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <StatCard label="Total Units" value={stats.totalUsers} icon={Users2} color="text-blue-500" delay={0.1} rotation="rotate-[-1deg]" />
         <StatCard label="Verified Ops" value={stats.verifiedUsers} icon={ShieldCheck} color="text-green-500" delay={0.2} rotation="rotate-[1deg]" />
         <StatCard label="Live Missions" value={stats.totalTournaments} icon={Trophy} color="text-amber-500" delay={0.3} rotation="rotate-[-2deg]" />
         <StatCard label="Economy Assets" value={stats.totalCoins.toLocaleString()} icon={Wallet} color="text-purple-500" delay={0.4} rotation="rotate-[2deg]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         
         {/* Operations Queue */}
         <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
               <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <Zap size={32} className="text-amber-500" /> Operational Deployment ⚔️
               </h3>
               <Link to="/create-tournament">
                  <button className="btn-creative bg-amber-400 text-zinc-900 hover:bg-amber-300 flex items-center gap-2">
                     <PlusCircle size={20} /> Initialize Mission
                  </button>
               </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {recentTournaments.map((t, i) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "card-creative p-6 flex flex-col justify-between group bg-white dark:bg-zinc-900",
                      i % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"
                    )}
                  >
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 text-amber-500 group-hover:scale-110 transition-transform">
                           <Trophy size={24} />
                        </div>
                        <span className={cn(
                          "font-handwritten px-4 py-1 rounded-full border-2 border-zinc-900 dark:border-white text-lg rotate-12",
                          t.status === 'active' ? 'bg-green-400 text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        )}>
                           {t.status}!
                        </span>
                     </div>
                     <div>
                        <h4 className="text-2xl font-bold text-zinc-900 dark:text-white font-handwritten truncate mb-1">{t.name}</h4>
                        <div className="flex justify-between items-center mt-6">
                           <div className="flex items-center gap-3 font-handwritten text-xl text-zinc-600 dark:text-zinc-400">
                              <Users2 size={20} /> {t.current_players}/{t.max_players}
                           </div>
                           <Link to={`/tournaments/${t.id}/manage`} className="font-handwritten text-xl text-blue-500 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Command ✎
                           </Link>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>

         {/* Command Links */}
         <div className="lg:col-span-4 space-y-8">
            <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-3">
               <Layout size={32} className="text-blue-500" /> Protocol Links ✏️
            </h3>
            <div className="card-creative p-6 space-y-4 bg-white dark:bg-zinc-900 rotate-[1deg]">
               {[
                 { to: "/admin/support", icon: ShieldCheck, label: "Tactical Support", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
                 { to: "/admin/results", icon: BarChart3, label: "Combat Results", color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
                 { to: "/admin/news", icon: Newspaper, label: "Intelligence Feed", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
                 { to: "/admin-store", icon: ShoppingBag, label: "Logistic Store", color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
                 { to: "/chat", icon: MessageSquare, label: "Global Comms", color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
               ].map((link, idx) => (
                  <Link key={link.to} to={link.to} className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 border-transparent hover:border-zinc-900 dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group",
                    idx % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"
                  )}>
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-[2px_2px_0px_0px] shadow-zinc-900 dark:shadow-white",
                          link.bg, link.color
                        )}>
                           <link.icon size={18} />
                        </div>
                        <span className="font-handwritten text-xl text-zinc-900 dark:text-white transition-colors">{link.label}</span>
                     </div>
                     <ChevronRight size={20} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </Link>
               ))}
            </div>
         </div>

      </div>

      {/* Recent Enlistment */}
      <div className="space-y-8">
         <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Users2 size={32} className="text-purple-500" /> Unit Registry 📋
         </h3>
         <div className="card-creative overflow-hidden bg-white dark:bg-zinc-900 p-0 rotate-[-0.5deg]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800 border-b-2 border-zinc-900 dark:border-white">
                      <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white">Identified Unit</th>
                      <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white">Protocol Role</th>
                      <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white">Enlistment Date</th>
                      <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white text-right">Sync</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-zinc-900 dark:divide-white">
                    {recentUsers.map(user => (
                      <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
                          <td className="px-8 py-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center bg-blue-100 text-blue-600 font-handwritten text-2xl shadow-[2px_2px_0px_0px] shadow-zinc-900">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <p className="font-handwritten text-2xl text-zinc-900 dark:text-white">{user.username || "Unknown"}</p>
                                <p className="font-handwritten text-lg text-zinc-500">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-handwritten text-xl px-4 py-1 rounded-full border-2 border-zinc-900 dark:border-white bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rotate-2 inline-block">
                                {user.role}
                            </span>
                          </td>
                          <td className="px-8 py-6 font-handwritten text-xl text-zinc-600 dark:text-zinc-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <Link to="/admin" className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-900 text-zinc-500 hover:text-blue-500 hover:bg-blue-50 transition-all shadow-[2px_2px_0px_0px] shadow-zinc-900">
                                <ExternalLink size={18} />
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

