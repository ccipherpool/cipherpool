import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Users2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Info, 
  ChevronLeft, 
  Sword, 
  Zap, 
  Wallet,
  Clock,
  Share2,
  AlertCircle,
  ExternalLink,
  Target,
  Flame,
  Layout
} from "lucide-react";
import Button from "../components/ui/Button";
import { format } from "date-fns";

const STATUS_CONFIG = {
  active: { label: "Live Now", color: "text-mint", bg: "bg-mint/10", border: "border-mint/20" },
  upcoming: { label: "Upcoming", color: "text-cyber-gold", bg: "bg-cyber-gold/10", border: "border-cyber-gold/20" },
  open: { label: "Recruiting", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  completed: { label: "Finalized", color: "text-slate-500", bg: "bg-slate-500/10", border: "border-white/5" },
  cancelled: { label: "Aborted", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
};

const TacticalCell = ({ label, value, icon: Icon, color = "text-mint", delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center gap-4 group hover:border-mint/20 transition-all"
  >
     <div className={`p-3 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
     </div>
     <div>
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white uppercase tracking-tight">{value}</p>
     </div>
  </motion.div>
);

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    const { data: tournamentData, error: tErr } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (tErr || !tournamentData) { navigate("/tournaments"); return; }
    setTournament(tournamentData);
    
    if (profile?.id) {
      const { data: requestData } = await supabase.from("tournament_participants").select("*").eq("tournament_id", id).eq("user_id", profile.id).maybeSingle();
      setUserRequest(requestData);
    }
    setLoading(false);
  };

  const requestToJoin = async () => {
    if (!profile) { navigate("/login"); return; }
    setError("");
    if (tournament.status === "completed" || tournament.status === "cancelled") { 
      setError("Recruitment protocols are inactive for this operation."); 
      return; 
    }
    if (tournament.current_players >= tournament.max_players) { 
      setError("Squad capacity reached. Units full."); 
      return; 
    }
    
    const canAfford = (profile.coins || 0) >= (tournament.entry_fee || 0);
    if (!canAfford) {
        setError(`Insufficient CP. Required: ${tournament.entry_fee} CP.`);
        return;
    }

    setRequesting(true);
    try {
      const { error: e } = await supabase.from("tournament_participants").insert([{ 
        tournament_id: id, 
        user_id: profile.id, 
        status: "pending" 
      }]);
      
      if (e) {
        if (e.code === "23505") setError("Unit already assigned to this operation.");
        else setError(e.message);
      } else { 
        navigate(`/tournaments/${id}/waiting`); 
      }
    } catch { 
      setError("System malfunction during assignment."); 
    }
    setRequesting(false);
  };

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  const status = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.upcoming;
  const progress = tournament.max_players > 0 ? (tournament.current_players / tournament.max_players) * 100 : 0;
  const isApproved = userRequest?.status === "approved";

  return (
    <div className="space-y-8 pb-20">
      {/* Back Button */}
      <button 
        onClick={() => navigate("/tournaments")}
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return to Operations</span>
      </button>

      {/* Cinematic Hero */}
      <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-obsidian-light/40 backdrop-blur-xl h-[400px] md:h-[500px]">
         <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070" 
              className="w-full h-full object-cover opacity-20 grayscale"
              alt="hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-deep via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian-deep/80 via-transparent to-transparent" />
         </div>

         <div className="relative z-10 p-8 md:p-16 h-full flex flex-col justify-end gap-6">
            <div className="flex flex-wrap items-center gap-3">
               <div className={`px-4 py-1.5 rounded-full ${status.bg} ${status.border} border backdrop-blur-md flex items-center gap-2`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>{status.label}</span>
               </div>
               <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  PLATFORM: FREE FIRE
               </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
               <div className="space-y-2">
                  <h1 className="text-4xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter leading-none">
                     {tournament.name}
                  </h1>
                  <p className="text-slate-400 text-lg max-w-2xl font-medium">
                     {tournament.description || "Establish dominance in this high-stakes tactical operation. Join the elite."}
                  </p>
               </div>

               <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] text-center min-w-[240px] backdrop-blur-md relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyber-gold/5 to-transparent pointer-events-none" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Tactical Reward</p>
                  <div className="flex items-baseline justify-center gap-2">
                     <span className="text-5xl font-heading font-black text-cyber-gold uppercase leading-none">
                        {(tournament.prize_coins || 0).toLocaleString()}
                     </span>
                     <span className="text-xs font-black text-cyber-gold/40 uppercase">CP</span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5">
                     <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <span>EST. DISTRIBUTION</span>
                        <span className="text-white">IMMEDIATE</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* Left Wing: intel */}
         <div className="lg:col-span-8 space-y-8">
            
            {/* Quick Stats Bento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <TacticalCell label="Units" value={`${tournament.current_players}/${tournament.max_players}`} icon={Users2} color="text-blue-400" />
               <TacticalCell label="Entry Protocol" value={tournament.entry_fee === 0 ? "FREE" : `${tournament.entry_fee} CP`} icon={Wallet} color="text-emerald-400" />
               <TacticalCell label="Tactical Map" value="BERMUDA" icon={MapPin} color="text-amber-400" />
               <TacticalCell label="Deployment" value={tournament.start_date ? format(new Date(tournament.start_date), "dd MMM yyyy") : "TBA"} icon={Calendar} color="text-purple-400" />
            </div>

            {/* Capacity Status */}
            <div className="ultra-glass p-8 space-y-6">
               <div className="flex justify-between items-center">
                  <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight">Recruitment Status</h3>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{Math.round(progress)}% OCCUPIED</span>
               </div>
               <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-mint via-mint/80 to-mint-dark rounded-full shadow-neon-mint" 
                  />
               </div>
               <p className="text-xs text-slate-500 font-medium">
                  {tournament.max_players - tournament.current_players} tactical slots remaining for deployment. Join now to secure your position.
               </p>
            </div>

            {/* Engagement Protocols (Rules) */}
            <div className="ultra-glass p-8">
               <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                  <ShieldCheck size={24} className="text-mint" /> Engagement Protocols
               </h3>
               <div className="space-y-6">
                  {[
                    { t: "Integrity Scan", d: "Anti-cheat protocols active. External software or unauthorized modifiers result in permanent termination." },
                    { t: "Deployment Window", d: "Units must check-in 15 minutes prior to operation start. Late arrival leads to mission failure." },
                    { t: "Validation Layer", d: "Match results are audited by senior operators. High-fidelity verification ensures total fairness." },
                    { t: "Tactical Conduct", d: "Professionalism is mandatory. Toxicity or insubordination will lead to immediate disqualification." }
                  ].map((rule, i) => (
                    <div key={i} className="flex gap-6 group">
                       <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 group-hover:text-mint group-hover:bg-mint/10 transition-all shrink-0">
                          <span className="font-mono text-xs font-bold">0{i+1}</span>
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-white uppercase mb-1">{rule.t}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{rule.d}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Right Wing: Registration Actions */}
         <div className="lg:col-span-4 space-y-6">
            
            <div className="ultra-glass p-10 border-mint/20 relative overflow-hidden sticky top-28">
               <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Target size={120} />
               </div>

               <div className="mb-10 text-center">
                  <h3 className="text-2xl font-heading font-black text-white uppercase tracking-tighter">JOIN OPERATION</h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                     <Zap size={14} className="text-mint" fill="currentColor" />
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Authorized Access Only</p>
                  </div>
               </div>

               <div className="space-y-6">
                  {/* Participant Preview */}
                  <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Entry Protocol</span>
                        <span className={`text-xs font-bold ${tournament.entry_fee === 0 ? 'text-mint' : 'text-white'}`}>
                           {tournament.entry_fee === 0 ? "FREE ADMISSION" : `${tournament.entry_fee} CP`}
                        </span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unit Status</span>
                        {profile ? (
                           <span className="text-xs font-bold text-white">READY FOR DEPLOY</span>
                        ) : (
                           <span className="text-xs font-bold text-red-400">UNAUTHORIZED</span>
                        )}
                     </div>
                  </div>

                  <AnimatePresence>
                     {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest"
                        >
                           <AlertCircle size={16} />
                           <span>Error: {error}</span>
                        </motion.div>
                     )}
                  </AnimatePresence>

                  {isApproved ? (
                     <Link to={`/tournaments/${id}/room`} className="block">
                        <button className="w-full py-5 rounded-2xl bg-mint text-obsidian font-heading font-black text-xs uppercase tracking-[0.2em] shadow-neon-mint transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
                           <Sword size={18} /> ENTER MISSION ROOM
                        </button>
                     </Link>
                  ) : userRequest?.status === "pending" ? (
                     <div className="w-full py-5 rounded-2xl bg-cyber-gold/10 border border-cyber-gold/30 text-cyber-gold font-heading font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                        <Clock size={18} className="animate-spin" /> ENLISTMENT PENDING
                     </div>
                  ) : (
                     <button 
                        onClick={requestToJoin}
                        disabled={requesting || tournament.current_players >= tournament.max_players}
                        className="w-full py-5 rounded-2xl bg-white text-obsidian font-heading font-black text-xs uppercase tracking-[0.2em] transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:transform-none"
                     >
                        {requesting ? (
                           <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={18} className="animate-spin" /> SYNCHRONIZING...
                           </div>
                        ) : tournament.current_players >= tournament.max_players ? (
                           "CAPACITY EXCEEDED"
                        ) : (
                           "INITIALIZE ENLISTMENT"
                        )}
                     </button>
                  )}

                  {!profile && (
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                        <Link to="/login" className="text-mint hover:underline">Authorize Profile</Link> to establish connection
                     </p>
                  )}
               </div>

               <div className="mt-10 pt-10 border-t border-white/5 flex items-center justify-between">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Share Protocol</p>
                  <div className="flex gap-3">
                     <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-mint hover:border-mint/30 transition-all">
                        <Share2 size={16} />
                     </button>
                     <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-400/30 transition-all">
                        <ExternalLink size={16} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Admin Quick View (Optional) */}
            {["admin", "super_admin"].includes(profile?.role) && (
               <div className="p-6 rounded-3xl border border-orange-500/20 bg-orange-500/5">
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Command Control</p>
                  <Link to={`/tournaments/${id}/manage`}>
                     <Button variant="outline" className="w-full border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white">
                        Access Control Panel
                     </Button>
                  </Link>
               </div>
            )}

         </div>

      </div>
    </div>
  );
}
