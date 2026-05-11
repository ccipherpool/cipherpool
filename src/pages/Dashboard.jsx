import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Trophy, Target, TrendingUp, Crown, Sword, Clock,
  ChevronRight, ArrowUpRight, Flame, Star, Medal,
  Wallet, Activity, ShieldCheck, Cpu
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { MovingBorder } from "../components/ui/MovingBorder";

const chartData = [
  { name: '01', points: 400 },
  { name: '02', points: 700 },
  { name: '03', points: 550 },
  { name: '04', points: 1200 },
  { name: '05', points: 900 },
  { name: '06', points: 1500 },
  { name: '07', points: 2100 },
];

const BentoCell = ({ children, className = "", delay = 0, hasBorder = false }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative h-full w-full p-4 md:p-8 flex flex-col group ${!hasBorder ? 'ultra-glass bg-white/[0.02]' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );

  if (hasBorder) {
    return (
      <div className={className}>
        <MovingBorder
          duration={5}
          colors={["#10B981", "#8B5CF6", "#F5C518"]}
          borderWidth={2}
          radius={32}
          className="bg-obsidian-light/60 backdrop-blur-3xl"
        >
          {content}
        </MovingBorder>
      </div>
    );
  }

  return content;
};

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
    <div className="space-y-4 md:space-y-10 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-mint shadow-neon-mint animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-mint">System Status: Optimal</span>
          </div>
          <h1 className="text-2xl md:text-7xl font-heading font-black tracking-tighter uppercase leading-none">
            COMMAND <span className="text-gradient-mint">CENTER</span>
          </h1>
          <p className="text-slate-500 font-medium text-xs md:text-lg">
            Welcome back, <span className="text-white">Agent {profile?.username || profile?.email?.split('@')[0]}</span>
          </p>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="ultra-glass bg-white/[0.02] border-white/5 px-6 py-4 flex items-center gap-4">
            <Cpu size={20} className="text-slate-600" />
            <div className="h-10 w-[1px] bg-white/5" />
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cluster</p>
              <p className="text-xs font-mono font-bold text-white uppercase">MA-NORTH-01</p>
            </div>
          </div>
          <div className="ultra-glass bg-white/[0.02] border-white/5 px-6 py-4 flex items-center gap-4">
            <Clock size={20} className="text-slate-600" />
            <div className="h-10 w-[1px] bg-white/5" />
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Local Sync</p>
              <p className="text-xs font-mono font-bold text-white uppercase">08:42:15</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-auto gap-3 md:gap-8">

        {/* Hero Card */}
        <BentoCell className="md:col-span-8 md:row-span-2 min-h-[200px] md:min-h-[500px] !p-0 overflow-hidden" hasBorder={true} delay={0.1}>
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070"
              className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
              alt="hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-deep via-obsidian-deep/60 to-transparent" />
          </div>

          <div className="relative z-10 p-4 md:p-12 h-full flex flex-col justify-end items-start gap-3 md:gap-6">
            <div className="flex items-center gap-2 bg-mint/10 backdrop-blur-md border border-mint/20 px-3 py-1 rounded-full">
              <div className="w-1 h-1 rounded-full bg-mint animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-mint">Priority Event</span>
            </div>
            <h2 className="text-2xl md:text-8xl font-heading font-black tracking-tighter text-white leading-[0.85] uppercase">
              ULTIMATE<br/><span className="text-cyber-gold">LEGENDS</span>
            </h2>
            <p className="max-w-xl text-slate-300 text-[11px] md:text-lg font-medium leading-relaxed hidden md:block">
              Stage 4 of the National Championship is now live. Complete tactical objectives to secure your position.
            </p>
            <div className="flex items-center gap-3 md:gap-6">
              <button className="bg-mint text-obsidian px-5 py-2 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-heading font-black text-[10px] md:text-xs tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-neon-mint">
                Synchronize
              </button>
              <button className="bg-white/5 border border-white/10 backdrop-blur-xl text-white px-5 py-2 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-heading font-black text-[10px] md:text-xs tracking-widest uppercase hover:bg-white/10 transition-all">
                Objectives
              </button>
            </div>
          </div>
        </BentoCell>

        {/* Profile Summary */}
        <BentoCell className="md:col-span-4 md:row-span-2 flex flex-col items-center justify-center text-center gap-4 md:gap-8" delay={0.2}>
          <div className="relative group">
            <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-mint via-cyber-gold to-electric-purple rounded-[2rem] md:rounded-[3rem] blur-xl md:blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-1000 animate-pulse-slow" />
            <div className="relative w-20 h-20 md:w-48 md:h-48 rounded-[1.5rem] md:rounded-[2.5rem] bg-obsidian-deep border-2 border-white/10 p-1 md:p-2">
              <div className="w-full h-full rounded-[1.2rem] md:rounded-[2rem] bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <span className="text-2xl md:text-6xl font-heading font-black text-obsidian">{profile?.username?.[0]?.toUpperCase() || 'P'}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 bg-cyber-gold text-obsidian px-2 py-1 md:px-4 md:py-2 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm shadow-neon-gold border-2 md:border-4 border-obsidian-deep">
                LVL {profile?.level || 1}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base md:text-3xl font-heading font-black text-white uppercase tracking-tight">{profile?.username || "Agent"}</h3>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck size={12} className="text-mint" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Verified Combatant</span>
            </div>
          </div>

          <div className="w-full space-y-2 px-2 md:px-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                <span>Rank XP</span>
                <span className="text-white">740/1000</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "74%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-mint via-mint/80 to-mint-dark rounded-full shadow-neon-mint"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4 w-full">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl md:rounded-3xl p-2.5 md:p-5 group hover:border-mint/30 transition-all duration-500">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Win Rate</p>
              <p className="text-lg md:text-2xl font-heading font-black text-mint">64%</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl md:rounded-3xl p-2.5 md:p-5 group hover:border-cyber-gold/30 transition-all duration-500">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">K/D</p>
              <p className="text-lg md:text-2xl font-heading font-black text-cyber-gold">2.4</p>
            </div>
          </div>
        </BentoCell>

        {/* Performance Chart */}
        <BentoCell className="md:col-span-6 md:row-span-2 min-h-[220px] md:min-h-[400px]" delay={0.3}>
          <div className="flex items-center justify-between mb-4 md:mb-10">
            <div>
              <h4 className="text-sm md:text-xl font-heading font-black text-white uppercase tracking-tight">Performance</h4>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Combat Frequency</p>
            </div>
            <div className="p-2 md:p-3 bg-white/5 rounded-xl md:rounded-2xl">
              <Activity size={16} className="text-mint animate-pulse" />
            </div>
          </div>
          <div className="w-full flex-1 min-h-[140px] md:min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPointsV4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 9, fontWeight: 900, fontFamily: 'JetBrains Mono' }}
                  dy={8}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030406',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono',
                    color: '#fff'
                  }}
                  cursor={{ stroke: 'rgba(16,185,129,0.2)', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="points"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPointsV4)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCell>

        {/* Active Tournaments */}
        <BentoCell className="md:col-span-6 md:row-span-2" delay={0.4}>
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <h4 className="text-sm md:text-xl font-heading font-black text-white uppercase tracking-tight">Active Deployments</h4>
            <Link to="/tournaments" className="p-2 md:p-3 bg-white/5 rounded-xl md:rounded-2xl hover:bg-white/10 transition-colors">
              <ArrowUpRight size={15} className="text-slate-500" />
            </Link>
          </div>
          <div className="space-y-2 md:space-y-4">
            {tournaments.map((t, i) => (
              <Link key={i} to={`/tournaments/${t.id}`} className="block group/item">
                <div className="flex items-center gap-3 md:gap-6 p-3 md:p-5 rounded-xl md:rounded-3xl bg-white/[0.02] border border-white/5 hover:border-mint/30 hover:bg-white/[0.04] transition-all duration-500">
                  <div className="w-9 h-9 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-obsidian-deep border border-white/5 flex items-center justify-center text-mint flex-shrink-0 group-hover/item:scale-110 transition-transform duration-500">
                    <Sword size={16} className="md:hidden" />
                    <Sword size={28} className="hidden md:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-white uppercase tracking-tight group-hover/item:text-mint transition-colors truncate text-[11px] md:text-base">{t.name}</p>
                      {t.status === 'active' && <div className="w-1 h-1 rounded-full bg-mint animate-pulse shadow-neon-mint flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                      <span className="text-[9px] font-black text-cyber-gold uppercase tracking-[0.2em]">{t.prize_coins} CP</span>
                      <span className="text-slate-700">/</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.current_players}/{t.max_players}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-800 group-hover/item:text-white group-hover/item:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </BentoCell>

        {/* Utility Stats */}
        {[
          { icon: Wallet,  color: 'text-cyber-gold',      label: 'Assets',   value: '12.5k', sub: 'Cyber Points',    hov: 'cyber-gold'     },
          { icon: Trophy,  color: 'text-mint',             label: 'Standing', value: '#124',  sub: 'National Rank',   hov: 'mint'           },
          { icon: Flame,   color: 'text-electric-purple',  label: 'Activity', value: '07d',   sub: 'Combat Streak',   hov: 'electric-purple'},
          { icon: Medal,   color: 'text-slate-400',        label: 'Honors',   value: '24',    sub: 'Badges',          hov: 'slate-400'      },
        ].map(({ icon: Icon, color, label, value, sub }, idx) => (
          <BentoCell key={idx} className="md:col-span-3 flex flex-col justify-between h-24 md:h-48" delay={0.5 + idx * 0.1}>
            <div className="flex justify-between items-start">
              <div className="p-1.5 md:p-3 bg-white/5 rounded-lg md:rounded-2xl"><Icon size={16} className={color} /></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            </div>
            <div>
              <p className={`text-xl md:text-4xl font-impact text-white uppercase leading-none`}>{value}</p>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${color}`}>{sub}</p>
            </div>
          </BentoCell>
        ))}

      </div>
    </div>
  );
}
