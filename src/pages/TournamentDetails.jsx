import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Trophy, Calendar, Zap, Shield, Info,
  CheckCircle, Clock, AlertCircle, Copy, Check, Share2,
  Star, ChevronRight, Timer, Target, Swords, Crown,
  Edit3, X, User, Gamepad2, MapPin, AlertTriangle,
} from "lucide-react";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  draft:             { label: "DRAFT",        color: "rgba(255,255,255,0.3)", glow: "transparent",              bg: "rgba(255,255,255,0.04)"   },
  published:         { label: "COMING SOON",  color: "#f97316",               glow: "rgba(249,115,22,0.25)",    bg: "rgba(249,115,22,0.08)"    },
  registration_open: { label: "OPEN",         color: "#10b981",               glow: "rgba(16,185,129,0.25)",    bg: "rgba(16,185,129,0.08)"    },
  full:              { label: "FULL",         color: "#f59e0b",               glow: "rgba(245,158,11,0.25)",    bg: "rgba(245,158,11,0.08)"    },
  ready:             { label: "READY",        color: "#06b6d4",               glow: "rgba(6,182,212,0.25)",     bg: "rgba(6,182,212,0.08)"     },
  live:              { label: "LIVE",         color: "#06b6d4",               glow: "rgba(6,182,212,0.3)",      bg: "rgba(6,182,212,0.1)"      },
  results_pending:   { label: "RESULTS",      color: "#8b5cf6",               glow: "rgba(139,92,246,0.25)",    bg: "rgba(139,92,246,0.08)"    },
  completed:         { label: "COMPLETED",    color: "rgba(255,255,255,0.3)", glow: "transparent",              bg: "rgba(255,255,255,0.04)"   },
  archived:          { label: "ARCHIVED",     color: "rgba(255,255,255,0.2)", glow: "transparent",              bg: "rgba(255,255,255,0.03)"   },
  cancelled:         { label: "CANCELLED",    color: "#f43f5e",               glow: "rgba(244,63,94,0.25)",     bg: "rgba(244,63,94,0.08)"     },
};

