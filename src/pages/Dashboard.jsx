import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Trophy, Target, TrendingUp, Crown, Sword, Clock,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Wallet, Activity, ShieldCheck, Cpu, Zap, Radio,
  LayoutGrid, BarChart, Binary, Users2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { MovingBorder } from "../components/ui/MovingBorder";
import StoriesRow from "../social/components/StoriesRow";

const chartData = [
  { name: '01', points: 400 },
  { name: '02', points: 700 },
  { name: '03', points: 550 },
  { name: '04', points: 1200 },
  { name: '05', points: 900 },
  { name: '06', points: 1500 },
  { name: '07', points: 2100 },
];

const BentoCell = ({ children, className = "", delay = 0, hasBorder = false, hoverEffect = true }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative h-full w-full p-4 md:p-8 flex flex-col group overflow-hidden rounded-[2rem] border border-white/5 bg-obsidian-light/30 backdrop-blur-xl ${hoverEffect ? 'hover:border-mint/30 hover:bg-obsidian-light/50 transition-all duration-500' : ''} ${className}`}
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-mint/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-mint/10 transition-colors duration-700" />
      {children}
    </motion.div>
  );

  if (hasBorder) {
    return (
      <div className={className}>
        <MovingBorder
          duration={8}
          colors={["#10B981", "#8B5CF6", "#F5C518"]}
          borderWidth={1}
          radius={32}
          className="bg-obsidian-deep/80 backdrop-blur-3xl"
        >
          <div className="p-4 md:p-8 flex flex-col h-full w-full relative z-10">
             {children}
          </div>
        </MovingBorder>
      </div>
    );
  }

  return content;
};

const StatBadge = ({ icon: Icon, label, value, colorClass }) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors">
    <div className={`p-2 rounded-xl bg-white/5 ${colorClass}`}>
      <Icon size={14} />
    </div>
    <div>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-heading font-black text-white leading-none">{value}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("tournaments").select("*").in("status", ["active", "upcoming"]).limit(3);
      setTournaments(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 md:space-y-12 pb-20 relative">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-mint/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-electric-purple/5 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Header Section */}
      <header className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 md:space-y-3">
          <div className="flex items-center gap-3">
             <div className="px-2 py-0.5 rounded-md bg-mint/10 border border-mint/20">
                <span className="text-[9px] md:text-[10px] font-black text-mint uppercase tracking-[0.2em]">Live Session</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-mint shadow-neon-mint animate-pulse" />
                <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocol 4.2 Active</span>
             </div>
          </div>
          <h1 className="text-3xl md:text-6xl lg:text-8xl font-heading font-black tracking-tighter uppercase leading-[0.9] text-white">
            OPERATIONAL<br/><span className="text-gradient-mint">DASHBOARD</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
           <div className="p-3 md:p-6 rounded-2xl md:rounded-[2rem] bg-obsidian-light/40 border border-white/5 backdrop-blur-xl flex items-center gap-3 md:gap-5 flex-1 md:flex-none">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-mint/20 to-mint/5 border border-mint/20 flex items-center justify-center">
                 <Radio size={20} className="text-mint animate-pulse" />
              </div>
              <div>
                 <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-0.5 md:mb-1">Latency</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-lg md:text-xl font-heading font-black text-white">24</span>
                    <span className="text-[8px] md:text-[10px] font-bold text-mint uppercase">ms</span>
                 </div>
              </div>
           </div>
           
           <div className="flex p-3 md:p-6 rounded-2xl md:rounded-[2rem] bg-obsidian-light/40 border border-white/5 backdrop-blur-xl items-center gap-3 md:gap-5 flex-1 md:flex-none">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyber-gold/20 to-cyber-gold/5 border border-cyber-gold/20 flex items-center justify-center">
                 <Binary size={20} className="text-cyber-gold" />
              </div>
              <div>
                 <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-0.5 md:mb-1">Sync</p>
                 <p className="text-[9px] md:text-xs font-mono font-bold text-white uppercase tracking-widest">STABLE_V2</p>
              </div>
           </div>
        </div>
      </header>

      {/* Stories Row */}
      <div className="relative z-10">
        <StoriesRow profile={profile} />
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 relative z-10">
        
        {/* Main Feature - Hero Tactical */}
        <BentoCell className="md:col-span-8 md:row-span-2 min-h-[350px] md:min-h-[600px] !p-0" hasBorder={true} delay={0.1}>
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2070"
              className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-all duration-1000 ease-out"
              alt="battlefield"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-deep via-obsidian-deep/40 to-transparent" />
            {/* HUD Overlay elements */}
            <div className="absolute top-8 left-8 border-l border-t border-mint/40 w-12 h-12 rounded-tl-xl opacity-50" />
            <div className="absolute bottom-8 right-8 border-r border-b border-mint/40 w-12 h-12 rounded-br-xl opacity-50" />
          </div>

          <div className="relative z-10 p-6 md:p-14 h-full flex flex-col justify-end items-start gap-4 md:gap-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Ongoing Operation</span>
            </div>
            
            <h2 className="text-4xl md:text-9xl font-heading font-black tracking-tighter text-white leading-[0.85] uppercase">
              PHANTOM<br/><span className="text-mint">STRIKE</span>
            </h2>
            
            <p className="max-w-2xl text-slate-300 text-xs md:text-xl font-medium leading-relaxed opacity-80">
              The elite regional qualifier has commenced. Deploy your squad to the frontline and claim your territory.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-8 mt-4">
              <button className="group/btn relative px-8 py-4 md:px-12 md:py-6 rounded-2xl bg-mint text-obsidian font-heading font-black text-xs md:text-sm tracking-widest uppercase overflow-hidden transition-all hover:shadow-neon-mint hover:scale-[1.02] active:scale-95">
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                 <span className="relative z-10">Deploy Now</span>
              </button>
              <button className="px-8 py-4 md:px-12 md:py-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-white font-heading font-black text-xs md:text-sm tracking-widest uppercase hover:bg-white/10 transition-all">
                 Intel Report
              </button>
            </div>
          </div>
        </BentoCell>

        {/* Combat Profile */}
        <BentoCell className="md:col-span-4 md:row-span-2 flex flex-col items-center justify-between text-center gap-6" delay={0.2}>
          <div className="w-full flex justify-between items-center mb-4">
             <div className="p-2 rounded-lg bg-white/5 border border-white/5"><LayoutGrid size={16} className="text-slate-500" /></div>
             <div className="px-3 py-1 rounded-full bg-cyber-gold/10 border border-cyber-gold/20">
                <span className="text-[8px] font-black text-cyber-gold uppercase tracking-[0.2em]">Elite Status</span>
             </div>
          </div>

          <div className="relative group/avatar">
            <div className="absolute -inset-8 bg-mint/20 rounded-full blur-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700" />
            <div className="relative w-32 h-32 md:w-56 md:h-56">
               <svg className="absolute inset-0 w-full h-full -rotate-90 opacity-20" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
               </svg>
               <div className="absolute inset-0 p-3">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-mint/30 animate-[spin_15s_linear_infinite]" />
               </div>
               <div className="absolute inset-4 rounded-full bg-obsidian-deep border border-white/10 p-1">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center overflow-hidden border-2 border-obsidian-deep">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                      <span className="text-4xl md:text-7xl font-heading font-black text-obsidian">{profile?.username?.[0]?.toUpperCase() || 'P'}</span>
                    )}
                  </div>
               </div>
               <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-mint text-obsidian px-4 py-1.5 rounded-xl font-black text-[10px] md:text-xs shadow-neon-mint border-2 border-obsidian-deep uppercase tracking-widest">
                  Level {profile?.level || 1}
               </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl md:text-4xl font-heading font-black text-white uppercase tracking-tight">{profile?.username || "Agent"}</h3>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-mint" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Verified Combatant</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 mt-4">
             <StatBadge icon={Target} label="Accuracy" value="78%" colorClass="text-mint" />
             <StatBadge icon={Trophy} label="Victories" value="142" colorClass="text-cyber-gold" />
             <StatBadge icon={TrendingUp} label="K/D Ratio" value="2.84" colorClass="text-electric-purple" />
             <StatBadge icon={Medal} label="Rank" value="#12" colorClass="text-slate-400" />
          </div>

          <div className="w-full pt-6 border-t border-white/5 space-y-3">
             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                <span>XP Progression</span>
                <span className="text-white">74%</span>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "74%" }}
                  className="h-full bg-gradient-to-r from-mint to-mint-dark rounded-full shadow-neon-mint"
                />
             </div>
          </div>
        </BentoCell>

        {/* Combat Metrics Chart */}
        <BentoCell className="md:col-span-6 md:row-span-2 min-h-[400px]" delay={0.3}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-mint/10 border border-mint/20 rounded-2xl">
                 <BarChart size={20} className="text-mint" />
              </div>
              <div>
                <h4 className="text-lg md:text-2xl font-heading font-black text-white uppercase tracking-tight">Intelligence</h4>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance Matrix</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
               {['D', 'W', 'M'].map(t => (
                 <button key={t} className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all border ${t === 'W' ? 'bg-mint text-obsidian border-mint' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}>
                    {t}
                 </button>
               ))}
            </div>
          </div>
          <div className="w-full" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
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
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030406',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '16px',
                    fontSize: '11px',
                    color: '#fff',
                    backdropBlur: '12px'
                  }}
                  cursor={{ stroke: 'rgba(16,185,129,0.2)', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="points"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#cyberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCell>

        {/* Deployments List */}
        <BentoCell className="md:col-span-6 md:row-span-2" delay={0.4}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-cyber-gold/10 border border-cyber-gold/20 rounded-2xl">
                  <Sword size={20} className="text-cyber-gold" />
               </div>
               <div>
                  <h4 className="text-lg md:text-2xl font-heading font-black text-white uppercase tracking-tight">Operations</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Frontlines</p>
               </div>
            </div>
            <Link to="/tournaments" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
              All Deployments <ArrowUpRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {tournaments.length > 0 ? tournaments.map((t, i) => (
              <Link key={i} to={`/tournaments/${t.id}`} className="block group/item">
                <div className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-mint/30 hover:bg-mint/[0.02] transition-all duration-500">
                  <div className="w-16 h-16 rounded-2xl bg-obsidian-deep border border-white/10 flex items-center justify-center text-mint flex-shrink-0 group-hover/item:scale-110 group-hover/item:shadow-neon-mint transition-all duration-500">
                    <Sword size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-heading font-black text-white uppercase tracking-tight group-hover/item:text-mint transition-colors truncate text-sm md:text-base">{t.name}</p>
                      {t.status === 'active' && (
                         <div className="px-2 py-0.5 rounded bg-mint/20 border border-mint/30 flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-mint animate-pulse" />
                            <span className="text-[7px] font-black text-mint uppercase">Live</span>
                         </div>
                      )}
                    </div>
                    <div className="flex items-center gap-5">
                       <div className="flex items-center gap-1.5">
                          <Wallet size={12} className="text-cyber-gold" />
                          <span className="text-[10px] font-black text-cyber-gold uppercase">{t.prize_coins} CP</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                          <Users2 size={12} className="text-slate-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">{t.current_players}/{t.max_players}</span>
                       </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-700 group-hover/item:text-mint group-hover/item:border-mint/30 transition-all">
                     <ChevronRight size={18} />
                  </div>
                </div>
              </Link>
            )) : (
              <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                 <Radio size={40} className="text-slate-700 mx-auto mb-4 animate-pulse" />
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scanning for active operations...</p>
              </div>
            )}
          </div>
        </BentoCell>

        {/* Global Economy Stats */}
        {[
          { icon: Wallet,  color: 'text-cyber-gold',      label: 'Financial Assets', value: '12.5k', sub: 'Cyber Points',    delay: 0.5 },
          { icon: Trophy,  color: 'text-mint',             label: 'Sector Rank',      value: '#124',  sub: 'National Tier',   delay: 0.6 },
          { icon: Flame,   color: 'text-electric-purple',  label: 'Combat Streak',    value: '07d',   sub: 'Daily Activity',  delay: 0.7 },
          { icon: Medal,   color: 'text-white',            label: 'Honor Badges',     value: '24',    sub: 'Achievement XP',  delay: 0.8 },
        ].map(({ icon: Icon, color, label, value, sub, delay }, idx) => (
          <BentoCell key={idx} className="md:col-span-3 flex flex-col justify-between h-48 md:h-56 p-6" delay={delay}>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5"><Icon size={20} className={color} /></div>
              <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center">
                 <Zap size={12} className="text-slate-700" />
              </div>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{label}</p>
              <p className="text-3xl md:text-5xl font-heading font-black text-white uppercase leading-none tracking-tighter mb-1">{value}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{sub}</p>
            </div>
          </BentoCell>
        ))}

      </div>
    </div>
  );
}
