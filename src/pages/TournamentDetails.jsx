import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Trophy, Calendar, Zap, Shield, Info,
  CheckCircle, Clock, AlertCircle, Copy, Check, Share2,
  Star, ChevronRight, Timer, Target, Swords, Crown,
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

// ─── Tournament progression stages ────────────────────────────────────────────
const TIMELINE_STAGES = [
  { key: "registration_open", label: "Registration" },
  { key: "ready",             label: "Check-In"     },
  { key: "live",              label: "Live"         },
  { key: "results_pending",   label: "Results"      },
  { key: "completed",         label: "Finished"     },
];
const STAGE_ORDER = { registration_open: 0, full: 0, ready: 1, live: 2, results_pending: 3, completed: 4, archived: 4 };

// ─── Countdown hook ──────────────────────────────────────────────────────────
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

// ─── Copied button ─────────────────────────────────────────────────────────────
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

// ─── Tab nav ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview", label: "Overview",  icon: Target   },
  { key: "prizes",   label: "Prizes",    icon: Trophy   },
  { key: "players",  label: "Players",   icon: Users    },
  { key: "rules",    label: "Rules",     icon: Shield   },
  { key: "info",     label: "Info",      icon: Info     },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TournamentDetails() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [tournament, setTournament]  = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading,    setLoading]     = useState(true);
  const [requesting, setRequesting]  = useState(false);
  const [profile,    setProfile]     = useState(null);
  const [isApproved, setIsApproved]  = useState(false);
  const [error,      setError]       = useState("");
  const [tab,        setTab]         = useState("overview");
  const [copied,     setCopied]      = useState(false);
  const tabBarRef = useRef(null);

  const countdown = useCountdown(tournament?.start_date);

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

  const RULES = [
    "No cheating, hacks, or emulators are allowed.",
    "Be present 15 minutes before the match starts.",
    "Results are manually verified by staff within 24h.",
    "Fair play is mandatory — toxic behavior leads to disqualification.",
    ...(tournament.rules ? [tournament.rules] : []),
  ];

  // ── CTA button ──
  const CtaButton = ({ compact = false }) => {
    const h  = compact ? "42px" : "52px";
    const fs = compact ? 10 : 11;

    if (isApproved) return (
      <Link to={`/tournaments/${id}/room`}
        className="flex items-center justify-center gap-2 w-full font-bold rounded-xl transition-all duration-200"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#000", textDecoration: "none", background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 6px 24px rgba(16,185,129,0.4)" }}
      >
        <Zap size={15} /> {compact ? "ENTER ROOM" : "ENTER MATCH CENTER"}
      </Link>
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
        <Clock size={14} /> REGISTRATION CLOSED
      </div>
    );
    if (userRequest?.status === "pending") return (
      <div className="flex items-center justify-center gap-2 w-full rounded-xl"
        style={{ height: h, fontSize: fs, letterSpacing: "0.1em", color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.22)" }}>
        <Clock size={14} /> PENDING APPROVAL
      </div>
    );
    return (
      <button onClick={requestToJoin} disabled={requesting || !canRegister} className="w-full rounded-xl font-bold transition-all duration-200"
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
        @keyframes live-pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

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
            {/* Countdown */}
            {tournament.start_date && !countdown.past && (
              <div className="flex items-center gap-3">
                <Timer size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                <div className="flex items-center gap-1.5">
                  {[
                    { v: countdown.d, l: "D" },
                    { v: countdown.h, l: "H" },
                    { v: countdown.m, l: "M" },
                    { v: countdown.s, l: "S" },
                  ].map(({ v, l }) => (
                    <div key={l} className="flex items-baseline gap-0.5">
                      <span className="text-lg font-black tabular-nums" style={{ color: "#06B6D4", fontFamily: "monospace" }}>
                        {String(v).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</span>
                      {l !== "S" && <span className="text-sm font-bold mx-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>:</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1" />

            {/* Quick stat chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Users size={11} style={{ color: "rgba(255,255,255,0.4)" }} />
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.75)" }}>
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

      {/* ── Tournament Timeline ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-0 overflow-x-auto scrollbar-hide"
        style={{ background: "rgba(10,12,26,0.96)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {TIMELINE_STAGES.map((stage, i) => {
          const stageOrder = i;
          const done    = currentStage > stageOrder;
          const current = currentStage === stageOrder;
          const future  = currentStage < stageOrder;

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
                <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: done ? "#10b981" : current ? "#A78BFA" : "rgba(255,255,255,0.2)" }}>
                  {stage.label}
                </span>
              </div>
              {i < TIMELINE_STAGES.length - 1 && (
                <div
                  className="h-[2px] w-10 md:w-16 mx-1 flex-shrink-0 rounded-full mb-3.5"
                  style={{ background: done ? "#10b981" : "rgba(255,255,255,0.07)" }}
                />
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
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>PLAYERS</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black tabular-nums" style={{ color: full ? "#f43f5e" : "#06B6D4" }}>{pct}%</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{tournament.current_players}/{tournament.max_players}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{
                          background: full
                            ? "linear-gradient(90deg,#f43f5e,#b91c1c)"
                            : "linear-gradient(90deg,#7C3AED,#06B6D4)",
                          backgroundSize: "200% 100%",
                          animation: "flow 2s linear infinite",
                        }}
                      />
                    </div>
                    {full && (
                      <p className="mt-2 text-xs" style={{ color: "#f43f5e" }}>⚠️ This tournament is full</p>
                    )}
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
                  <div className="py-10 flex flex-col items-center gap-3 opacity-40">
                    <Users size={32} style={{ color: "rgba(255,255,255,0.2)" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Player roster loads when tournament begins</p>
                  </div>
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
                      { label: "Map",           value: "Bermuda"           },
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
