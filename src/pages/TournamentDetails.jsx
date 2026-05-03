import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { ChevronLeft, Users, Zap, Clock, Shield } from "lucide-react";

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(userData);
    }
    const { data: tournamentData, error: tErr } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (tErr || !tournamentData) { navigate("/tournaments"); return; }
    setTournament(tournamentData);
    if (user) {
      const { data: requestData } = await supabase.from("tournament_participants").select("*").eq("tournament_id", id).eq("user_id", user.id).maybeSingle();
      setUserRequest(requestData);
      setIsApproved(requestData?.status === "approved");
    }
    setLoading(false);
  };

  const requestToJoin = async () => {
    if (!profile) { navigate("/login"); return; }
    setError("");
    if (tournament.status !== "open" && tournament.status !== "upcoming" && tournament.status !== "active") {
      setError("Les inscriptions sont fermées pour ce tournoi."); return;
    }
    if (tournament.current_players >= tournament.max_players) { setError("Ce tournoi est complet."); return; }
    setRequesting(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const { error: e } = await supabase.from("tournament_participants").insert([{ tournament_id: id, user_id: user.id, status: "pending" }]);
      if (e) {
        if (e.code === "23505") setError("Vous êtes déjà inscrit à ce tournoi.");
        else setError(e.message);
      } else {
        navigate(`/tournaments/${id}/waiting`);
      }
    } catch { setError("Une erreur est survenue."); }
    setRequesting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  const pct = tournament.max_players > 0 ? Math.round((tournament.current_players / tournament.max_players) * 100) : 0;
  const full = tournament.current_players >= tournament.max_players;
  const STATUS = {
    active:    { label: "EN COURS",  color: "#06b6d4" },
    upcoming:  { label: "À VENIR",   color: "#f97316" },
    open:      { label: "OUVERT",    color: "#10b981" },
    completed: { label: "TERMINÉ",   color: "rgba(255,255,255,0.3)" },
  };
  const s = STATUS[tournament.status] || STATUS.upcoming;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/tournaments")} className="flex items-center gap-2 text-white/30 hover:text-cyan-400 font-mono text-[10px] uppercase tracking-widest transition-colors">
        <ChevronLeft size={14} /> Retour aux tournois
      </button>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Top accent bar */}
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${s.color},transparent)` }} />

        <div className="p-6 md:p-8">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-[10px] font-black px-3 py-1 rounded-full font-mono flex items-center gap-1.5"
                  style={{ color: s.color, background: s.color + "15", border: `1px solid ${s.color}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">{tournament.mode || "Mode Compétitif"}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-sm text-white/40 leading-relaxed max-w-2xl">{tournament.description}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { icon: "💰", val: (tournament.prize_coins || 0).toLocaleString(), label: "PRIZE POOL", color: "#f97316" },
              { icon: "🎟️", val: (tournament.entry_fee || 0) === 0 ? "FREE" : String(tournament.entry_fee), label: "ENTRÉE", color: tournament.entry_fee === 0 ? "#06b6d4" : "#f43f5e" },
              { icon: "👥", val: `${tournament.current_players || 0}/${tournament.max_players || 0}`, label: "JOUEURS", color: "#60a5fa" },
              { icon: "🗺️", val: "Bermuda", label: "MAP", color: "rgba(255,255,255,0.4)" },
            ].map(stat => (
              <div key={stat.label} className="py-3 px-4 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-lg mb-1">{stat.icon}</div>
                <p className="text-sm font-bold font-mono" style={{ color: stat.color }}>{stat.val}</p>
                <p className="text-[8px] text-white/25 font-mono tracking-widest mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Rules */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-6" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} className="text-cyan-400" />
              <p className="font-mono text-[10px] font-black text-cyan-400 uppercase tracking-widest">Règlement</p>
            </div>
            <ul className="space-y-3">
              {[
                "Pas de triche ni d'émulateurs autorisés.",
                "Soyez présents 15 minutes avant le début.",
                "Les résultats sont validés manuellement par le staff.",
                "Le fair-play est obligatoire — tout comportement toxique entraîne une disqualification.",
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/50 leading-relaxed">
                  <span className="text-cyan-500/60 font-mono text-[10px] mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                  {rule}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Info grid */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl p-6" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-mono text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Informations</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Organisateur", val: "CipherPool Staff" },
                { label: "Format", val: tournament.mode || "Solo" },
                { label: "Plateforme", val: "Free Fire Mobile" },
                { label: "Date", val: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("fr-FR") : "À annnoncer" },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm text-white/70 font-medium">{item.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: registration */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-mono text-[10px] font-black text-white/30 uppercase tracking-widest">Inscription</p>

            {/* Fill */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-white/60 font-medium">{tournament.current_players || 0} / {tournament.max_players || 0} joueurs</span>
                <span className="text-sm font-bold font-mono" style={{ color: full ? "#f43f5e" : "#06b6d4" }}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: full ? "linear-gradient(90deg,#f43f5e,#b91c1c)" : "linear-gradient(90deg,#06b6d4,#0891b2)" }} />
              </div>
            </div>

            {/* Prize info */}
            <div className="flex justify-between py-3 border-t border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1">Prize Pool</p>
                <p className="text-lg font-black font-mono" style={{ color: "#f97316" }}>{(tournament.prize_coins || 0).toLocaleString()} CP</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1">Entrée</p>
                <p className="text-lg font-black font-mono" style={{ color: (tournament.entry_fee || 0) === 0 ? "#06b6d4" : "#f43f5e" }}>
                  {(tournament.entry_fee || 0) === 0 ? "FREE" : `${tournament.entry_fee} CP`}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl text-xs text-red-300" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            {/* CTA */}
            {isApproved ? (
              <Link to={`/tournaments/${id}/room`}
                className="w-full py-4 rounded-xl font-bold text-xs font-mono tracking-widest flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#000", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>
                <Zap size={14} /> ACCÉDER À LA SALLE
              </Link>
            ) : userRequest?.status === "pending" ? (
              <div className="w-full py-4 rounded-xl font-bold text-xs font-mono tracking-widest flex items-center justify-center gap-2"
                style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                <Clock size={14} /> DEMANDE EN ATTENTE
              </div>
            ) : (
              <button onClick={requestToJoin} disabled={requesting || full}
                className="w-full py-4 rounded-xl font-bold text-xs font-mono tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{
                  background: full ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#06b6d4,#0891b2)",
                  color: full ? "rgba(255,255,255,0.2)" : "#000",
                  cursor: full ? "not-allowed" : "pointer",
                  boxShadow: full ? "none" : "0 4px 16px rgba(6,182,212,0.3)",
                }}>
                {requesting ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : full ? (
                  "TOURNOI COMPLET"
                ) : (
                  <>S'INSCRIRE AU TOURNOI <Users size={14} /></>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