const TIMELINE_STAGES = [
  { key: "registration_open", label: "Registration" },
  { key: "ready",             label: "Check-In"     },
  { key: "live",              label: "Live"         },
  { key: "results_pending",   label: "Results"      },
  { key: "completed",         label: "Finished"     },
];
const STAGE_ORDER = { registration_open: 0, full: 0, ready: 1, live: 2, results_pending: 3, completed: 4, archived: 4 };

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(target) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, past: false });
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target) - Date.now();
      if (diff <= 0) { setTime({ d: 0, h: 0, m: 0, s: 0, past: true }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ d, h, m, s, past: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

// ─── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: copied ? "#10b981" : "rgba(255,255,255,0.4)" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span className="text-[10px] font-semibold">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ─── Tab nav ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview", label: "Overview",  icon: Target  },
  { key: "prizes",   label: "Prizes",    icon: Trophy  },
  { key: "players",  label: "Players",   icon: Users   },
  { key: "rules",    label: "Rules",     icon: Shield  },
  { key: "info",     label: "Info",      icon: Info    },
];

// ─── Countdown display ─────────────────────────────────────────────────────────
function CountdownDisplay({ time, label, color = "#06B6D4", urgent = false }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: urgent ? "#f43f5e" : "rgba(255,255,255,0.28)" }}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        {[
          { v: time.d, l: "D" },
          { v: time.h, l: "H" },
          { v: time.m, l: "M" },
          { v: time.s, l: "S" },
        ].map(({ v, l }) => (
          <div key={l} className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tabular-nums" style={{ color, fontFamily: "monospace" }}>
              {String(v).padStart(2, "0")}
            </span>
            <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</span>
            {l !== "S" && <span className="text-sm font-bold mx-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Registration confirmation modal ─────────────────────────────────────────
function JoinConfirmModal({ profile, tournament, onConfirm, onCancel, loading }) {
  const free = (tournament?.entry_fee || 0) === 0;
  const hasFfInfo = profile?.free_fire_name && profile?.free_fire_uid;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative overflow-hidden rounded-2xl"
        style={{ background: "rgba(8,10,24,0.99)", border: "1px solid rgba(124,58,237,0.35)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg,transparent,#7C3AED,#06B6D4,transparent)" }} />

        {/* Aurora glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,0.12),transparent 65%)", filter: "blur(24px)" }} />

        <div className="relative z-10 p-6">
          {/* Close */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <X size={14} />
          </button>

          {/* Header */}
          <div className="mb-5">
            <h2 className="text-lg font-black mb-1" style={{ color: "#fff", fontFamily: "Orbitron,monospace" }}>
              Confirm Registration
            </h2>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Review your info before joining <span style={{ color: "#A78BFA", fontWeight: 700 }}>{tournament.name}</span>
            </p>
          </div>

          {/* Player info card */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
              YOUR PROFILE
            </p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div className="w-full h-full flex items-center justify-center" style={{ color: "#A78BFA", fontSize: 18 }}>
                      {profile?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                }
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "#fff" }}>{profile?.username || "Unknown"}</p>
                {profile?.country && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{profile.country}{profile.city ? `, ${profile.city}` : ""}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5" style={{ background: hasFfInfo ? "rgba(6,182,212,0.06)" : "rgba(244,63,94,0.06)", border: `1px solid ${hasFfInfo ? "rgba(6,182,212,0.15)" : "rgba(244,63,94,0.2)"}` }}>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.22)" }}>FF NAME</p>
                <p className="text-xs font-bold truncate" style={{ color: hasFfInfo ? "#06B6D4" : "#f43f5e" }}>
                  {profile?.free_fire_name || "Not set"}
                </p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: hasFfInfo ? "rgba(6,182,212,0.06)" : "rgba(244,63,94,0.06)", border: `1px solid ${hasFfInfo ? "rgba(6,182,212,0.15)" : "rgba(244,63,94,0.2)"}` }}>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.22)" }}>FF UID</p>
                <p className="text-xs font-bold font-mono truncate" style={{ color: hasFfInfo ? "#06B6D4" : "#f43f5e" }}>
                  {profile?.free_fire_uid || "Not set"}
                </p>
              </div>
            </div>
          </div>

          {/* Warning if FF info missing */}
          {!hasFfInfo && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)" }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: "#f59e0b" }}>
                  Free Fire info incomplete
                </p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  You can still register, but complete your FF name and UID in your profile to avoid disqualification.
                </p>
              </div>
            </div>
          )}

          {/* Tournament summary */}
          <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>ENTRY FEE</p>
                <p className="text-lg font-black" style={{ color: free ? "#10b981" : "#f43f5e", fontFamily: "Orbitron,monospace" }}>
                  {free ? "FREE" : `${tournament.entry_fee} CP`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>PRIZE POOL</p>
                <p className="text-lg font-black" style={{ color: "#f97316", fontFamily: "Orbitron,monospace" }}>
                  {(tournament.prize_coins || 0).toLocaleString()} CP
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!hasFfInfo && (
              <Link
                to="/profile"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", textDecoration: "none" }}
              >
                <Edit3 size={13} /> Edit Profile
              </Link>
            )}
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200"
              style={{
                background: loading ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#7C3AED,#06B6D4)",
                color: loading ? "rgba(255,255,255,0.3)" : "#fff",
                boxShadow: loading ? "none" : "0 6px 24px rgba(124,58,237,0.4)",
                border: "none",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle size={13} /> Confirm Registration</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Registration progress steps ──────────────────────────────────────────────
const PROGRESS_STEPS = [
  { key: "join",    label: "Register"  },
  { key: "approve", label: "Approval"  },
  { key: "ready",   label: "Check-In"  },
  { key: "play",    label: "Play"      },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TournamentDetails() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [tournament, setTournament]   = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [requesting,  setRequesting]  = useState(false);
  const [profile,     setProfile]     = useState(null);
  const [isApproved,  setIsApproved]  = useState(false);
  const [error,       setError]       = useState("");
  const [tab,         setTab]         = useState("overview");
  const [copied,      setCopied]      = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const tabBarRef = useRef(null);

  const countdown            = useCountdown(tournament?.start_date);
  const regDeadlineCountdown = useCountdown(tournament?.start_date);

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
    setRequesting(true);
    setShowJoinModal(false);
    try {
      const { data, error: e } = await supabase.rpc("join_tournament", { p_tournament_id: id });
      if (e) { setError(e.message); return; }
      if (!data.success) { setError(data.error || "Cannot join this tournament."); return; }
      navigate(`/tournaments/${id}/waiting`);
    } catch { setError("An error occurred."); }
    finally { setRequesting(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/t/${tournament?.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <div className="w-9 h-9 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "#06B6D4" }} />
    </div>
  );

  const pct           = tournament.max_players > 0 ? Math.round((tournament.current_players / tournament.max_players) * 100) : 0;
  const full          = tournament.current_players >= tournament.max_players;
  const s             = STATUS_MAP[tournament.status] || STATUS_MAP.published;
  const free          = (tournament.entry_fee || 0) === 0;
  const canRegister   = tournament.status === "registration_open" && !full;
  const notOpenYet    = ["draft", "published"].includes(tournament.status);
  const alreadyDone   = ["completed", "archived", "cancelled"].includes(tournament.status);
  const isLive        = tournament.status === "live";
  const currentStage  = STAGE_ORDER[tournament.status] ?? 0;
  const isEliminated  = userRequest?.status === "eliminated";

  // Registration deadline = start_date (proxy: reg closes when tournament begins)
  const regUrgent = !regDeadlineCountdown.past &&
    (regDeadlineCountdown.d === 0 && regDeadlineCountdown.h < 2);

  const RULES = [
    "No cheating, hacks, or emulators are allowed.",
    "Be present 15 minutes before the match starts.",
    "Results are manually verified by staff within 24h.",
    "Fair play is mandatory — toxic behavior leads to disqualification.",
    ...(tournament.rules ? [tournament.rules] : []),
  ];

  // ── Current user registration step ──
  const regStep = isEliminated ? -1
    : isApproved ? 1
    : userRequest?.status === "pending" ? 0
    : userRequest?.status === "rejected" ? -2
    : null;

  // ── CTA button ──
  const CtaButton = ({ compact = false }) => {
    const h  = compact ? "42px" : "52px";
    const fs = compact ? 10 : 11;

    if (isApproved && !["completed","archived","cancelled","live"].includes(tournament.status)) return (
      <Link to={`/tournaments/${id}/room`}
        className="flex items-center justify-center gap-2 w-full font-bold rounded-xl transition-all duration-200"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#000", textDecoration: "none", background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 6px 24px rgba(16,185,129,0.4)" }}
      >
        <Zap size={15} /> {compact ? "ENTER ROOM" : "ENTER MATCH CENTER"}
      </Link>
    );
    if (isApproved && isLive) return (
      <Link to={`/tournaments/${id}/room`}
        className="flex items-center justify-center gap-2 w-full font-bold rounded-xl transition-all duration-200"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#fff", textDecoration: "none",
          background: "linear-gradient(135deg,#06b6d4,#0284c7)",
          boxShadow: "0 6px 24px rgba(6,182,212,0.4)",
          animation: "live-pulse 2s ease infinite",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "live-pulse 1.4s ease infinite" }} />
        {compact ? "WATCH LIVE" : "LIVE — ENTER ROOM"}
      </Link>
    );
    if (isEliminated) return (
      <div className="flex items-center justify-center w-full rounded-xl"
        style={{ height: h, fontSize: fs, letterSpacing: "0.12em", color: "#f43f5e", background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.2)" }}>
        ELIMINATED
      </div>
    );
    if (userRequest?.status === "rejected") return (
      <div className="flex items-center justify-center gap-2 w-full rounded-xl"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#f43f5e", background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.2)" }}>
        <X size={14} /> REGISTRATION DECLINED
      </div>
    );
    if (alreadyDone) return (
      <div className="flex items-center justify-center w-full rounded-xl"
        style={{ height: h, fontSize: fs, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        ENDED
      </div>
    );
    if (notOpenYet) return (
      <div className="flex items-center justify-center gap-2 w-full rounded-xl"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#f97316", background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
        <Clock size={14} /> COMING SOON
      </div>
    );
    if (userRequest?.status === "pending") return (
      <div className="flex flex-col items-center justify-center gap-1 w-full rounded-xl"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.22)" }}>
        <div className="flex items-center gap-1.5">
          <Clock size={14} /> PENDING APPROVAL
        </div>
        {!compact && <span className="text-[9px] opacity-60">Staff will review your request</span>}
      </div>
    );
    return (
      <button onClick={() => {
        if (!profile) { navigate("/login"); return; }
        setShowJoinModal(true);
      }}
        disabled={requesting || !canRegister}
        className="w-full rounded-xl font-bold transition-all duration-200"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", border: "none", cursor: (requesting || !canRegister) ? "not-allowed" : "pointer",
          background: !canRegister ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#7C3AED,#06B6D4)",
          color: !canRegister ? "rgba(255,255,255,0.2)" : "#fff",
          boxShadow: !canRegister ? "none" : "0 6px 24px rgba(124,58,237,0.4)",
          opacity: requesting ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {requesting
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : full ? "TOURNAMENT FULL" : <><Users size={15} /> JOIN TOURNAMENT</>
        }
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-0 pb-24 md:pb-0" style={{ fontFamily: "'Inter','Space Grotesk',sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes live-pulse{0%,100%{opacity:1}50%{opacity:0.55}}
      `}</style>

      {/* ── Join Confirm Modal ── */}
      <AnimatePresence>
        {showJoinModal && tournament && profile && (
          <JoinConfirmModal
            profile={profile}
            tournament={tournament}
            onConfirm={requestToJoin}
            onCancel={() => setShowJoinModal(false)}
            loading={requesting}
          />
        )}
      </AnimatePresence>

      {/* ── Back ── */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => navigate("/tournaments")}
        className="inline-flex items-center gap-2 mb-4 bg-transparent border-none cursor-pointer transition-colors duration-200"
        style={{ color: "rgba(255,255,255,0.3)", padding: 0, fontSize: 11, letterSpacing: "0.15em", fontFamily: "monospace" }}
        onMouseEnter={e => e.currentTarget.style.color = "#06B6D4"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
      >
        <ArrowLeft size={13} /> BACK TO TOURNAMENTS
      </motion.button>

      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl mb-5"
        style={{
          background: tournament.banner_url
            ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(5,8,22,0.95) 80%), url(${tournament.banner_url}) center/cover no-repeat`
            : "linear-gradient(135deg, rgba(10,5,30,0.99) 0%, rgba(5,8,22,0.99) 50%, rgba(10,5,30,0.99) 100%)",
          border: `1px solid ${s.color}20`,
          minHeight: 220,
        }}
      >
        {/* Aurora orbs */}
        {!tournament.banner_url && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 right-0 w-80 h-80 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle, ${s.color}, transparent 65%)`, filter: "blur(40px)" }} />
            <div className="absolute bottom-0 -left-16 w-56 h-56 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, #7C3AED, transparent 65%)", filter: "blur(32px)" }} />
          </div>
        )}

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${s.color}cc, transparent)` }} />

        <div className="relative z-10 p-5 md:p-8">
          {/* Status + mode badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
              style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}35` }}
            >
              {isLive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, animation: "live-pulse 1.4s ease infinite", display: "inline-block" }} />}
              {s.label}
            </span>
            {tournament.mode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
                style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {tournament.mode}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
              style={{ color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
              FREE FIRE
            </span>
            {/* My registration status badge */}
            {userRequest && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
                style={{
                  color:  isApproved ? "#10b981" : isEliminated ? "#f43f5e" : userRequest.status === "rejected" ? "#f43f5e" : "#f97316",
                  background: isApproved ? "rgba(16,185,129,0.1)" : isEliminated ? "rgba(244,63,94,0.1)" : "rgba(249,115,22,0.08)",
                  border: `1px solid ${isApproved ? "rgba(16,185,129,0.3)" : isEliminated ? "rgba(244,63,94,0.3)" : "rgba(249,115,22,0.22)"}`,
                }}>
                {isApproved ? "✓ REGISTERED" : isEliminated ? "ELIMINATED" : userRequest.status === "rejected" ? "DECLINED" : "⏳ PENDING"}
              </span>
            )}
          </div>

          {/* Title + prize */}
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
            <div className="flex-1">
              <h1 className="font-black leading-tight mb-2"
                style={{ fontFamily: "Orbitron,monospace", fontSize: "clamp(20px,4vw,38px)", color: "#fff" }}>
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-sm leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {tournament.description}
                </p>
              )}
            </div>

            {/* Prize box - desktop */}
            <div className="hidden md:flex flex-col items-center px-7 py-5 rounded-2xl flex-shrink-0"
              style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>PRIZE POOL</p>
              <p className="font-black leading-none" style={{ fontFamily: "Orbitron,monospace", fontSize: "clamp(26px,3vw,40px)", color: "#f97316" }}>
                {(tournament.prize_coins || 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-bold mt-1" style={{ color: "rgba(249,115,22,0.5)" }}>CP COINS</p>
            </div>
          </div>

          {/* Countdown + stats row */}
          <div className="mt-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Countdown to start */}
            {tournament.start_date && !countdown.past && (
              <div className="flex items-center gap-3">
                <Timer size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                <CountdownDisplay
                  time={countdown}
                  color={canRegister && regUrgent ? "#f43f5e" : "#06B6D4"}
                />
                {canRegister && !countdown.past && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ color: regUrgent ? "#f43f5e" : "rgba(255,255,255,0.3)", background: regUrgent ? "rgba(244,63,94,0.1)" : "transparent", border: regUrgent ? "1px solid rgba(244,63,94,0.25)" : "none" }}>
                    {regUrgent ? "⚠ CLOSING SOON" : "REG. CLOSES AT START"}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1" />

            {/* Quick stat chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Users size={11} style={{ color: "rgba(255,255,255,0.4)" }} />
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: full ? "#f59e0b" : "rgba(255,255,255,0.75)" }}>
                  {tournament.current_players}/{tournament.max_players}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ background: free ? "rgba(6,182,212,0.08)" : "rgba(244,63,94,0.08)", border: `1px solid ${free ? "rgba(6,182,212,0.2)" : "rgba(244,63,94,0.2)"}` }}>
                <Zap size={11} style={{ color: free ? "#06B6D4" : "#f43f5e" }} />
                <span className="text-[11px] font-bold" style={{ color: free ? "#06B6D4" : "#f43f5e" }}>
                  {free ? "FREE" : `${tournament.entry_fee} CP`}
                </span>
              </div>
              {tournament.start_date && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Calendar size={11} style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {new Date(tournament.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Registration progress bar (shown when user has a registration) ── */}
      {userRequest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl px-5 py-4 mb-5"
          style={{ background: "rgba(10,12,26,0.96)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
              REGISTRATION STATUS
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                color: isApproved ? "#10b981" : isEliminated ? "#f43f5e" : userRequest.status === "rejected" ? "#f43f5e" : "#f97316",
                background: isApproved ? "rgba(16,185,129,0.1)" : isEliminated ? "rgba(244,63,94,0.08)" : userRequest.status === "rejected" ? "rgba(244,63,94,0.08)" : "rgba(249,115,22,0.08)",
                border: `1px solid ${isApproved ? "rgba(16,185,129,0.25)" : isEliminated ? "rgba(244,63,94,0.2)" : "rgba(249,115,22,0.2)"}`,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {isApproved ? "Approved" : isEliminated ? "Eliminated" : userRequest.status === "rejected" ? "Declined" : "Pending"}
            </span>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-0">
            {PROGRESS_STEPS.map((step, i) => {
              const done    = regStep !== null && regStep > i;
              const current = regStep === i;
              const future  = regStep === null || regStep < i;
              const failed  = isEliminated || userRequest.status === "rejected";

              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: done ? "#10b981" : (current && !failed) ? "#7C3AED" : failed && i === 0 ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.06)",
                        border: (current && !failed) ? "2px solid #A78BFA" : done ? "none" : `1px solid ${failed && i === 0 ? "rgba(244,63,94,0.3)" : "rgba(255,255,255,0.1)"}`,
                        boxShadow: (current && !failed) ? "0 0 10px rgba(124,58,237,0.4)" : "none",
                      }}
                    >
                      {done ? <Check size={10} className="text-white" /> : (
                        <span className="text-[9px] font-bold" style={{ color: (current && !failed) ? "#E9D5FF" : "rgba(255,255,255,0.2)" }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-semibold whitespace-nowrap"
                      style={{ color: done ? "#10b981" : (current && !failed) ? "#A78BFA" : "rgba(255,255,255,0.2)" }}>
                      {step.label}
                    </span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className="flex-1 h-[2px] mx-1 mb-3.5 rounded-full"
                      style={{ background: done ? "#10b981" : "rgba(255,255,255,0.06)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Tournament Timeline ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-0 overflow-x-auto scrollbar-hide"
        style={{ background: "rgba(10,12,26,0.96)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {TIMELINE_STAGES.map((stage, i) => {
          const done    = currentStage > i;
          const current = currentStage === i;

          return (
            <div key={stage.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{
                    background: done ? "#10b981" : current ? "#7C3AED" : "rgba(255,255,255,0.06)",
                    border: current ? "2px solid #A78BFA" : done ? "none" : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: current ? "0 0 16px rgba(124,58,237,0.5)" : "none",
                  }}
                >
                  {done ? <Check size={12} className="text-white" /> : (
                    <span className="text-[10px] font-bold" style={{ color: current ? "#E9D5FF" : "rgba(255,255,255,0.2)" }}>
                      {i + 1}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-semibold whitespace-nowrap"
                  style={{ color: done ? "#10b981" : current ? "#A78BFA" : "rgba(255,255,255,0.2)" }}>
                  {stage.label}
                </span>
              </div>
              {i < TIMELINE_STAGES.length - 1 && (
                <div className="h-[2px] w-10 md:w-16 mx-1 flex-shrink-0 rounded-full mb-3.5"
                  style={{ background: done ? "#10b981" : "rgba(255,255,255,0.07)" }} />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* ── Main layout: tabs + sidebar ── */}
      <div className="flex flex-col md:flex-row gap-5">

        {/* Left: tabs */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div
            ref={tabBarRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide mb-4 rounded-xl p-1"
            style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-all duration-200"
                style={tab === key
                  ? { background: "rgba(124,58,237,0.18)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }
                  : { background: "transparent", color: "rgba(255,255,255,0.35)", border: "1px solid transparent" }
                }
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >

              {/* ── OVERVIEW ── */}
              {tab === "overview" && (
                <div className="space-y-4">
                  {/* Fill bar */}
                  <div className="rounded-2xl p-5" style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>SLOTS FILLED</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black tabular-nums" style={{ color: full ? "#f43f5e" : "#06B6D4" }}>{pct}%</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{tournament.current_players}/{tournament.max_players}</span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{
                          background: full
                            ? "linear-gradient(90deg,#f43f5e,#b91c1c)"
                            : pct > 75
                            ? "linear-gradient(90deg,#f59e0b,#f97316)"
                            : "linear-gradient(90deg,#7C3AED,#06B6D4)",
                          backgroundSize: "200% 100%",
                          animation: "flow 2s linear infinite",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {full ? (
                        <p className="text-xs" style={{ color: "#f43f5e" }}>⚠️ Tournament is full</p>
                      ) : pct > 75 ? (
                        <p className="text-xs" style={{ color: "#f59e0b" }}>🔥 Filling fast — {tournament.max_players - tournament.current_players} spots left</p>
                      ) : (
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{tournament.max_players - tournament.current_players} spots available</p>
                      )}
                    </div>
                  </div>

                  {/* 4-stat grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: <Users size={14} />, label: "PLAYERS",    value: `${tournament.current_players || 0}/${tournament.max_players || 0}`, color: "#60a5fa" },
                      { icon: <Zap size={14} />,   label: "ENTRY FEE",  value: free ? "FREE" : `${tournament.entry_fee} CP`,                        color: free ? "#06B6D4" : "#f43f5e" },
                      { icon: <Target size={14} />, label: "MODE",       value: tournament.mode || "Solo",                                            color: "#A78BFA" },
                      { icon: <Calendar size={14} />,label: "DATE",      value: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("en-GB") : "TBA", color: "#f97316" },
                    ].map(({ icon, label, value, color }) => (
                      <div key={label} className="relative overflow-hidden rounded-xl p-4 text-center"
                        style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(circle at 50% 100%, ${color}14, transparent 70%)` }} />
                        <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
                        <p className="text-sm font-black tabular-nums" style={{ color }}>{value}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mobile prize pills */}
                  <div className="md:hidden grid grid-cols-2 gap-3">
                    <div className="text-center p-4 rounded-xl" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>PRIZE POOL</p>
                      <p className="text-2xl font-black" style={{ color: "#f97316", fontFamily: "Orbitron,monospace" }}>
                        {(tournament.prize_coins || 0).toLocaleString()}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: "rgba(249,115,22,0.5)" }}>CP COINS</p>
                    </div>
                    <div className="text-center p-4 rounded-xl"
                      style={{ background: `rgba(${free ? "6,182,212" : "244,63,94"},0.07)`, border: `1px solid rgba(${free ? "6,182,212" : "244,63,94"},0.2)` }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>ENTRY FEE</p>
                      <p className="text-2xl font-black" style={{ color: free ? "#06B6D4" : "#f43f5e", fontFamily: "Orbitron,monospace" }}>
                        {free ? "FREE" : tournament.entry_fee}
                      </p>
                      {!free && <p className="text-[9px] mt-0.5" style={{ color: "rgba(244,63,94,0.5)" }}>CP</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRIZES ── */}
              {tab === "prizes" && (
                <div className="space-y-4">
                  <div className="rounded-2xl p-6" style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(249,115,22,0.15)" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>PRIZE DISTRIBUTION</p>
                    <div className="space-y-3">
                      {[
                        { place: "1st Place", icon: "🥇", color: "#f59e0b", share: 0.5  },
                        { place: "2nd Place", icon: "🥈", color: "#94a3b8", share: 0.3  },
                        { place: "3rd Place", icon: "🥉", color: "#f97316", share: 0.15 },
                        { place: "4th Place", icon: "🎖️", color: "#6366f1", share: 0.05 },
                      ].map(({ place, icon, color, share }) => {
                        const coins = Math.floor((tournament.prize_coins || 0) * share);
                        return (
                          <div key={place} className="flex items-center gap-4 p-4 rounded-xl"
                            style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                            <span className="text-xl flex-shrink-0">{icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold" style={{ color }}>{place}</p>
                              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{Math.round(share * 100)}% of prize pool</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black tabular-nums" style={{ color }}>{coins.toLocaleString()}</p>
                              <p className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.22)" }}>CP COINS</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 pt-4 border-t flex items-center justify-between"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>TOTAL PRIZE POOL</span>
                      <span className="text-2xl font-black" style={{ color: "#f97316", fontFamily: "Orbitron,monospace" }}>
                        {(tournament.prize_coins || 0).toLocaleString()} CP
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PLAYERS ── */}
              {tab === "players" && (
                <div className="rounded-2xl p-6" style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>REGISTERED PLAYERS</p>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(6,182,212,0.1)", color: "#06B6D4", border: "1px solid rgba(6,182,212,0.2)" }}>
                      {tournament.current_players || 0} / {tournament.max_players || 0}
                    </span>
                  </div>
                  {/* Fill visualization */}
                  <div className="grid grid-cols-8 gap-1.5 mb-4">
                    {Array.from({ length: tournament.max_players || 0 }, (_, i) => (
                      <div key={i}
                        className="aspect-square rounded-lg transition-all duration-200"
                        style={{
                          background: i < (tournament.current_players || 0)
                            ? "rgba(16,185,129,0.35)"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${i < (tournament.current_players || 0) ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Full roster visible to participants after tournament begins
                  </p>
                </div>
              )}

              {/* ── RULES ── */}
              {tab === "rules" && (
                <div className="rounded-2xl p-6" style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(6,182,212,0.12)" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <Shield size={14} style={{ color: "#06B6D4" }} />
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#06B6D4" }}>TOURNAMENT RULES</p>
                  </div>
                  <div className="space-y-4">
                    {RULES.map((rule, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                          style={{ background: "rgba(6,182,212,0.1)", color: "#06B6D4", border: "1px solid rgba(6,182,212,0.2)" }}>
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── INFO ── */}
              {tab === "info" && (
                <div className="rounded-2xl p-6" style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>TOURNAMENT INFORMATION</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { label: "Organizer",     value: "CipherPool Staff"  },
                      { label: "Format",        value: tournament.mode || "Solo" },
                      { label: "Platform",      value: "Free Fire Mobile"  },
                      { label: "Map",           value: tournament.map || "Bermuda" },
                      { label: "Game Type",     value: tournament.game_type || tournament.mode || "Battle Royale" },
                      { label: "Start Date",    value: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "TBA" },
                      { label: "Max Players",   value: tournament.max_players || "TBA" },
                      { label: "Entry Fee",     value: free ? "Free Entry" : `${tournament.entry_fee} CP` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>{label}</p>
                        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Right sidebar (desktop) / bottom (mobile) ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="md:w-72 flex-shrink-0 flex flex-col gap-4"
        >
          {/* Registration card */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "rgba(10,12,26,0.98)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: `linear-gradient(90deg,transparent,${s.color}60,transparent)` }} />
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(124,58,237,0.08),transparent 70%)" }} />

            <p className="text-[9px] font-black uppercase tracking-widest mb-4 relative z-10" style={{ color: "rgba(255,255,255,0.28)" }}>
              REGISTRATION
            </p>

            {/* Registration deadline countdown in sidebar */}
            {canRegister && tournament.start_date && !regDeadlineCountdown.past && (
              <div className="mb-4 relative z-10 text-center p-3 rounded-xl"
                style={{ background: regUrgent ? "rgba(244,63,94,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${regUrgent ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                <p className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: regUrgent ? "#f43f5e" : "rgba(255,255,255,0.25)" }}>
                  {regUrgent ? "⚠ REGISTRATION CLOSING" : "REG. OPEN UNTIL START"}
                </p>
                <CountdownDisplay
                  time={regDeadlineCountdown}
                  color={regUrgent ? "#f43f5e" : "#06B6D4"}
                  urgent={regUrgent}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 mb-4 relative z-10">
              <div className="text-center p-3 rounded-xl" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)" }}>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>PRIZE</p>
                <p className="text-base font-black" style={{ color: "#f97316", fontFamily: "Orbitron,monospace" }}>{(tournament.prize_coins || 0).toLocaleString()}</p>
                <p className="text-[8px]" style={{ color: "rgba(249,115,22,0.45)" }}>CP</p>
              </div>
              <div className="text-center p-3 rounded-xl"
                style={{ background: `rgba(${free ? "6,182,212" : "244,63,94"},0.07)`, border: `1px solid rgba(${free ? "6,182,212" : "244,63,94"},0.18)` }}>
                <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>ENTRY</p>
                <p className="text-base font-black" style={{ color: free ? "#06B6D4" : "#f43f5e", fontFamily: "Orbitron,monospace" }}>{free ? "FREE" : tournament.entry_fee}</p>
                {!free && <p className="text-[8px]" style={{ color: "rgba(244,63,94,0.45)" }}>CP</p>}
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mb-3 px-3 py-2.5 rounded-xl text-xs relative z-10"
                  style={{ background: "rgba(244,63,94,0.09)", border: "1px solid rgba(244,63,94,0.2)", color: "#fca5a5" }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10">
              <CtaButton />
            </div>

            {/* Edit profile reminder for pending registrations */}
            {userRequest?.status === "pending" && (
              <Link to="/profile" className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-semibold transition-colors relative z-10"
                style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.color = "#06B6D4"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.28)"}
              >
                <Edit3 size={10} /> Update your FF info
              </Link>
            )}

            {!profile && (
              <p className="text-center text-xs mt-3 relative z-10" style={{ color: "rgba(255,255,255,0.28)" }}>
                <Link to="/login" style={{ color: "#06B6D4", textDecoration: "none", fontWeight: 600 }}>Sign in</Link> to participate
              </p>
            )}
          </div>

          {/* Share */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(10,12,26,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.22)" }}>SHARE</p>
            <div className="flex gap-2">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(tournament.name)}`}
                target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{ background: "rgba(57,176,227,0.08)", border: "1px solid rgba(57,176,227,0.2)", color: "#39b0e3", textDecoration: "none" }}
              >
                ✈️ Telegram
              </a>
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06B6D4" }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Mobile sticky action bar ── */}
      <div
        className="md:hidden fixed left-0 right-0 z-40"
        style={{
          bottom: "calc(56px + env(safe-area-inset-bottom))",
          background: "rgba(5,8,22,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 16px",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-center flex-1">
              <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>PRIZE</p>
              <p className="text-base font-black leading-none" style={{ color: "#f97316", fontFamily: "Orbitron,monospace" }}>
                {(tournament.prize_coins || 0).toLocaleString()}<span className="text-[8px] opacity-50 ml-0.5">CP</span>
              </p>
            </div>
            <div className="w-px h-7 bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>ENTRY</p>
              <p className="text-base font-black leading-none" style={{ color: free ? "#06B6D4" : "#f43f5e", fontFamily: "Orbitron,monospace" }}>
                {free ? "FREE" : `${tournament.entry_fee}CP`}
              </p>
            </div>
          </div>
          <div className="flex-[1.5]">
            <CtaButton compact />
          </div>
        </div>
      </div>
    </div>
  );
}
