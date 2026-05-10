import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  Target, 
  Trophy, 
  Sword, 
  Zap, 
  TrendingUp, 
  Star, 
  History, 
  Medal,
  Award,
  ChevronRight,
  User,
  Activity,
  BarChart3,
  Flame,
  Layout
} from "lucide-react";
import Button from "../components/ui/Button";

const StatCard = ({ label, value, sub, icon: Icon, color = "text-mint", delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
    className="glass-card p-6 flex flex-col justify-between group relative overflow-hidden"
  >
     <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={80} />
     </div>
     <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
           <Icon size={24} />
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
           <p className={`text-4xl font-impact uppercase leading-none ${color}`}>{value}</p>
        </div>
     </div>
     {sub && (
       <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-600 relative z-10">
          <span>Maintenance Status</span>
          <span className="text-white">Active</span>
       </div>
     )}
  </motion.div>
);

const HistoryRow = ({ match, i }) => {
  const isWin = match.placement === 1;
  const isTop3 = match.placement <= 3 && match.placement > 1;
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
      className={`bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center gap-6 group hover:border-white/10 transition-all ${isWin ? 'border-cyber-gold/20 bg-cyber-gold/5' : ''}`}
    >
       <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-impact text-2xl transition-all ${
         isWin ? 'bg-cyber-gold/10 border-cyber-gold text-cyber-gold shadow-[0_0_20px_rgba(245,197,24,0.3)]' : 
         isTop3 ? 'bg-mint/10 border-mint text-mint' : 'bg-white/5 border-white/10 text-slate-600'
       }`}>
          #{match.placement || '-'}
       </div>
       
       <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
             <h4 className="text-sm font-bold text-white uppercase tracking-tight">{match.tournament?.name || "Tactical Op"}</h4>
             {isWin && <span className="px-2 py-0.5 rounded bg-cyber-gold text-obsidian text-[8px] font-black uppercase tracking-widest">VICTORY</span>}
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
             <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(match.submitted_at).toLocaleDateString()}</span>
             <span className="flex items-center gap-1.5"><Layout size={12} /> {match.tournament?.game_type || 'BR'}</span>
          </div>
       </div>

       <div className="flex items-center gap-8 px-6 border-x border-white/5">
          <div className="text-center">
             <p className="text-xl font-impact text-red-500 leading-none">{match.kills || 0}</p>
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Elims</p>
          </div>
          <div className="text-center">
             <p className="text-xl font-impact text-cyber-gold leading-none">+{match.estimated_coins || 0}</p>
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">CP</p>
          </div>
       </div>

       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:text-mint transition-colors">
          <ChevronRight size={20} />
       </div>
    </motion.div>
  );
};

export default function PlayerStats() {
  const { profile } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("stats");

  useEffect(() => { fetchData(); }, [profile?.id]);

  const fetchData = async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: sData }, { data: matchData }] = await Promise.all([
        supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle(),
        supabase.from("match_results")
          .select("id, tournament_id, placement, kills, points, estimated_coins, status, submitted_at")
          .eq("user_id", profile.id)
          .eq("status", "verified")
          .order("submitted_at", { ascending: false })
          .limit(20)
      ]);

      let enrichedHistory = [];
      if (matchData?.length) {
        const tIds = [...new Set(matchData.map(m => m.tournament_id))];
        const { data: tours } = await supabase.from("tournaments").select("id, name, game_type").in("id", tIds);
        const tMap = Object.fromEntries((tours || []).map(t => [t.id, t]));
        enrichedHistory = matchData.map(m => ({ ...m, tournament: tMap[m.tournament_id] }));
      }

      setStats(sData || { kills: 0, wins: 0, tournaments_played: 0, total_points: 0 });
      setHistory(enrichedHistory);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const wr = stats?.tournaments_played > 0 ? Math.round(((stats.wins || 0) / stats.tournaments_played) * 100) : 0;
  const kd = stats?.kd_ratio ? parseFloat(stats.kd_ratio).toFixed(2) : stats?.tournaments_played > 0 ? (stats.kills / stats.tournaments_played).toFixed(2) : '0.00';

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      
      {/* Profile Identity Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-obsidian-light/40 border border-white/10 p-8 md:p-12 rounded-[3rem] backdrop-blur-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <BarChart3 size={200} />
         </div>
         <div className="flex items-center gap-8 relative z-10">
            <div className="relative group">
               <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] border-4 border-mint/20 bg-mint/5 overflow-hidden group-hover:border-mint transition-all duration-500">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-heading font-black text-mint">
                       {(profile?.username || 'A')[0].toUpperCase()}
                    </div>
                  )}
               </div>
               <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-mint rounded-2xl flex items-center justify-center text-obsidian shadow-neon-mint border-4 border-obsidian-light">
                  <span className="font-impact text-sm">#{stats?.rank || '-'}</span>
               </div>
            </div>
            <div className="space-y-2">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-mint shadow-neon-mint" />
                  <span className="text-[10px] font-black text-mint uppercase tracking-[0.4em]">Elite Operator</span>
               </div>
               <h1 className="text-4xl md:text-6xl font-heading font-black text-white uppercase tracking-tighter leading-none">
                  {profile?.username || "Unit-73"}
               </h1>
               <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
                     <Flame size={14} className="text-orange-500" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">Level {profile?.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
                     <Sword size={14} className="text-mint" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">{stats?.tournaments_played || 0} Ops Played</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex gap-4 relative z-10">
            <button
              onClick={() => setTab("stats")}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                tab === 'stats' 
                  ? 'bg-mint text-obsidian border-mint shadow-neon-mint' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              Specifications
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                tab === 'history' 
                  ? 'bg-mint text-obsidian border-mint shadow-neon-mint' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              Combat Log
            </button>
         </div>
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="space-y-12">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Eliminations" value={stats?.kills || 0} icon={Target} color="text-red-500" delay={0.1} />
              <StatCard label="Victories" value={stats?.wins || 0} icon={Trophy} color="text-cyber-gold" delay={0.2} />
              <StatCard label="Win Rate" value={`${wr}%`} icon={Activity} color="text-mint" delay={0.3} />
              <StatCard label="K/D Efficiency" value={kd} icon={Zap} color="text-blue-400" delay={0.4} />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="ultra-glass p-10 space-y-8">
                 <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <TrendingUp size={24} className="text-mint" /> Performance Analytics
                 </h3>
                 <div className="space-y-8">
                    {[
                      { l: "Match Accuracy", v: 78, c: "text-mint" },
                      { l: "Survival Duration", v: 64, c: "text-blue-400" },
                      { l: "Tactical Execution", v: wr, c: "text-cyber-gold" },
                      { l: "Elimination Growth", v: 52, c: "text-red-500" }
                    ].map((bar, i) => (
                      <div key={i} className="space-y-3">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>{bar.l}</span>
                            <span className={bar.c}>{bar.v}%</span>
                         </div>
                         <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${bar.v}%` }}
                              transition={{ duration: 1.5, delay: 0.5 + (i * 0.1) }}
                              className={`h-full bg-current ${bar.c}`}
                            />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="ultra-glass p-10 flex flex-col justify-center items-center text-center space-y-8 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-mint/5 via-transparent to-transparent" />
                 <div className="w-24 h-24 rounded-[2rem] bg-mint/10 border border-mint/20 flex items-center justify-center text-mint shadow-neon-mint relative z-10">
                    <Award size={48} />
                 </div>
                 <div className="space-y-3 relative z-10">
                    <h3 className="text-3xl font-heading font-black text-white uppercase tracking-tighter">PRESTIGE STANDING</h3>
                    <p className="text-slate-500 text-sm max-w-xs font-medium">Your current ranking among all 1K+ verified Moroccan warriors in the arena.</p>
                 </div>
                 <div className="bg-white/5 border border-white/5 px-10 py-6 rounded-3xl relative z-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">National Rank</p>
                    <p className="text-6xl font-impact text-mint leading-none">#{stats?.rank || '1.2K'}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
           {history.map((match, i) => (
              <HistoryRow key={match.id} match={match} i={i} />
           ))}
           {history.length === 0 && (
             <div className="py-20 text-center ultra-glass">
                <History size={64} className="mx-auto text-slate-700 mb-6" />
                <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">No Combat Records</h3>
                <p className="text-slate-500 mt-2">Engage in tournaments to establish your historical timeline.</p>
             </div>
           )}
        </div>
      )}

    </div>
  );
}
