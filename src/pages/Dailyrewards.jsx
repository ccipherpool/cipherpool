import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  Gift, 
  Clock, 
  Flame, 
  Zap, 
  CheckCircle2, 
  Target, 
  Trophy, 
  Star, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Lock,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import Button from "../components/ui/Button";

function CountdownTimer() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date(), midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xl md:text-3xl font-black text-mint tracking-[0.2em]">{time}</span>;
}

export default function DailyRewards() {
  const { profile, refreshProfile } = useOutletContext() || {};
  const [rewards, setRewards] = useState([]);
  const [missions, setMissions] = useState([]);
  const [userMissions, setUserMissions] = useState([]);
  const [lastClaim, setLastClaim] = useState(null);
  const [streak, setStreak] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("daily");

  useEffect(() => { fetchAll(); }, [profile?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: rwData }, { data: msData }, { data: claimData }, { data: umData }] = await Promise.all([
        supabase.from("daily_rewards").select("*").order("day"),
        supabase.from("missions").select("*").eq("is_active", true).order("type"),
        profile?.id ? supabase.from("user_daily_claims").select("*").eq("user_id", profile.id).order("claimed_at", { ascending: false }).limit(1) : { data: [] },
        profile?.id ? supabase.from("user_missions").select("*").eq("user_id", profile.id).eq("reset_date", new Date().toISOString().split("T")[0]) : { data: [] }
      ]);
      setRewards(rwData || []);
      setMissions(msData || []);
      setUserMissions(umData || []);
      if (claimData?.[0]) { setLastClaim(claimData[0]); setStreak(claimData[0].streak || 0); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const canClaim = !lastClaim || new Date(lastClaim.claimed_at).toDateString() !== new Date().toDateString();
  const currentDay = (streak % 7) + 1;

  const claimReward = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_reward", { p_user_id: profile.id });
      if (error) throw error;
      setClaimResult(data);
      await fetchAll();
      refreshProfile?.();
      setTimeout(() => setClaimResult(null), 5000);
    } catch (e) { alert(e.message); }
    finally { setClaiming(false); }
  };

  const claimMission = async (missionId) => {
    const { error } = await supabase.rpc("claim_mission_reward", { 
      p_user_id: profile.id, 
      p_mission_id: missionId 
    });
    if (!error) { fetchAll(); refreshProfile?.(); }
  };

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      
      {/* Dynamic Claim Notification */}
      <AnimatePresence>
        {claimResult?.success && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-6"
          >
             <div className="ultra-glass p-8 border-mint/40 text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                <div className="w-20 h-20 bg-mint rounded-full flex items-center justify-center mx-auto mb-6 shadow-neon-mint text-obsidian">
                   <Gift size={40} />
                </div>
                <h3 className="text-3xl font-heading font-black text-white uppercase tracking-tighter mb-2">SUPPLY DROPPED</h3>
                <p className="text-mint font-bold text-lg">+{claimResult.coins} CP & +{claimResult.xp} XP SECURED</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-4">Current Streak: {claimResult.streak} Days Active</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Streak Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-cyber-gold shadow-[0_0_10px_rgba(245,197,24,0.6)]" />
               <span className="text-[10px] font-black text-cyber-gold uppercase tracking-[0.4em]">Logistics Support</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter leading-none">
               DAILY <span className="text-cyber-gold">SUPPLIES</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg max-w-2xl">
               Consistency is a lethal weapon. Synchronize with the arena every 24 hours to receive tactical supplies and maintenance rewards.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
               {['daily', 'missions', 'weekly'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      tab === t 
                        ? 'bg-cyber-gold text-obsidian border-cyber-gold shadow-[0_0_30px_rgba(245,197,24,0.3)]' 
                        : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    {t === 'daily' ? 'Supply Log' : t}
                  </button>
               ))}
            </div>
         </div>

         <div className="lg:col-span-4 ultra-glass p-8 flex flex-col justify-between relative overflow-hidden group border-mint/20">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Clock size={120} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Reset Window</p>
               <CountdownTimer />
            </div>
            <div className="pt-8 border-t border-white/5 flex justify-between items-end">
               <div>
                  <p className="text-[10px] font-black text-mint uppercase tracking-widest">Active Streak</p>
                  <p className="text-4xl font-heading font-black text-white">{streak} DAYS</p>
               </div>
               <div className="p-3 rounded-2xl bg-mint/10 text-mint">
                  <Flame size={24} className="animate-pulse" />
               </div>
            </div>
         </div>
      </div>

      {/* Content Render */}
      {tab === 'daily' && (
        <div className="space-y-8">
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {rewards.map((r, i) => {
                const isDone = streak > 0 && (i < (streak % 7) || (streak % 7 === 0 && i < 7 && streak > 0));
                const isCurrent = canClaim && currentDay === r.day;
                const isClaimedToday = !canClaim && currentDay - 1 === r.day;
                
                return (
                  <motion.div 
                    key={r.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card p-6 text-center relative group overflow-hidden transition-all duration-500 ${isCurrent ? 'border-mint shadow-neon-mint ring-1 ring-mint/20' : 'border-white/5'}`}
                  >
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mint/20 to-transparent opacity-0 group-hover:opacity-100" />
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Day 0{r.day}</p>
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 ${isDone ? 'bg-mint/10 text-mint' : 'bg-white/5 text-slate-700'}`}>
                        {isDone ? <CheckCircle2 size={24} /> : <Gift size={24} />}
                     </div>
                     <p className={`text-xl font-heading font-black ${isDone ? 'text-white' : 'text-slate-500'}`}>{r.coins} CP</p>
                     {r.is_special && <div className="mt-2 text-[8px] font-black text-cyber-gold uppercase tracking-[0.2em]">Bonus</div>}
                     
                     {isCurrent && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-mint/5 backdrop-blur-[2px] flex items-center justify-center"
                        >
                           <button onClick={claimReward} className="bg-mint text-obsidian p-2 rounded-xl shadow-neon-mint hover:scale-110 transition-transform">
                              <PlusCircle size={24} />
                           </button>
                        </motion.div>
                     )}
                  </motion.div>
                );
              })}
           </div>

           <div className="flex justify-center pt-6">
              <button 
                onClick={claimReward}
                disabled={!canClaim || claiming}
                className={`group relative overflow-hidden px-16 py-6 rounded-[2rem] font-heading font-black text-sm uppercase tracking-[0.3em] transition-all duration-500 ${canClaim ? 'bg-mint text-obsidian shadow-neon-mint hover:scale-105' : 'bg-white/5 text-slate-500 opacity-50 cursor-not-allowed'}`}
              >
                 <span className="relative z-10 flex items-center gap-3">
                    {claiming ? 'Synchronizing...' : canClaim ? 'Initialize Claim' : 'Resources Claimed'}
                    {!claiming && canClaim && <ArrowRight size={20} />}
                 </span>
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
           </div>
        </div>
      )}

      {tab === 'missions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {missions.filter(m => m.type === 'daily').map((m, i) => {
              const um = userMissions.find(u => u.mission_id === m.id);
              const progress = um?.progress || 0;
              const pct = Math.min(100, Math.round((progress / m.target_value) * 100));
              const isCompleted = um?.completed;
              const isClaimed = um?.claimed;

              return (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-8 flex gap-6 items-center group relative"
                >
                   <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shrink-0 border border-white/10 transition-all group-hover:border-mint/30 ${isCompleted && !isClaimed ? 'bg-mint/10 text-mint shadow-neon-mint' : 'bg-white/5 text-slate-500'}`}>
                      {m.icon || <Target size={28} />}
                   </div>
                   <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                         <h3 className="font-heading font-black text-white uppercase tracking-tight">{m.title}</h3>
                         <div className="flex gap-3">
                            <span className="text-[10px] font-black text-cyber-gold uppercase tracking-widest">+{m.coins_reward} CP</span>
                            <span className="text-[10px] font-black text-mint uppercase tracking-widest">+{m.xp_reward} XP</span>
                         </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{m.description}</p>
                      <div className="space-y-2 pt-2">
                         <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">
                            <span>Operational Progress</span>
                            <span>{progress} / {m.target_value}</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              className={`h-full bg-gradient-to-r ${isCompleted ? 'from-mint to-mint-dark' : 'from-slate-700 to-slate-800'}`} 
                            />
                         </div>
                      </div>
                   </div>
                   <div className="ml-4">
                      {isClaimed ? (
                        <div className="text-mint"><CheckCircle2 size={24} /></div>
                      ) : isCompleted ? (
                        <button onClick={() => claimMission(m.id)} className="bg-mint text-obsidian p-2 rounded-xl shadow-neon-mint hover:scale-110 transition-transform">
                           <Gift size={20} />
                        </button>
                      ) : (
                        <div className="text-slate-800"><Lock size={20} /></div>
                      )}
                   </div>
                </motion.div>
              );
           })}
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
