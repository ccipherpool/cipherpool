import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useOutletContext, Link } from "react-router-dom";
import { 
  Trophy, 
  Crown, 
  Target, 
  Sword, 
  TrendingUp, 
  Search, 
  ChevronRight,
  Sparkles,
  Medal
} from "lucide-react";
import Button from "../components/ui/Button";

const RankBadge = ({ rank }) => {
  const styles = {
    1: "bg-cyber-gold text-obsidian shadow-neon-gold",
    2: "bg-slate-300 text-obsidian",
    3: "bg-orange-400 text-obsidian",
  };

  if (rank <= 3) {
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading font-black text-sm ${styles[rank]}`}>
        {rank === 1 ? <Crown size={20} /> : rank}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-heading font-black text-sm text-slate-500">
      {rank}
    </div>
  );
};

export default function Leaderboard() {
  const { profile: me } = useOutletContext() || {};
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data: statsData } = await supabase
          .from("player_stats")
          .select("user_id, total_points, kills, wins, tournaments_played")
          .gt("tournaments_played", 0)
          .order("total_points", { ascending: false })
          .limit(100);

        if (statsData) {
          const ids = statsData.map(s => s.user_id);
          const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, level").in("id", ids);
          const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

          setPlayers(statsData.map((s, i) => ({
            ...s,
            rank: i + 1,
            username: pMap[s.user_id]?.username || pMap[s.user_id]?.full_name || "Player",
            avatar: pMap[s.user_id]?.avatar_url,
            level: pMap[s.user_id]?.level || 1
          })));
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const filtered = players.filter(p => p.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter uppercase">
            HALL OF <span className="text-mint">FAME</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            The elite players of Morocco. Do you have what it takes to reach the top?
          </p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mint transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-obsidian-light border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-mint/30 w-full md:w-64"
          />
        </div>
      </div>

      {/* Podium */}
      {!loading && !search && filtered.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12">
          {/* Rank 2 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="order-2 md:order-1 h-full">
            <div className="glass-card p-8 flex flex-col items-center text-center h-full border-slate-300/10">
              <div className="w-10 h-10 rounded-xl bg-slate-300 text-obsidian flex items-center justify-center font-black mb-6">2</div>
              <div className="w-20 h-20 rounded-3xl bg-obsidian border-2 border-slate-300/30 overflow-hidden mb-4">
                {filtered[1].avatar ? <img src={filtered[1].avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-heading font-black text-slate-500 text-2xl">{filtered[1].username[0]}</div>}
              </div>
              <h3 className="text-xl font-heading font-black text-white uppercase">{filtered[1].username}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">LVL {filtered[1].level}</p>
              <div className="mt-6 pt-6 border-t border-white/5 w-full">
                <p className="text-2xl font-heading font-black text-white">{filtered[1].total_points}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points</p>
              </div>
            </div>
          </motion.div>

          {/* Rank 1 */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="order-1 md:order-2">
            <div className="glass-card p-10 flex flex-col items-center text-center border-cyber-gold/20 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-cyber-gold/10 to-transparent pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-cyber-gold text-obsidian flex items-center justify-center font-black mb-6 shadow-neon-gold"><Crown size={28} /></div>
              <div className="relative mb-6">
                <div className="absolute -inset-2 bg-cyber-gold rounded-[40px] blur opacity-25 animate-pulse"></div>
                <div className="relative w-32 h-32 rounded-[32px] bg-obsidian border-4 border-cyber-gold/50 overflow-hidden">
                  {filtered[0].avatar ? <img src={filtered[0].avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-heading font-black text-cyber-gold text-4xl">{filtered[0].username[0]}</div>}
                </div>
              </div>
              <h3 className="text-2xl font-heading font-black text-white uppercase tracking-tight">{filtered[0].username}</h3>
              <p className="text-[10px] font-black text-mint uppercase tracking-[0.3em] mt-1 font-bold">Absolute Champion</p>
              <div className="mt-8 pt-8 border-t border-white/10 w-full grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-heading font-black text-cyber-gold">{filtered[0].total_points}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points</p>
                </div>
                <div>
                  <p className="text-2xl font-heading font-black text-mint">{filtered[0].wins}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wins</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rank 3 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="order-3 h-full">
            <div className="glass-card p-8 flex flex-col items-center text-center h-full border-orange-400/10">
              <div className="w-10 h-10 rounded-xl bg-orange-400 text-obsidian flex items-center justify-center font-black mb-6">3</div>
              <div className="w-20 h-20 rounded-3xl bg-obsidian border-2 border-orange-400/30 overflow-hidden mb-4">
                {filtered[2].avatar ? <img src={filtered[2].avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-heading font-black text-slate-500 text-2xl">{filtered[2].username[0]}</div>}
              </div>
              <h3 className="text-xl font-heading font-black text-white uppercase">{filtered[2].username}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">LVL {filtered[2].level}</p>
              <div className="mt-6 pt-6 border-t border-white/5 w-full">
                <p className="text-2xl font-heading font-black text-white">{filtered[2].total_points}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rankings Analysis</p>
           <div className="flex items-center gap-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hidden md:block">Points</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hidden md:block">Wins</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hidden md:block">Kills</p>
           </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 uppercase tracking-[0.2em] font-black text-xs">No data available</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.slice(search ? 0 : 3).map((p, i) => (
              <motion.div
                key={p.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group hover:bg-white/5 flex items-center gap-6 p-4 md:px-8 transition-colors"
              >
                <div className="w-12 flex justify-center shrink-0">
                  <RankBadge rank={p.rank} />
                </div>
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-obsidian-light border border-white/10 overflow-hidden shrink-0">
                    {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">{p.username[0]}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white uppercase group-hover:text-mint transition-colors truncate">{p.username}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Level {p.level}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-12">
                   <div className="text-right md:w-20">
                      <p className="font-heading font-black text-white group-hover:text-cyber-gold transition-colors">{p.total_points}</p>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest md:hidden">Points</p>
                   </div>
                   <div className="text-right md:w-16 hidden md:block">
                      <p className="font-heading font-black text-mint">{p.wins}</p>
                   </div>
                   <div className="text-right md:w-16 hidden md:block">
                      <p className="font-heading font-black text-slate-300">{p.kills}</p>
                   </div>
                   <div className="hidden md:block">
                      <ChevronRight size={18} className="text-slate-700 group-hover:text-mint transition-colors" />
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
