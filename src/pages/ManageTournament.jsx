import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Users2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  Search,
  Filter,
  BarChart3,
  Mail,
  Hash,
  Clock,
  ExternalLink,
  Target,
  Zap,
  MoreVertical,
  Activity
} from "lucide-react";
import Button from "../components/ui/Button";

export default function ManageTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const [tournament, setTournament] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedPlayers, setApprovedPlayers] = useState([]);
  const [rejectedPlayers, setRejectedPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    available: 0
  });

  useEffect(() => { checkAccess(); }, [id]);

  const checkAccess = async () => {
    const { data: tournamentData, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (error || !tournamentData) { navigate("/dashboard"); return; }
    
    // Check if user is organizer or admin
    if (tournamentData.created_by !== profile?.id && !['admin', 'super_admin'].includes(profile?.role)) {
      navigate("/dashboard");
      return;
    }

    setTournament(tournamentData);
    await fetchAllData(tournamentData);
  };

  const fetchAllData = async (tDoc) => {
    const { data: allRequests } = await supabase
      .from("tournament_participants")
      .select(`id, user_id, status, requested_at, reviewed_at, profiles!inner (username, full_name, email, free_fire_id, avatar_url, level)`)
      .eq("tournament_id", id)
      .order("requested_at", { ascending: true });

    if (!allRequests) { setLoading(false); return; }

    const pending = allRequests.filter(r => r.status === "pending");
    const approved = allRequests.filter(r => r.status === "approved");
    const rejected = allRequests.filter(r => r.status === "rejected");

    setPendingRequests(pending);
    setApprovedPlayers(approved);
    setRejectedPlayers(rejected);

    setStats({
      total: allRequests.length,
      pending: pending.length,
      approved: approved.length,
      available: (tDoc?.max_players || 0) - (approved.length)
    });

    setLoading(false);
  };

  const handleRequest = async (userId, status) => {
    if (status === "approved" && stats.approved >= tournament.max_players) {
      alert("CAPACITY EXCEEDED: Cannot approve more units.");
      return;
    }

    setProcessingId(userId);
    const { error: updateError } = await supabase
      .from("tournament_participants")
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq("tournament_id", id)
      .eq("user_id", userId);

    if (updateError) { alert(updateError.message); } 
    else if (status === "approved") {
      await supabase.from("tournaments").update({ current_players: stats.approved + 1 }).eq("id", id);
    }

    setProcessingId(null);
    await fetchAllData(tournament);
  };

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
         <div className="space-y-4">
            <button onClick={() => navigate(`/tournaments/${id}`)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
               <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Mission</span>
            </button>
            <h1 className="text-4xl md:text-6xl font-heading font-black text-white uppercase tracking-tighter leading-none">
               COMMAND <span className="text-mint">CENTER</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg uppercase tracking-widest">{tournament.name}</p>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            {[
              { l: "Incoming", v: stats.pending, c: "text-amber-400" },
              { l: "Deployed", v: stats.approved, c: "text-mint" },
              { l: "Available", v: stats.available, c: "text-blue-400" },
              { l: "Rejected", v: rejectedPlayers.length, c: "text-red-500" }
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/5 px-6 py-4 rounded-2xl text-center">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.l}</p>
                 <p className={`text-2xl font-impact ${s.c}`}>{s.v}</p>
              </div>
            ))}
         </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* Pending List */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <Activity size={24} className="text-amber-400" /> Operational Queue
               </h3>
               <div className="relative group hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-mint" size={14} />
                  <input 
                    type="text" 
                    placeholder="Scan units..."
                    className="bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-mint/30"
                  />
               </div>
            </div>

            <div className="space-y-4">
               {pendingRequests.map((req, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={req.id} 
                    className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-amber-400/20"
                  >
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative">
                           {req.profiles.avatar_url ? (
                             <img src={req.profiles.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="p" />
                           ) : (
                             <span className="text-2xl font-impact text-slate-500">{(req.profiles.username || 'U')[0]}</span>
                           )}
                           <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center text-obsidian text-[8px] font-black">
                              LVL{req.profiles.level || 1}
                           </div>
                        </div>
                        <div>
                           <h4 className="text-lg font-bold text-white uppercase tracking-tight mb-1">{req.profiles.username || req.profiles.full_name}</h4>
                           <div className="flex flex-wrap gap-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Hash size={12} /> FF: {req.profiles.free_fire_id || '---'}</span>
                              <span className="flex items-center gap-1.5"><Mail size={12} /> {req.profiles.email}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleRequest(req.user_id, "approved")}
                          disabled={processingId === req.user_id || stats.available <= 0}
                          className="px-6 py-3 rounded-xl bg-mint text-obsidian font-black text-[10px] uppercase tracking-widest shadow-neon-mint hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                           {processingId === req.user_id ? "..." : "Authorize"}
                        </button>
                        <button 
                          onClick={() => handleRequest(req.user_id, "rejected")}
                          disabled={processingId === req.user_id}
                          className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                        >
                           Reject
                        </button>
                     </div>
                  </motion.div>
               ))}
               {pendingRequests.length === 0 && (
                 <div className="py-20 text-center opacity-20">
                    <Target size={64} className="mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Incoming Units</p>
                 </div>
               )}
            </div>
         </div>

         {/* Deployed Roster */}
         <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
               <ShieldCheck size={24} className="text-mint" /> Deployed Roster
            </h3>
            <div className="ultra-glass p-6 space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
               {approvedPlayers.map(player => (
                  <div key={player.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4 group">
                     <div className="w-10 h-10 rounded-lg bg-mint/10 border border-mint/20 flex items-center justify-center text-mint font-impact text-sm">
                        #{player.profiles.level || 1}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white uppercase truncate">{player.profiles.username}</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Verified Asset</p>
                     </div>
                     <button onClick={() => handleRequest(player.user_id, "pending")} className="p-2 text-slate-700 hover:text-red-400 transition-colors">
                        <XCircle size={16} />
                     </button>
                  </div>
               ))}
               {approvedPlayers.length === 0 && (
                 <p className="text-center text-[10px] font-black text-slate-700 py-10">Roster Empty</p>
               )}
            </div>
         </div>

      </div>
    </div>
  );
}
