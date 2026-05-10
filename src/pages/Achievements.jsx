import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  Trophy, 
  Target, 
  Zap, 
  Star, 
  Shield, 
  Lock, 
  CheckCircle2, 
  Search,
  Filter,
  Medal,
  Flame,
  Layout,
  ChevronRight
} from "lucide-react";
import Button from "../components/ui/Button";

const RARITY_CONFIG = {
  common: { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", glow: "shadow-[0_0_20px_rgba(148,163,184,0.1)]", label: "Common" },
  rare: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]", label: "Rare" },
  epic: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", glow: "shadow-[0_0_20px_rgba(168,85,247,0.1)]", label: "Epic" },
  legendary: { color: "text-cyber-gold", bg: "bg-cyber-gold/10", border: "border-cyber-gold/20", glow: "shadow-[0_0_30px_rgba(245,197,24,0.2)]", label: "Legendary" },
};

const CATEGORY_ICONS = {
  combat: Target,
  tournament: Trophy,
  social: Star,
  special: Zap
};

export default function Achievements() {
  const { profile } = useOutletContext() || {};
  const [all, setAll] = useState([]);
  const [earned, setEarned] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchAll(); }, [profile?.id]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: achData }, { data: earnedData }] = await Promise.all([
      supabase.from("achievements").select("*").order("rarity", { ascending: true }),
      profile?.id ? supabase.from("user_achievements").select("*, achievement:achievements(*)").eq("user_id", profile.id) : { data: [] }
    ]);
    setAll(achData || []);
    setEarned(earnedData || []);
    setLoading(false);
  };

  const earnedIds = new Set(earned.map(e => e.achievement_id));
  const cats = ["all", "combat", "tournament", "social", "special"];

  const filtered = (filter === "earned"
    ? all.filter(a => earnedIds.has(a.id))
    : filter === "locked"
    ? all.filter(a => !earnedIds.has(a.id))
    : filter === "all"
    ? all
    : all.filter(a => a.category === filter)
  );

  const pct = all.length > 0 ? Math.round((earnedIds.size / all.length) * 100) : 0;

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Overall Progress */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
         <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-mint shadow-neon-mint" />
               <span className="text-[10px] font-black text-mint uppercase tracking-[0.4em]">Honors Protocol</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black text-white uppercase tracking-tighter leading-none">
               TACTICAL <span className="text-mint">HONORS</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">
               Execute objectives to unlock high-fidelity badges and specialized rewards. Every milestone enhances your military standing.
            </p>
         </div>

         <div className="ultra-glass p-8 min-w-[280px] text-right relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-mint/5 to-transparent pointer-events-none" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sync Progress</p>
            <p className="text-5xl font-heading font-black text-white">{pct}%</p>
            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${pct}%` }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className="h-full bg-mint shadow-neon-mint" 
               />
            </div>
            <p className="text-[9px] font-bold text-mint/60 uppercase tracking-widest mt-2">{earnedIds.size} / {all.length} Badges Secured</p>
         </div>
      </div>

      {/* Filters Bento */}
      <div className="flex flex-wrap items-center gap-3">
         {cats.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                filter === c 
                  ? 'bg-mint text-obsidian border-mint shadow-neon-mint' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              {c === 'all' ? 'All Objectives' : c}
            </button>
         ))}
         <div className="h-8 w-[1px] bg-white/5 mx-2" />
         <button
           onClick={() => setFilter(filter === 'earned' ? 'all' : 'earned')}
           className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
             filter === 'earned' 
               ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
               : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
           }`}
         >
           Secured
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         <AnimatePresence mode="popLayout">
            {filtered.map((ach, i) => {
               const isEarned = earnedIds.has(ach.id);
               const r = RARITY_CONFIG[ach.rarity] || RARITY_CONFIG.common;
               const CatIcon = CATEGORY_ICONS[ach.category] || Target;
               
               return (
                  <motion.div
                    layout
                    key={ach.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelected(ach)}
                    className={`glass-card p-6 cursor-pointer group relative overflow-hidden transition-all duration-500 hover:border-mint/30 ${!isEarned ? 'grayscale opacity-60 hover:grayscale-0' : r.glow}`}
                  >
                     <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl ${isEarned ? 'bg-mint/10 text-mint shadow-neon-mint' : 'bg-white/5 text-slate-700'}`}>
                           {isEarned ? <ach.icon size={32} /> : <Lock size={32} />}
                        </div>
                        <div className={`px-2 py-0.5 rounded-lg border ${r.bg} ${r.border} ${r.color} text-[8px] font-black uppercase tracking-widest`}>
                           {r.label}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <h3 className="font-heading font-black text-white uppercase tracking-tight truncate">{ach.name}</h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">{ach.description}</p>
                     </div>

                     <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           {ach.coins_reward > 0 && (
                              <div className="flex items-center gap-1.5">
                                 <div className="w-1 h-1 rounded-full bg-cyber-gold" />
                                 <span className="text-[9px] font-black text-cyber-gold uppercase">+{ach.coins_reward} CP</span>
                              </div>
                           )}
                           {ach.xp_reward > 0 && (
                              <div className="flex items-center gap-1.5">
                                 <div className="w-1 h-1 rounded-full bg-mint" />
                                 <span className="text-[9px] font-black text-mint uppercase">+{ach.xp_reward} XP</span>
                              </div>
                           )}
                        </div>
                        {isEarned && <CheckCircle2 size={16} className="text-mint" />}
                     </div>
                  </motion.div>
               );
            })}
         </AnimatePresence>
      </div>

      {/* Modal Detail */}
      <AnimatePresence>
         {selected && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-obsidian/90 backdrop-blur-xl"
              onClick={() => setSelected(null)}
            >
               <motion.div 
                 initial={{ scale: 0.95, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 className="w-full max-w-lg ultra-glass p-12 relative overflow-hidden border-white/10"
                 onClick={e => e.stopPropagation()}
               >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                     <Medal size={160} />
                  </div>

                  <div className="text-center space-y-8 relative z-10">
                     <div className="flex flex-col items-center gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-neon-mint text-mint">
                           <span className="text-7xl">{selected.icon}</span>
                        </div>
                        <div className="space-y-2">
                           <h2 className="text-4xl font-heading font-black text-white uppercase tracking-tighter leading-none">{selected.name}</h2>
                           <div className={`inline-flex px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${RARITY_CONFIG[selected.rarity].bg} ${RARITY_CONFIG[selected.rarity].color}`}>
                              {RARITY_CONFIG[selected.rarity].label} Protocol
                           </div>
                        </div>
                     </div>

                     <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-sm mx-auto">
                        {selected.description}
                     </p>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Combat Reward</p>
                           <p className="text-2xl font-heading font-black text-cyber-gold">{selected.coins_reward} CP</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">XP Gain</p>
                           <p className="text-2xl font-heading font-black text-mint">{selected.xp_reward} XP</p>
                        </div>
                     </div>

                     <div className={`py-4 rounded-2xl border ${earnedIds.has(selected.id) ? 'bg-mint/10 border-mint/20 text-mint' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">
                           {earnedIds.has(selected.id) ? "OBJECTIVE SECURED" : "OBJECTIVE PENDING"}
                        </p>
                     </div>

                     <button 
                        onClick={() => setSelected(null)}
                        className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                     >
                        Close Intel
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
