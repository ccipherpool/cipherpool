import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Target, TrendingUp, Crown, Sword, Clock,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Wallet, Activity, ShieldCheck, Cpu, Zap, Radio,
  LayoutGrid, BarChart, Binary, Users2, Calendar,
  ExternalLink, Share2, Info, ChevronLeft, Hexagon,
  Gamepad2, ZapOff, Sparkles, Filter, MoreHorizontal
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { MovingBorder } from "../components/ui/MovingBorder";
import StoriesRow from "../social/components/StoriesRow";
import SeasonCountdown from "../components/SeasonCountdown";

// ── CUSTOM DASHBOARD COMPONENTS ──────────────────────────────────────────

/**
 * Animated Card with glassmorphism and hover effects
 */
const DashboardCard = ({ children, className = "", delay = 0, title = "", icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className={`group relative overflow-hidden rounded-[2.5rem] bg-[#0c111d]/60 backdrop-blur-2xl border border-white/5 hover:border-mint/20 transition-all duration-500 ${className}`}
  >
    {/* Glow Effect */}
    <div className="absolute -top-24 -right-24 w-48 h-48 bg-mint/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-mint/10 transition-colors duration-700" />
    
    <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
      {title && (
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2 rounded-xl bg-mint/10 text-mint border border-mint/10">
                   <Icon size={18} />
                </div>
              )}
              <h4 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
                {title}
              </h4>
           </div>
           <button className="text-slate-600 hover:text-white transition-colors">
              <MoreHorizontal size={16} />
           </button>
        </div>
      )}
      {children}
    </div>
  </motion.div>
);

/**
 * High-impact stat widget
 */
const BigStat = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5 }}
    className="flex flex-col gap-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
  >
    <div className="flex items-center justify-between">
       <div className={`p-3 rounded-2xl bg-white/5 ${color}`}>
          <Icon size={22} />
       </div>
       <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-slate-700">
          <Zap size={14} />
       </div>
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
         <h3 className="text-3xl md:text-5xl font-heading font-black text-white leading-none tracking-tighter truncate">
           {value}
         </h3>
         {sub && <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{sub}</span>}
      </div>
    </div>
  </motion.div>
);

// ── MAIN PAGE COMPONENT ──────────────────────────────────────────────────

