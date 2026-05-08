import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Search, 
  Filter, 
  Sword, 
  Users2, 
  Wallet, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Zap,
  Flame,
  Target
} from "lucide-react";
import Button from "../components/ui/Button";

const STATUS_CONFIG = {
  active: { label: "Live Now", color: "text-mint", bg: "bg-mint/10", border: "border-mint/20" },
  upcoming: { label: "Upcoming", color: "text-cyber-gold", bg: "bg-cyber-gold/10", border: "border-cyber-gold/20" },
  completed: { label: "Finished", color: "text-slate-500", bg: "bg-slate-500/10", border: "border-white/5" },
};

const TournamentCard = ({ t, i, balance }) => {
  const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.upcoming;
  const progress = t.max_players > 0 ? (t.current_players / t.max_players) * 100 : 0;
  const canAfford = (balance || 0) >= (t.entry_fee || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.4 }}
      className="glass-card group overflow-hidden flex flex-col h-full"
    >
      {/* Card Header Image/Pattern */}
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-light to-transparent z-10" />
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${t.status === 'active' ? 'from-mint to-transparent' : 'from-cyber-gold to-transparent'}`} />
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1 rounded-full ${status.bg} ${status.border} border backdrop-blur-md flex items-center gap-1.5`}>
            {t.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />}
            <span className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
           <Trophy size={64} className={`${t.status === 'active' ? 'text-mint' : 'text-white/20'} opacity-20`} />
        </div>
        <div className="absolute bottom-4 left-6 z-20">
           <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight leading-none group-hover:text-mint transition-colors">
            {t.name}
           </h3>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Prize</p>
            <p className="text-xs font-black text-cyber-gold">{t.prize_coins} CP</p>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Entry</p>
            <p className="text-xs font-black text-white">{t.entry_fee === 0 ? 'FREE' : `${t.entry_fee} CP`}</p>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mode</p>
            <p className="text-xs font-black text-mint uppercase">{t.mode || 'SOLO'}</p>
          </div>
        </div>

        {/* Players Progress */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Squads Enrolled</span>
            <span className="text-white">{t.current_players} / {t.max_players}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className={`h-full bg-gradient-to-r ${t.status === 'active' ? 'from-mint to-mint-dark' : 'from-cyber-gold to-cyber-gold-dark'}`} 
            />
          </div>
        </div>

        {/* Description/Requirements */}
        <div className="mb-6 flex-1">
          <p className="text-xs text-slate-500 font-medium line-clamp-2">
            {t.description || "Join the high-stakes battle. Requires Level 5+ and verified Free Fire ID."}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <Link to={`/tournaments/${t.id}`} className="block">
            <Button 
              variant={t.status === 'active' ? 'primary' : 'outline'} 
              className="w-full"
              disabled={t.status === 'completed'}
            >
              {t.status === 'completed' ? 'Tournament Ended' : !canAfford ? `Need ${t.entry_fee} CP` : t.status === 'active' ? 'Enter Arena' : 'Join Bracket'}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default function Tournaments() {
  const { profile } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      setLoading(false);
    };
    fetchTournaments();
  }, []);

  const filtered = tournaments.filter(t => {
    const matchesFilter = filter === "all" || t.status === filter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter uppercase">
            ACTIVE <span className="text-mint">BRACKETS</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Browse and join available tournaments. Prove your skills and earn rewards.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mint transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search brackets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-obsidian-light border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-mint/30 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {['all', 'active', 'upcoming', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === f 
                ? 'bg-mint text-obsidian border-mint shadow-neon-mint' 
                : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
            }`}
          >
            {f === 'all' ? 'All Events' : f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="glass-card h-96 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center glass-card">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <Sword size={40} className="text-slate-700" />
          </div>
          <h3 className="text-xl font-heading font-black text-white uppercase mb-2">No Tournaments Found</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm">
            We couldn't find any tournaments matching your criteria. Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((t, i) => (
            <TournamentCard key={t.id} t={t} i={i} balance={profile?.coins} />
          ))}
        </div>
      )}
    </div>
  );
}
