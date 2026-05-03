import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";

const T = {
  bg:     "#0b0b14",
  card:   "rgba(14,14,28,0.9)",
  card2:  "rgba(20,20,38,0.95)",
  border: "rgba(255,255,255,0.07)",
  teal:   "#00c49a",
  tealD:  "#009e7a",
  amber:  "#f0a030",
  blue:   "#60a5fa",
  rose:   "#f43f5e",
  text:   "#e8e8f4",
  text2:  "#9898b8",
  text3:  "#5c5c7a",
};

const STATUS = {
  active:    { label: "EN COURS",  color: "#00c49a", bg: "rgba(0,196,154,0.1)",   glow: "rgba(0,196,154,0.15)" },
  upcoming:  { label: "À VENIR",   color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  glow: "rgba(96,165,250,0.12)" },
  completed: { label: "TERMINÉ",   color: "#5c5c7a", bg: "rgba(92,92,122,0.08)",  glow: "transparent" },
};

const FILTERS = [
  { key: "all",       label: "TOUS" },
  { key: "active",    label: "EN COURS" },
  { key: "upcoming",  label: "À VENIR" },
  { key: "completed", label: "TERMINÉS" },
];

function TCard({ t, i, userBalance }) {
  const [hov, setHov] = useState(false);
  const s = STATUS[t.status] || STATUS.upcoming;
  const pct = t.max_players > 0 ? Math.round((t.current_players / t.max_players) * 100) : 0;
  const full = t.current_players >= t.max_players;
  const canJoin = !full && t.status !== "completed";
  const canAfford = (userBalance || 0) >= (t.entry_fee || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.35 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.card2 : T.card,
        border: `1px solid ${hov ? s.color + "35" : T.border}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.25s",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${s.color}20` : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${s.color},transparent)`, opacity: hov ? 1 : 0.5, transition: "opacity .25s" }} />

      <div style={{ padding: "20px 20px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <h3 style={{ color: T.text, fontWeight: 800, fontSize: 15, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.name}
            </h3>
            <p style={{ color: T.text3, fontSize: 11 }}>{t.mode || "Mode Compétitif"}</p>
          </div>
          <span style={{
            padding: "4px 10px", borderRadius: 6, background: s.bg, color: s.color,
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: 1, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block", animation: t.status === "active" ? "pulse 1.5s infinite" : "none" }} />
            {s.label}
          </span>
        </div>

        {/* Description */}
        {t.description && (
          <p style={{ color: T.text2, fontSize: 12, lineHeight: 1.55, marginBottom: 14, flex: 1 }}>
            {t.description.slice(0, 90)}{t.description.length > 90 ? "..." : ""}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { icon: "👥", val: `${t.current_players || 0}/${t.max_players || 0}`, label: "JOUEURS", color: T.blue },
            { icon: "💰", val: (t.prize_coins || 0).toLocaleString(), label: "PRIZE",   color: T.amber },
            { icon: "🎟️", val: (t.entry_fee || 0) === 0 ? "FREE" : String(t.entry_fee), label: "ENTRÉE",  color: (t.entry_fee || 0) === 0 ? T.teal : T.rose },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "9px 4px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 14, marginBottom: 3 }}>{s.icon}</div>
              <p style={{ color: s.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, margin: 0 }}>{s.val}</p>
              <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 1, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Player fill bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: T.text3, fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>Remplissage</span>
            <span style={{ color: full ? T.rose : T.teal, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: full ? `linear-gradient(90deg,${T.rose},#b91c1c)` : `linear-gradient(90deg,${T.teal},${T.tealD})`, borderRadius: 99, transition: "width 0.8s ease" }} />
          </div>
        </div>

        {/* CTA */}
        <Link to={`/tournaments/${t.id}`} style={{ textDecoration: "none" }}>
          <button disabled={!canJoin} style={{
            width: "100%", padding: "11px 0", borderRadius: 10, border: "none", cursor: canJoin ? "pointer" : "not-allowed", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 12, letterSpacing: 1, transition: "all .2s",
            background: !canJoin ? "rgba(255,255,255,0.04)" : canAfford
              ? `linear-gradient(135deg,${s.color},${s.color}cc)`
              : "rgba(240,160,48,0.1)",
            color: !canJoin ? T.text3 : canAfford ? "#fff" : T.amber,
            boxShadow: canJoin && canAfford ? `0 4px 16px ${s.glow}` : "none",
          }}>
            {full ? "COMPLET" : t.status === "completed" ? "VOIR RÉSULTATS" : !canAfford ? `💰 ${t.entry_fee} REQUIS` : t.status === "active" ? "REJOINDRE →" : "S'INSCRIRE →"}
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function Tournaments() {
  const { balance } = useOutletContext() || {};
  const [tournaments,   setTournaments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState("all");
  const [sortBy,        setSortBy]        = useState("newest");

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
      if (sortBy === "prize") return (b.prize_coins || 0) - (a.prize_coins || 0);
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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: T.text, padding: "24px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <p style={{ color: T.teal, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>🏆 COMPÉTITIONS</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "clamp(32px,5vw,52px)", letterSpacing: 3, margin: 0 }}>
              TOURNOIS <span style={{ color: T.teal }}>FREE FIRE</span>
            </h1>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { val: counts.active,   label: "Actifs",  color: T.teal },
                { val: counts.upcoming, label: "À venir", color: T.blue },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: s.color, lineHeight: 1, margin: 0 }}>{s.val}</p>
                  <p style={{ color: T.text3, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── FILTERS ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: .4 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un tournoi..."
              style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, background: T.card, border: `1px solid ${T.border}`, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Space Grotesk',sans-serif" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,196,154,0.4)"}
              onBlur={e => e.target.style.borderColor = T.border} />
          </div>

          {/* Status filters */}
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: "none",
                background: filter === f.key ? `linear-gradient(135deg,${T.teal},${T.tealD})` : T.card,
                color: filter === f.key ? "#fff" : T.text3,
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                boxShadow: filter === f.key ? "0 2px 14px rgba(0,196,154,0.25)" : "none",
                transition: "all .2s",
              }}>
              {f.label}
              {counts[f.key] > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[f.key]})</span>}
            </button>
          ))}

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, background: T.card, border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, outline: "none", cursor: "pointer" }}>
            <option value="newest">Plus récents</option>
            <option value="prize">Prize le plus élevé</option>
            <option value="players">Plus de joueurs</option>
          </select>
        </motion.div>

        {/* ── GRID ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid rgba(0,196,154,0.15)`, borderTopColor: T.teal }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: T.text3, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 3 }}>AUCUN TOURNOI TROUVÉ</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {filtered.map((t, i) => <TCard key={t.id} t={t} i={i} userBalance={balance} />)}
          </div>
        )}
      </div>
    </>
  );
}
