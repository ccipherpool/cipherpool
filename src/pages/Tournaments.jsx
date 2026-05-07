import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";

const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";
const BG     = "#020617";

const STATUS = {
  active:    { label: "EN COURS",  color: CYAN,   bg: "rgba(0,212,255,0.1)",   glow: "rgba(0,212,255,0.25)"   },
  upcoming:  { label: "À VENIR",   color: ORANGE, bg: "rgba(249,115,22,0.1)",  glow: "rgba(249,115,22,0.2)"  },
  completed: { label: "TERMINÉ",   color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.04)", glow: "transparent" },
};

const FILTERS = [
  { key: "all",       label: "TOUS" },
  { key: "active",    label: "EN COURS" },
  { key: "upcoming",  label: "À VENIR" },
  { key: "completed", label: "TERMINÉS" },
];

function TCard({ t, i, userBalance }) {
  const [hovered, setHovered] = useState(false);
  const s    = STATUS[t.status] || STATUS.upcoming;
  const pct  = t.max_players > 0 ? Math.round((t.current_players / t.max_players) * 100) : 0;
  const full = t.current_players >= t.max_players;
  const canJoin   = !full && t.status !== "completed";
  const canAfford = (userBalance || 0) >= (t.entry_fee || 0);
  const free = (t.entry_fee || 0) === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", overflow: "hidden", borderRadius: 16, display: "flex",
        flexDirection: "column", cursor: "default",
        background: hovered ? `linear-gradient(145deg,${s.color}08,#050c1f)` : "#050c1f",
        border: `1px solid ${hovered ? s.color + "35" : "rgba(255,255,255,0.07)"}`,
        boxShadow: hovered ? `0 8px 40px ${s.glow},0 0 0 1px ${s.color}12` : "0 2px 12px rgba(0,0,0,0.4)",
        transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
        transform: hovered ? "translateY(-4px)" : "none",
      }}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg,${s.color},${s.color}60,transparent)` }} />

      {/* Background glow blob */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle,${s.glow},transparent 70%)`, pointerEvents: "none", opacity: hovered ? 1 : 0.4, transition: "opacity 0.3s" }} />

      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 1, marginBottom: 5, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.name}
            </h3>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              {t.mode || "Mode Compétitif"}
            </p>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: "5px 10px", borderRadius: 20, flexShrink: 0, display: "flex", alignItems: "center", gap: 5, color: s.color, background: s.bg, border: `1px solid ${s.color}25` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}`, display: "inline-block" }} />
            {s.label}
          </span>
        </div>

        {/* Description */}
        {t.description && (
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {t.description}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { emoji: "👥", val: `${t.current_players||0}/${t.max_players||0}`, label: "JOUEURS", color: "#60a5fa" },
            { emoji: "💰", val: (t.prize_coins||0).toLocaleString(), label: "PRIZE", color: ORANGE },
            { emoji: "🎟️", val: free ? "FREE" : String(t.entry_fee), label: "ENTRÉE", color: free ? CYAN : RED },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{stat.emoji}</div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: stat.color, marginBottom: 2 }}>{stat.val}</p>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Fill bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>REMPLISSAGE</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: full ? RED : s.color }}>{pct}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 + 0.3 }}
              style={{ height: "100%", borderRadius: 99, background: full ? `linear-gradient(90deg,${RED},#b91c1c)` : `linear-gradient(90deg,${s.color},${s.color}88)`, boxShadow: `0 0 8px ${s.color}50` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link to={`/tournaments/${t.id}`} style={{ marginTop: "auto", textDecoration: "none" }}>
          <motion.button
            whileHover={{ scale: canJoin ? 1.02 : 1 }}
            whileTap={{ scale: canJoin ? 0.97 : 1 }}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: 2, cursor: canJoin ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              background: !canJoin
                ? "rgba(255,255,255,0.04)"
                : canAfford
                  ? `linear-gradient(135deg,${s.color},${s.color}bb)`
                  : "rgba(249,115,22,0.12)",
              color: !canJoin ? "rgba(255,255,255,0.2)" : canAfford ? "#000" : ORANGE,
              boxShadow: canJoin && canAfford ? `0 4px 20px ${s.color}30` : "none",
            }}
          >
            {full ? "COMPLET" : t.status === "completed" ? "VOIR RÉSULTATS" : !canAfford ? `💰 ${t.entry_fee} REQUIS` : t.status === "active" ? "REJOINDRE →" : "S'INSCRIRE →"}
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function Tournaments() {
  const { balance } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [sortBy, setSortBy]           = useState("newest");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
      setTournaments(data || []);
    } catch (_) {}
    setLoading(false);
  };

  const filtered = tournaments
    .filter(t => filter === "all" || t.status === filter)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "prize")   return (b.prize_coins || 0) - (a.prize_coins || 0);
      if (sortBy === "players") return (b.current_players || 0) - (a.current_players || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const counts = {
    all:       tournaments.length,
    active:    tournaments.filter(t => t.status === "active").length,
    upcoming:  tournaments.filter(t => t.status === "upcoming").length,
    completed: tournaments.filter(t => t.status === "completed").length,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        .trn-hero-grid { display:grid; grid-template-columns:1fr auto; align-items:end; gap:24px; }
        .trn-stats-bar { display:flex; gap:32px; }
        .trn-filters { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .trn-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        @media(max-width:1024px) { .trn-grid{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:640px) {
          .trn-hero-grid{grid-template-columns:1fr}
          .trn-stats-bar{gap:16px}
          .trn-grid{grid-template-columns:1fr}
          .trn-filters{gap:8px}
        }
      `}</style>

      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: "rgba(255,255,255,0.88)" }}>

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", overflow: "hidden", padding: "36px 0 32px", marginBottom: 28 }}
        >
          {/* Glow blobs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: -60, left: -40, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle,rgba(0,212,255,0.08),transparent 70%)` }} />
            <div style={{ position: "absolute", top: -40, right: -60, width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle,rgba(139,92,246,0.07),transparent 70%)` }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
          </div>

          {/* 2px top line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${CYAN},${VIOLET},transparent)` }} />

          <div className="trn-hero-grid" style={{ position: "relative" }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 4, color: CYAN, marginBottom: 10, fontWeight: 600 }}>
                🏆 COMPÉTITIONS FREE FIRE
              </p>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: 2, lineHeight: 1.1, margin: 0 }}>
                <span style={{ color: "#fff" }}>TOURNOIS</span>{" "}
                <span style={{ background: `linear-gradient(135deg,${CYAN},${VIOLET})`, backgroundSize: "200% 200%", animation: "flow 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  CIPHER
                </span>
              </h1>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 10 }}>
                Rejoins la compétition, prouve ta valeur, empoche les prix
              </p>
            </div>

            <div className="trn-stats-bar">
              {[
                { val: counts.active,   label: "Actifs",  color: CYAN,   pulse: true },
                { val: counts.upcoming, label: "À venir", color: ORANGE },
                { val: counts.all,      label: "Total",   color: "rgba(255,255,255,0.4)" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                    {s.pulse && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, animation: "pulse-dot 2s ease infinite", display: "inline-block" }} />}
                    <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1, margin: 0, textShadow: s.pulse ? `0 0 20px ${s.color}60` : "none" }}>{s.val}</p>
                  </div>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 2 }}>{s.label.toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── FILTER BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="trn-filters">
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.3 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Rechercher un tournoi..."
                style={{
                  width: "100%", padding: "10px 14px 10px 38px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${searchFocused ? CYAN + "50" : "rgba(255,255,255,0.08)"}`,
                  boxShadow: searchFocused ? `0 0 0 3px ${CYAN}12` : "none",
                  color: "#fff", fontFamily: "'Space Grotesk',sans-serif", fontSize: 13,
                  outline: "none", transition: "all 0.2s", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Status pills */}
            {FILTERS.map(f => (
              <motion.button
                key={f.key}
                onClick={() => setFilter(f.key)}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: "9px 14px", borderRadius: 10, cursor: "pointer", border: "none",
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
                  letterSpacing: 1.5, transition: "all 0.2s", whiteSpace: "nowrap",
                  background: filter === f.key ? `linear-gradient(135deg,${CYAN},${VIOLET})` : "rgba(255,255,255,0.04)",
                  color: filter === f.key ? "#000" : "rgba(255,255,255,0.35)",
                  boxShadow: filter === f.key ? `0 4px 16px ${CYAN}30` : "none",
                }}
              >
                {f.label}
                {counts[f.key] > 0 && (
                  <span style={{ marginLeft: 6, opacity: filter === f.key ? 0.6 : 0.4, fontFamily: "'JetBrains Mono',monospace" }}>
                    ({counts[f.key]})
                  </span>
                )}
              </motion.button>
            ))}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: "9px 12px", borderRadius: 10, cursor: "pointer", outline: "none",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10, letterSpacing: 1,
              }}
            >
              <option value="newest">RÉCENTS</option>
              <option value="prize">PRIZE ↓</option>
              <option value="players">JOUEURS ↓</option>
            </select>
          </div>
        </motion.div>

        {/* ── CONTENT ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="trn-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 320, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", animation: `pulse-dot ${1.2 + i * 0.1}s ease infinite` }} />
                ))}
              </div>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: "80px 0", textAlign: "center", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
              </motion.div>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 3, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
                AUCUN TOURNOI TROUVÉ
              </p>
              {search && (
                <button onClick={() => setSearch("")} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, background: `rgba(0,212,255,0.08)`, border: `1px solid ${CYAN}25`, color: CYAN, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 1.5, cursor: "pointer" }}>
                  EFFACER RECHERCHE
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Result count */}
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 14 }}>
                {filtered.length} TOURNOI{filtered.length > 1 ? "S" : ""} TROUVÉ{filtered.length > 1 ? "S" : ""}
              </p>
              <div className="trn-grid">
                {filtered.map((t, i) => (
                  <TCard key={t.id} t={t} i={i} userBalance={balance} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
