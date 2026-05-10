import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Calendar, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Clock,
  History,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import Button from "../../../components/ui/Button";

const RESET_OPTIONS = [
  { id: "p_reset_coins", label: "Reset Cyber Points (CP)", destructive: true },
  { id: "p_reset_xp", label: "Reset XP & Levels", destructive: true },
  { id: "p_reset_stats", label: "Reset Wins & Stats", destructive: true },
  { id: "p_reset_tournaments", label: "Reset Ongoing Tournaments", destructive: true },
  { id: "p_reset_chat", label: "Clear Global Chat", destructive: false },
  { id: "p_reset_avatars", label: "Reset Equipped Items", destructive: false },
  { id: "p_reset_clans", label: "Reset Clan Rankings", destructive: true },
];

export default function SeasonsTab() {
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetConfig, setResetConfig] = useState({
    p_name: "",
    p_number: 1,
    p_reset_coins: false,
    p_reset_xp: false,
    p_reset_stats: true,
    p_reset_tournaments: true,
    p_reset_chat: true,
    p_reset_avatars: false,
    p_reset_clans: false,
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .order("number", { ascending: false });
    
    setSeasons(data || []);
    setActiveSeason(data?.find(s => s.status === 'active'));
    
    if (data && data.length > 0) {
      setResetConfig(prev => ({ ...prev, p_number: data[0].number + 1 }));
    }
    setLoading(false);
  };

  const handleStartSeason = async () => {
    if (confirmText !== "CONFIRMER") return;
    
    setLoading(true);
    const { data, error } = await supabase.rpc("start_new_season", resetConfig);
    
    if (error) {
      alert("Error starting season: " + error.message);
    } else {
      setShowResetModal(false);
      setConfirmText("");
      fetchSeasons();
    }
    setLoading(false);
  };

  if (loading && seasons.length === 0) return (
    <div className="flex items-center justify-center py-20">
       <RefreshCw className="animate-spin text-mint" size={32} />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Active Season Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 ultra-glass p-8 border-mint/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Trophy size={160} />
           </div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse shadow-neon-mint" />
                 <span className="text-[10px] font-black text-mint uppercase tracking-[0.4em]">ACTIVE CAMPAIGN</span>
              </div>
              
              {activeSeason ? (
                <>
                  <h2 className="text-5xl font-heading font-black text-white uppercase tracking-tighter mb-2">
                    SEASON {activeSeason.number}: {activeSeason.name}
                  </h2>
                  <div className="flex flex-wrap gap-6 mt-8">
                     <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-slate-500" />
                        <div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Start Date</p>
                           <p className="text-sm font-bold text-white">{new Date(activeSeason.start_date).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Clock size={18} className="text-slate-500" />
                        <div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Runtime</p>
                           <p className="text-sm font-bold text-white">Active for 12 days</p>
                        </div>
                     </div>
                  </div>
                </>
              ) : (
                <div className="py-10">
                   <h3 className="text-2xl font-heading font-black text-white/20 uppercase tracking-tighter">No Active Season Found</h3>
                   <p className="text-slate-600 mt-2">Initialize a new campaign to begin competitive tracking.</p>
                </div>
              )}

              <div className="mt-12 flex gap-4">
                 <Button 
                   onClick={() => setShowResetModal(true)} 
                   className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all gap-2"
                 >
                    <ShieldAlert size={18} /> INITIALIZE SEASON RESET
                 </Button>
              </div>
           </div>
        </div>

        <div className="ultra-glass p-8 space-y-6">
           <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight flex items-center gap-2">
              <History size={20} className="text-slate-500" /> SEASON HISTORY
           </h3>
           <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-hide">
              {seasons.map(s => (
                <div key={s.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                   <div>
                      <p className="text-xs font-bold text-white uppercase">S{s.number}: {s.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-medium mt-1">
                        {new Date(s.start_date).toLocaleDateString()} — {s.end_date ? new Date(s.end_date).toLocaleDateString() : 'Present'}
                      </p>
                   </div>
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                     s.status === 'active' ? 'bg-mint/10 text-mint' : 'bg-white/10 text-slate-500'
                   }`}>
                      {s.status}
                   </span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Season Initialization Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-obsidian/90 backdrop-blur-xl"
          >
             <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="w-full max-w-2xl ultra-glass border-red-500/20 p-10 relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                   <AlertTriangle size={120} className="text-red-500" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                      <ShieldAlert size={32} />
                   </div>
                   <div>
                      <h2 className="text-3xl font-heading font-black text-white uppercase tracking-tighter">NEW SEASON PROTOCOL</h2>
                      <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em]">Destructive Operation: Read Carefully</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Season Alias</label>
                         <input 
                           type="text" 
                           value={resetConfig.p_name}
                           onChange={(e) => setResetConfig({...resetConfig, p_name: e.target.value})}
                           placeholder="e.g. Genesis Uprising"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mint/50"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Campaign Number</label>
                         <input 
                           type="number" 
                           value={resetConfig.p_number}
                           onChange={(e) => setResetConfig({...resetConfig, p_number: parseInt(e.target.value)})}
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mint/50"
                         />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reset Directives</p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                         {RESET_OPTIONS.map(opt => (
                           <label key={opt.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
                              <span className={`text-[10px] font-bold uppercase ${opt.destructive ? 'text-red-400' : 'text-slate-400'}`}>
                                {opt.label}
                              </span>
                              <input 
                                type="checkbox" 
                                checked={resetConfig[opt.id]}
                                onChange={(e) => setResetConfig({...resetConfig, [opt.id]: e.target.checked})}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-mint focus:ring-mint"
                              />
                           </label>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-2xl mb-10">
                   <div className="flex items-start gap-4">
                      <AlertTriangle className="text-red-500 shrink-0" size={20} />
                      <div className="space-y-3">
                         <p className="text-xs text-slate-400 font-medium">
                            Starting a new season will archive current leaderboards and apply selected resets. This action cannot be reversed. Final snapshots will be saved for the Hall of Fame.
                         </p>
                         <p className="text-[10px] font-black text-white uppercase tracking-widest">Type "CONFIRMER" to authorize deployment:</p>
                         <input 
                           type="text" 
                           value={confirmText}
                           onChange={(e) => setConfirmText(e.target.value)}
                           className="w-full bg-black/40 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-500 font-mono tracking-widest focus:outline-none focus:border-red-500"
                         />
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <Button onClick={() => setShowResetModal(false)} variant="ghost" className="flex-1 py-4 uppercase font-black tracking-widest text-[10px]">
                      Abort Protocol
                   </Button>
                   <Button 
                    onClick={handleStartSeason}
                    disabled={confirmText !== "CONFIRMER" || !resetConfig.p_name}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white uppercase font-black tracking-widest text-[10px] gap-2 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                   >
                      <CheckCircle2 size={16} /> AUTHORIZE RESET
                   </Button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
}
