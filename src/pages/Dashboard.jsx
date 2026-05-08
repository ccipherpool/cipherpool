import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Zap, 
  Target, 
  TrendingUp, 
  Users2, 
  Crown, 
  Sword, 
  Gamepad2, 
  Clock, 
  ChevronRight,
  ArrowUpRight,
  Flame,
  Star,
  Medal,
  Wallet
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// Mock data for charts
const chartData = [
  { name: 'Mon', wins: 2, points: 400 },
  { name: 'Tue', wins: 3, points: 700 },
  { name: 'Wed', wins: 1, points: 550 },
  { name: 'Thu', wins: 5, points: 1200 },
  { name: 'Fri', wins: 4, points: 900 },
  { name: 'Sat', wins: 6, points: 1500 },
  { name: 'Sun', wins: 8, points: 2100 },
];

const BentoCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className={`glass-card p-6 relative overflow-hidden group ${className}`}
  >
    {children}
  </motion.div>
);

const StatMiniCard = ({ icon: Icon, label, value, trend, colorClass, delay = 0 }) => (
  <BentoCard delay={delay} className="flex flex-col justify-between">
    <div className="flex items-start justify-between">
      <div className={`p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 group-hover:${colorClass} transition-colors`}>
        <Icon size={18} />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold ${trend > 0 ? 'text-mint' : 'text-red-400'} flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-heading font-black text-white mt-1">{value}</p>
    </div>
  </BentoCard>
);

