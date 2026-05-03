import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export default function TournamentWaiting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel("tournament-waiting-" + id)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "tournament_participants",
        filter: `tournament_id=eq.${id}`,
      }, (payload) => {
        if (payload.new.user_id === userRequest?.user_id) {
          setUserRequest(payload.new);
          if (payload.new.status === "approved") {
            navigate(`/tournaments/${id}/room`);
          }
        }
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: tournamentData } = await supabase.from("tournaments").select("*").eq("id", id).single();
    setTournament(tournamentData);

    const { data: requestData } = await supabase
      .from("tournament_participants").select("*").eq("tournament_id", id).eq("user_id", user.id).single();

    if (!requestData) { navigate(`/tournaments/${id}`); return; }
    setUserRequest(requestData);
    setLoading(false);

    if (requestData.status === "approved") navigate(`/tournaments/${id}/room`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  const STATUS_CFG = {
    pending:  { icon: "⏳", color: "#f97316", label: "En attente d'approbation", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
    approved: { icon: "✅", color: "#10b981", label: "Approuvé ! Redirection...", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
    rejected: { icon: "❌", color: "#f43f5e", label: "Demande refusée", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.2)" },
  };
  const st = STATUS_CFG[userRequest?.status] || STATUS_CFG.pending;

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <button onClick={() => navigate(`/tournaments/${id}`)} className="flex items-center gap-2 text-white/30 hover:text-cyan-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
        <ChevronLeft size={14} /> Retour au tournoi
      </button>

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Top accent */}
        <div className="h-px w-full mb-8" style={{ background: `linear-gradient(90deg,transparent,${st.color},transparent)` }} />

        <motion.div
          animate={userRequest?.status === "pending" ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl mb-6"
        >
          {st.icon}
        </motion.div>

        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">{st.label}</h1>

        {userRequest?.status === "pending" && (
          <p className="text-sm text-white/40 leading-relaxed mb-6">
            Ta demande d'inscription a été envoyée. Tu recevras une notification dès que le staff approuve ta participation.
          </p>
        )}
        {userRequest?.status === "approved" && (
          <p className="text-sm text-white/40 leading-relaxed mb-6">
            Félicitations ! Tu as été approuvé. Tu vas être redirigé vers la salle du tournoi...
          </p>
        )}
        {userRequest?.status === "rejected" && (
          <p className="text-sm text-white/40 leading-relaxed mb-6">
            Ta demande a été refusée par l'organisateur. Tu peux t'inscrire à d'autres tournois.
          </p>
        )}

        {/* Tournament card */}
        {tournament && (
          <div className="rounded-xl p-4 mb-6 text-left" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
            <p className="font-bold text-white text-sm mb-1">{tournament.name}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-[10px] font-mono text-white/40">💰 {tournament.prize_coins || 0} CP</span>
              <span className="text-[10px] font-mono text-white/40">👥 {tournament.current_players || 0}/{tournament.max_players || 0}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {userRequest?.status === "approved" && (
            <Link to={`/tournaments/${id}/room`}
              className="py-4 rounded-xl font-bold text-xs font-mono tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#000", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>
              ENTRER DANS LA SALLE →
            </Link>
          )}
          {userRequest?.status === "rejected" && (
            <Link to="/tournaments"
              className="py-4 rounded-xl font-bold text-xs font-mono tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", color: "#000", boxShadow: "0 4px 16px rgba(6,182,212,0.3)" }}>
              VOIR LES AUTRES TOURNOIS →
            </Link>
          )}
          {userRequest?.status === "pending" && (
            <Link to="/tournaments"
              className="py-3 rounded-xl font-bold text-xs font-mono tracking-widest flex items-center justify-center gap-2 transition-all text-white/30 hover:text-white/60"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Explorer d'autres tournois
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
