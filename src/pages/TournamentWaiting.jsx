import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle, XCircle, Trophy, Users, Zap } from "lucide-react";

const STATUS_CFG = {
  pending:  {
    icon: Clock, color: "#f97316",
    label: "Awaiting Approval",
    desc: "Your application has been sent. You will be redirected as soon as staff approves your participation.",
    bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.22)",
    glow: "rgba(249,115,22,0.15)",
  },
  approved: {
    icon: CheckCircle, color: "#10b981",
    label: "Approved! Redirecting…",
    desc: "Congratulations! Your request was approved. Redirecting you to the match center…",
    bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.22)",
    glow: "rgba(16,185,129,0.15)",
  },
  rejected: {
    icon: XCircle, color: "#f43f5e",
    label: "Request Rejected",
    desc: "Your request was declined by the organizer. You can register for other open tournaments.",
    bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.22)",
    glow: "rgba(244,63,94,0.12)",
  },
};

export default function TournamentWaiting() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [tournament, setTournament]   = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading,     setLoading]     = useState(true);

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
      <div className="w-9 h-9 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(6,182,212,0.15)", borderTopColor: "#06B6D4" }} />
    </div>
  );

  const cfg     = STATUS_CFG[userRequest?.status] || STATUS_CFG.pending;
  const Icon    = cfg.icon;
  const isPending  = userRequest?.status === "pending";
  const isApproved = userRequest?.status === "approved";
  const isRejected = userRequest?.status === "rejected";

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Back */}
      <button
        onClick={() => navigate(`/tournaments/${id}`)}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer transition-colors duration-200"
        style={{ color: "rgba(255,255,255,0.28)", padding: 0, fontSize: 11, letterSpacing: "0.15em", fontFamily: "monospace" }}
        onMouseEnter={e => e.currentTarget.style.color = "#06B6D4"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.28)"}
      >
        <ArrowLeft size={13} /> BACK TO TOURNAMENT
      </button>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl p-8 text-center"
        style={{
          background: "rgba(8,10,22,0.98)",
          border: `1px solid ${cfg.border}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 60px ${cfg.glow}`,
        }}
      >
        {/* Aurora glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${cfg.color}, transparent 65%)`, filter: "blur(32px)" }} />
        </div>

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg,transparent,${cfg.color}cc,transparent)` }} />

        {/* Icon */}
        <div className="relative z-10 mb-6">
          <motion.div
            animate={isPending ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 30px ${cfg.glow}` }}
          >
            <Icon size={28} style={{ color: cfg.color }} />
          </motion.div>
          {isPending && (
            <motion.div
              className="absolute inset-0 mx-auto w-16 h-16 rounded-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ border: `1px solid ${cfg.color}`, margin: "0 auto" }}
            />
          )}
        </div>

        <h1 className="text-2xl font-black mb-3 relative z-10" style={{ color: "rgba(255,255,255,0.92)" }}>
          {cfg.label}
        </h1>
        <p className="text-sm leading-relaxed mb-6 relative z-10" style={{ color: "rgba(255,255,255,0.38)" }}>
          {cfg.desc}
        </p>

        {/* Tournament card */}
        {tournament && (
          <div className="rounded-xl p-4 mb-6 text-left relative z-10"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <p className="font-bold text-white text-sm mb-2">{tournament.name}</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <Trophy size={11} style={{ color: "#f97316" }} />
                <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {(tournament.prize_coins || 0).toLocaleString()} CP
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={11} style={{ color: "#06B6D4" }} />
                <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {tournament.current_players || 0}/{tournament.max_players || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 relative z-10">
          {isApproved && (
            <Link to={`/tournaments/${id}/room`}
              className="py-4 rounded-xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", textDecoration: "none", boxShadow: "0 6px 24px rgba(16,185,129,0.4)", letterSpacing: "0.1em", fontSize: 12 }}>
              <Zap size={14} /> ENTER MATCH CENTER
            </Link>
          )}
          {isRejected && (
            <Link to="/tournaments"
              className="py-4 rounded-xl font-bold text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg,#7C3AED,#06B6D4)", color: "#fff", textDecoration: "none", boxShadow: "0 6px 24px rgba(124,58,237,0.4)", letterSpacing: "0.1em", fontSize: 12 }}>
              Browse Other Tournaments
            </Link>
          )}
          {isPending && (
            <Link to="/tournaments"
              className="py-3 rounded-xl text-xs font-semibold tracking-widest flex items-center justify-center gap-2 transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", textDecoration: "none", letterSpacing: "0.1em", fontSize: 11 }}>
              Explore Other Tournaments
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