export default function Dashboard() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tourneysRes, topRes] = await Promise.all([
          supabase.from("tournaments").select("*").in("status", ["active", "upcoming"]).limit(4),
          supabase.from("player_stats").select("user_id, total_points, wins").order("total_points", { ascending: false }).limit(5)
        ]);

        setTournaments(tourneysRes.data || []);
        
        if (topRes.data) {
          const userIds = topRes.data.map(t => t.user_id);
          const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
          const profMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
          setTopPlayers(topRes.data.map((s, i) => ({
            ...s,
            rank: i + 1,
            username: profMap[s.user_id]?.username || "Player",
            avatar: profMap[s.user_id]?.avatar_url
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return null; // Handled by MainLayout loading state usually, but just in case

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter">
            COMMAND <span className="text-mint">CENTER</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Welcome back, <span className="text-white">{profile?.username || profile?.email?.split('@')[0]}</span>. System protocols active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-obsidian-light border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-mint animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Server: EU-MAROC</span>
          </div>
          <div className="bg-obsidian-light border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
            <Clock size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-white">08 MAY 2026</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-auto gap-6">
        
        {/* Hero Section - Featured Tournament */}
        <BentoCard className="md:col-span-3 md:row-span-2 min-h-[400px] !p-0" delay={0.1}>
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
            alt="Hero"
          />
          <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-mint text-obsidian px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Live Now</span>
              <span className="bg-white/10 backdrop-blur-md text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Free Fire Elite</span>
            </div>
            <h2 className="text-5xl font-heading font-black tracking-tighter mb-2 max-w-2xl leading-[0.9]">
              ULTIMATE <span className="text-cyber-gold">CHAMPIONSHIP</span> 2026
            </h2>
            <p className="text-slate-300 max-w-lg mb-6 text-sm font-medium">
              Join the most competitive tournament of the season. 50,000 CP Prize Pool and exclusive titles await the winners.
            </p>
            <div className="flex items-center gap-4">
              <button className="bg-mint hover:bg-mint-dark text-obsidian px-8 py-3 rounded-xl font-heading font-black text-xs tracking-widest transition-all hover:scale-105 active:scale-95 shadow-neon-mint">
                JOIN NOW
              </button>
              <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-heading font-black text-xs tracking-widest transition-all">
                VIEW DETAILS
              </button>
            </div>
          </div>
        </BentoCard>

        {/* Profile Card */}
        <BentoCard className="md:col-span-1 md:row-span-2 flex flex-col" delay={0.2}>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-mint to-cyber-gold rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-24 h-24 rounded-2xl bg-obsidian border-2 border-white/10 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-heading font-black text-mint">
                    {profile?.username?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-mint text-obsidian w-8 h-8 rounded-lg flex items-center justify-center border-4 border-obsidian font-black text-xs">
                {profile?.level || 1}
              </div>
            </div>
            <h3 className="text-xl font-heading font-black text-white">{profile?.username || "Player"}</h3>
            <p className="text-[10px] font-black text-mint uppercase tracking-[0.2em] mt-1">Master Guardian</p>
          </div>

          <div className="space-y-4 flex-1">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span>Experience</span>
                <span className="text-white">{(profile?.xp || 0) % 1000} / 1000 XP</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile?.xp || 0) % 1000) / 10}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-mint to-mint-dark" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Wins</p>
                <p className="text-xl font-heading font-black text-mint">24</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ratio</p>
                <p className="text-xl font-heading font-black text-cyber-gold">2.4</p>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <Link to="/profile" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-black tracking-widest uppercase">
                View Detailed Stats <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </BentoCard>

        {/* Quick Stats Mini Cards */}
        <StatMiniCard icon={Flame} label="Daily Streak" value="7 Days" trend={14} colorClass="text-orange-400" delay={0.3} />
        <StatMiniCard icon={Medal} label="Tournament Rank" value="#124" trend={-2} colorClass="text-cyber-gold" delay={0.4} />
        <StatMiniCard icon={Users2} label="Clan Rank" value="Elite" trend={5} colorClass="text-mint" delay={0.5} />
        <StatMiniCard icon={Wallet} label="Total Earnings" value="12.5k" colorClass="text-mint" delay={0.6} />

        {/* Chart - Performance Trend */}
        <BentoCard className="md:col-span-2 md:row-span-2" delay={0.7}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight">Performance Trend</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last 7 Sessions</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-mint" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#12141C', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontFamily: 'Satoshi'
                  }}
                  itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPoints)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Live Tournaments Grid */}
        <BentoCard className="md:col-span-1 md:row-span-2" delay={0.8}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight">Active Battle</h3>
            <Link to="/tournaments" className="text-mint hover:text-mint-dark transition-colors">
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="space-y-4">
            {tournaments.map((t, i) => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="block group/item">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-mint/20 hover:bg-white/10 transition-all">
                  <div className="w-12 h-12 rounded-lg bg-mint/10 flex items-center justify-center text-mint group-hover/item:scale-110 transition-transform">
                    <Sword size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover/item:text-mint transition-colors">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-cyber-gold uppercase tracking-tighter">{t.prize_coins} CP</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{t.current_players}/{t.max_players}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </BentoCard>

        {/* Leaderboard Card */}
        <BentoCard className="md:col-span-1 md:row-span-2" delay={0.9}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight">Hall of Fame</h3>
            <div className="p-1.5 rounded-lg bg-cyber-gold/10 text-cyber-gold">
              <Crown size={16} />
            </div>
          </div>
          <div className="space-y-4">
            {topPlayers.map((p, i) => (
              <div key={p.user_id} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded flex items-center justify-center font-heading font-black text-[10px] ${
                  i === 0 ? 'bg-cyber-gold text-obsidian shadow-[0_0_10px_#F5C518]' :
                  i === 1 ? 'bg-slate-300 text-obsidian' :
                  i === 2 ? 'bg-orange-400 text-obsidian' :
                  'bg-white/5 text-slate-500'
                }`}>
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-lg bg-obsidian-lighter border border-white/10 overflow-hidden shrink-0">
                  {p.avatar ? (
                    <img src={p.avatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {p.username[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{p.username}</p>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{p.total_points} PTS</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-mint uppercase tracking-tighter">{p.wins}W</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/5">
            <Link to="/leaderboard" className="flex items-center justify-center gap-2 w-full text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
              Full Standings <ChevronRight size={12} />
            </Link>
          </div>
        </BentoCard>

      </div>
    </div>
  );
}