export default function Dashboard() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [stats, setStats] = useState(null);
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      const [tourRes, statsRes, seasonRes] = await Promise.all([
        supabase.from("tournaments").select("*").in("status", ["registration_open", "published", "live"]).order('created_at', { ascending: false }).limit(4),
        supabase.from("player_stats").select("*").eq("user_id", profile?.id).maybeSingle(),
        supabase.from("seasons").select("*").eq("status", "active").maybeSingle()
      ]);

      setTournaments(tourRes.data || []);
      setStats(statsRes.data || null);
      setSeason(seasonRes.data || null);
      setLoading(false);
    };
    if (profile?.id) fetchData();
  }, [profile?.id]);

  const winRate = stats ? (stats.tournaments_played > 0 ? ((stats.wins / stats.tournaments_played) * 100).toFixed(0) : 0) : 0;
  const xpProgress = Math.min(((profile?.xp || 0) / 1000 * 100), 100);

  // Mock chart data with cyber theme
  const chartData = [
    { name: 'MON', points: 420 },
    { name: 'TUE', points: 750 },
    { name: 'WED', points: 580 },
    { name: 'THU', points: 1300 },
    { name: 'FRI', points: 950 },
    { name: 'SAT', points: 1800 },
    { name: 'SUN', points: 2400 },
  ];

  return (
    <div className="pb-24 pt-4 md:pt-8">
      {/* ── BACKGROUND ATMOSPHERE ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-mint/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-electric-purple/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-8 md:space-y-12">
        
        {/* ── HEADER & NAVIGATION ── */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-1">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-mint/10 border border-mint/20 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                   <span className="text-[10px] font-black text-mint uppercase tracking-widest">Active Session</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Matrix V4.8.2</span>
             </div>
             
             <h1 className="text-4xl md:text-7xl lg:text-9xl font-heading font-black tracking-tighter uppercase leading-[0.8] text-white">
               COMMAND<br/>
               <span className="text-gradient-mint">CENTER</span>
             </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             {season && (
               <motion.div 
                 whileHover={{ scale: 1.05 }}
                 className="p-4 md:p-6 rounded-[2rem] bg-obsidian-light/40 border border-white/5 backdrop-blur-xl flex items-center gap-5"
               >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyber-gold/20 to-transparent border border-cyber-gold/20 flex items-center justify-center">
                     <Trophy size={20} className="text-cyber-gold" />
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Seasonal Phase</p>
                     <p className="text-sm font-heading font-black text-white uppercase">{season.name}</p>
                  </div>
               </motion.div>
             )}
             
             <div className="p-4 md:p-6 rounded-[2rem] bg-obsidian-light/40 border border-white/5 backdrop-blur-xl flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint/20 to-transparent border border-mint/20 flex items-center justify-center">
                   <Radio size={20} className="text-mint animate-pulse" />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Global Ping</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-xl font-heading font-black text-white">24</span>
                      <span className="text-[10px] font-bold text-mint uppercase tracking-tighter">ms</span>
                   </div>
                </div>
             </div>
          </div>
        </header>

        {/* ── STORIES FEED ── */}
        <section className="relative overflow-visible">
           <StoriesRow profile={profile} />
        </section>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          
          {/* COLUMN LEFT: Hero & Stats */}
          <div className="md:col-span-8 space-y-6 lg:space-y-8">
            
            {/* FEATURED OPERATION (Cinematic Hero) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-[3rem] h-[450px] md:h-[650px] overflow-hidden group cursor-pointer border border-white/5 shadow-2xl"
            >
               {/* Cinematic Background */}
               <div className="absolute inset-0 z-0">
                  <img
                    src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2070"
                    className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110 ease-out"
                    alt="Operation"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-deep via-obsidian-deep/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-obsidian-deep/60 via-transparent to-transparent" />
               </div>

               {/* HUD Elements */}
               <div className="absolute inset-8 border-l border-t border-white/10 w-16 h-16 rounded-tl-2xl pointer-events-none" />
               <div className="absolute bottom-8 right-8 border-r border-b border-white/10 w-16 h-16 rounded-br-2xl pointer-events-none" />
               <div className="absolute top-1/2 left-8 -translate-y-1/2 space-y-4 hidden md:block opacity-30">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
                  ))}
               </div>

               {/* Content Overlay */}
               <div className="absolute inset-0 z-10 p-8 md:p-16 flex flex-col justify-end items-start gap-6">
                  <div className="flex flex-wrap items-center gap-4">
                     <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Priority Operation</span>
                     </div>
                     <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white/60">
                        Sector: S3-Alpha
                     </div>
                  </div>

                  <h2 className="text-5xl md:text-[8rem] font-heading font-black tracking-tighter text-white leading-[0.8] uppercase">
                    PHANTOM<br/><span className="text-mint">STRIKE</span>
                  </h2>

                  <p className="max-w-2xl text-slate-300 text-sm md:text-xl font-medium leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                    The elite regional qualifier has commenced. Deploy your squad to the frontline and secure dominance in the urban theater.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 md:gap-8 mt-4">
                     <Link to="/tournaments" className="px-10 py-5 md:px-14 md:py-7 rounded-[1.5rem] bg-mint text-obsidian font-heading font-black text-xs md:text-sm tracking-widest uppercase hover:shadow-neon-mint hover:scale-105 active:scale-95 transition-all">
                        Deploy Protocol
                     </Link>
                     <button className="px-10 py-5 md:px-14 md:py-7 rounded-[1.5rem] bg-white/5 border border-white/10 backdrop-blur-xl text-white font-heading font-black text-xs md:text-sm tracking-widest uppercase hover:bg-white/10 transition-all flex items-center gap-3">
                        Intel Review <Info size={16} />
                     </button>
                  </div>
               </div>
            </motion.div>

            {/* PERFORMANCE PERFORMANCE MATRIX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
               <DashboardCard title="Performance History" icon={Activity} className="md:col-span-1">
                  <div className="h-[220px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} 
                          dy={10}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#030406',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: '16px',
                            fontSize: '11px',
                            color: '#fff',
                            backdropBlur: '12px'
                          }}
                        />
                        <Area type="monotone" dataKey="points" stroke="#10B981" strokeWidth={3} fill="url(#chartGlow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </DashboardCard>

               <DashboardCard title="Seasonal Status" icon={Crown} className="md:col-span-1">
                  <div className="flex flex-col h-full justify-between gap-8 mt-2">
                     <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Rank Placement</p>
                        <div className="flex items-center gap-4">
                           <div className="text-5xl md:text-6xl font-heading font-black text-cyber-gold drop-shadow-neon-gold">
                              #{stats?.rank || '---'}
                           </div>
                           <div className="px-3 py-1 rounded-lg bg-cyber-gold/10 border border-cyber-gold/30">
                              <span className="text-[9px] font-black text-cyber-gold uppercase tracking-widest">National Tier 1</span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                           <span>Season Progress</span>
                           <span className="text-white">68%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: '68%' }}
                             className="h-full bg-cyber-gold rounded-full shadow-neon-gold"
                           />
                        </div>
                        <p className="text-[9px] font-medium text-slate-600 leading-relaxed italic">
                          "Maintain current performance to secure Elite Rewards at season end."
                        </p>
                     </div>
                  </div>
               </DashboardCard>
            </div>
          </div>

          {/* COLUMN RIGHT: Profile & Operations */}
          <div className="md:col-span-4 space-y-6 lg:space-y-8">
            
            {/* COMBAT PROFILE (Advanced) */}
            <DashboardCard>
               <div className="flex flex-col items-center text-center gap-8 py-4">
                  {/* Hexagonal Avatar Container */}
                  <div className="relative group/avatar cursor-pointer">
                     <div className="absolute -inset-10 bg-mint/20 rounded-full blur-[60px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-1000" />
                     
                     <div className="relative w-48 h-48 md:w-56 md:h-56">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                           <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="4" />
                           <motion.circle 
                             cx="50" cy="50" r="48" 
                             fill="none" 
                             stroke="#10B981" 
                             strokeWidth="4" 
                             strokeLinecap="round"
                             strokeDasharray="301.59"
                             initial={{ strokeDashoffset: 301.59 }}
                             animate={{ strokeDashoffset: 301.59 - (301.59 * xpProgress / 100) }}
                             transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                           />
                        </svg>
                        
                        <div className="absolute inset-4 rounded-full overflow-hidden border-2 border-white/5 bg-obsidian-deep group-hover/avatar:border-mint/50 transition-colors">
                           {profile?.avatar_url ? (
                             <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                           ) : (
                             <div className="w-full h-full bg-gradient-to-br from-mint/20 to-mint-dark/20 flex items-center justify-center">
                                <span className="text-7xl font-heading font-black text-mint">{profile?.username?.[0]?.toUpperCase()}</span>
                             </div>
                           )}
                        </div>
                        
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-mint text-obsidian px-5 py-2 rounded-xl font-black text-xs shadow-neon-mint border-4 border-obsidian-deep uppercase tracking-widest z-10">
                           LVL {profile?.level || 1}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <h3 className="text-4xl font-heading font-black text-white uppercase tracking-tighter">
                        {profile?.username || "OPERATIVE"}
                     </h3>
                     <div className="flex items-center justify-center gap-3">
                        <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                           UID: {profile?.id?.slice(0, 8).toUpperCase()}
                        </div>
                        <ShieldCheck size={14} className="text-mint" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                     <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left group-hover:bg-white/[0.04] transition-all">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Win Rate</p>
                        <p className="text-2xl font-heading font-black text-white">{winRate}%</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left group-hover:bg-white/[0.04] transition-all">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Victorries</p>
                        <p className="text-2xl font-heading font-black text-cyber-gold">{stats?.wins || 0}</p>
                     </div>
                  </div>

                  <Link to="/profile" className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-heading font-black text-[10px] tracking-widest uppercase hover:bg-mint hover:text-obsidian hover:border-mint transition-all shadow-xl group/prof">
                     Access Personnel File <ArrowUpRight size={14} className="inline ml-2 group-hover/prof:translate-x-1 transition-transform" />
                  </Link>
               </div>
            </DashboardCard>

            {/* LIVE OPERATIONS (Active Frontlines) */}
            <DashboardCard title="Active Frontlines" icon={Sword}>
               <div className="space-y-4">
                  {tournaments.length > 0 ? tournaments.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <Link to={`/tournaments/${t.id}`} className="block group/item">
                         <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-mint/30 hover:bg-mint/[0.03] transition-all duration-500">
                            <div className="w-14 h-14 rounded-2xl bg-obsidian-deep border border-white/10 flex items-center justify-center text-mint flex-shrink-0 group-hover/item:scale-110 group-hover/item:shadow-neon-mint transition-all duration-500 overflow-hidden relative">
                               {t.banner_url ? (
                                 <img src={t.banner_url} className="w-full h-full object-cover opacity-50" alt="" />
                               ) : (
                                 <Sword size={24} />
                               )}
                               <div className="absolute inset-0 bg-mint/5" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                  <p className="font-heading font-black text-white uppercase tracking-tight group-hover/item:text-mint transition-colors truncate text-sm">
                                    {t.name}
                                  </p>
                                  {t.status === 'live' && (
                                     <div className="px-1.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[6px] font-black text-red-500 uppercase">Live</span>
                                     </div>
                                  )}
                               </div>
                               <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                     <Wallet size={10} className="text-cyber-gold" />
                                     <span className="text-[9px] font-black text-cyber-gold uppercase">{t.prize_coins} CP</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                     <Users2 size={10} className="text-slate-500" />
                                     <span className="text-[9px] font-black text-slate-400 uppercase">{t.current_players}/{t.max_players}</span>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-slate-700 group-hover/item:text-mint group-hover/item:border-mint/30 transition-all">
                               <ChevronRight size={16} />
                            </div>
                         </div>
                      </Link>
                    </motion.div>
                  )) : (
                    <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                       <Radio size={40} className="text-slate-700 mx-auto mb-4 animate-pulse" />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                         SCANNING FREQUENCIES...<br/>NO ACTIVE FRONT FOUND
                       </p>
                    </div>
                  )}
                  
                  <Link to="/tournaments" className="block w-full py-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white hover:border-white/20 transition-all mt-4">
                     Review All Open Operations
                  </Link>
               </div>
            </DashboardCard>
          </div>
        </div>

        {/* ── FOOTER STATS (Assets & Economy) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative z-10 px-1">
           <BigStat 
             icon={Wallet} color="text-cyber-gold" 
             label="Financial Assets" value={(profile?.balance || 0).toLocaleString()} sub="CP" 
             delay={0.6} 
           />
           <BigStat 
             icon={Trophy} color="text-mint" 
             label="National Ranking" value={stats?.rank ? `#${stats.rank}` : '---'} sub="TOP 5%" 
             delay={0.7} 
           />
           <BigStat 
             icon={Flame} color="text-electric-purple" 
             label="Combat Streak" value="07d" sub="ACTIVE" 
             delay={0.8} 
           />
           <BigStat 
             icon={Medal} color="text-white" 
             label="Honor Badges" value="24" sub="XP BONUS" 
             delay={0.9} 
           />
        </section>

      </div>
    </div>
  );
}
