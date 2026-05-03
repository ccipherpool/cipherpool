import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { Trophy, Users, Zap, Search } from "lucide-react";

const STATUS = {
  active:    { label: "EN COURS",  color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  upcoming:  { label: "À VENIR",   color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  completed: { label: "TERMINÉ",   color: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.04)" },
};

const FILTERS = [
  { key: "all",       label: "TOUS" },
  { key: "active",    label: "EN COURS" },
  { key: "upcoming",  label: "À VENIR" },
  { key: "completed", label: "TERMINÉS" },
];

function TCard({ t, i, userBalance }) {
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
      className="group relative overflow-hidden rounded-2xl flex flex-col transition-all duration-300 hover:-translate-y-1"
      style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + "30"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      {/* Top accent */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${s.color},transparent)` }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm truncate mb-1">{t.name}</h3>
            <p className="text-[11px] text-white/30">{t.mode || "Mode Compétitif"}</p>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 font-mono" style={{ color: s.color, background: s.bg }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
            {s.label}
          </span>
        </div>

        {/* Description */}
        {t.description && (
          <p className="text-xs text-white/35 leading-relaxed mb-4 line-clamp-2">{t.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: "👥", val: `${t.current_players || 0}/${t.max_players || 0}`, label: "JOUEURS", color: "#60a5fa" },
            { icon: "💰", val: (t.prize_coins || 0).toLocaleString(), label: "PRIZE", color: "#f97316" },
            { icon: "🎟️", val: (t.entry_fee || 0) === 0 ? "FREE" : String(t.entry_fee), label: "ENTRÉE", color: (t.entry_fee || 0) === 0 ? "#06b6d4" : "#f43f5e" },
          ].map(stat => (
            <div key={stat.label} className="text-center py-2.5 px-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-sm mb-1">{stat.icon}</div>
              <p className="text-xs font-bold font-mono" style={{ color: stat.color }}>{stat.val}</p>
              <p className="text-[8px] text-white/25 font-mono tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Fill bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-white/25 font-mono">Remplissage</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: full ? "#f43f5e" : "#06b6d4" }}>{pct}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: full ? "linear-gradient(90deg,#f43f5e,#b91c1c)" : "linear-gradient(90deg,#06b6d4,#0891b2)" }} />
          </div>
        </div>

        {/* CTA */}
        <Link to={`/tournaments/${t.id}`} className="mt-auto">
          <button
            disabled={!canJoin}
            className="w-full py-3 rounded-xl font-bold text-xs font-mono tracking-widest transition-all"
            style={{
              background: !canJoin ? "rgba(255,255,255,0.04)"
                : canAfford ? `linear-gradient(135deg,${s.color},${s.color}bb)`
                : "rgba(249,115,22,0.1)",
              color: !canJoin ? "rgba(255,255,255,0.2)" : canAfford ? "#000" : "#f97316",
              cursor: canJoin ? "pointer" : "not-allowed",
              boxShadow: canJoin && canAfford ? `0 4px 16px ${s.color}30` : "none",
            }}
          >
            {full ? "COMPLET" : t.status === "completed" ? "VOIR RÉSULTATS" : !canAfford ? `💰 ${t.entry_fee} REQUIS` : t.status === "active" ? "REJOINDRE →" : "S'INSCRIRE →"}
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function Tournaments() {
  const { balance } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2 font-mono">🏆 COMPÉTITIONS</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Tournois <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Free Fire</span>
          </h1>
          <div className="flex gap-4">
            {[{ val: counts.active, label: "Actifs", color: "#06b6d4" }, { val: counts.upcoming, label: "À venir", color: "#f97316" }].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] text-white/25 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un tournoi..."
            className="w-full py-2.5 pl-10 pr-4 rounded-xl text-white text-sm placeholder-white/25 outline-none transition-all"
            style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.08)" }}
            onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />
        </div>
        {/* Status filters */}
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3.5 py-2.5 rounded-xl text-[10px] font-black font-mono tracking-widest transition-all"
            style={{
              background: filter === f.key ? "linear-gradient(135deg,#06b6d4,#0891b2)" : "#0c0c1a",
              color: filter === f.key ? "#000" : "rgba(255,255,255,0.35)",
              border: `1px solid ${filter === f.key ? "transparent" : "rgba(255,255,255,0.08)"}`,
            }}>
            {f.label} {counts[f.key] > 0 && <span className="opacity-60">({counts[f.key]})</span>}
          </button>
        ))}
        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl text-sm outline-none cursor-pointer transition-all"
          style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          <option value="newest">Plus récents</option>
          <option value="prize">Prize élevé</option>
          <option value="players">Plus de joueurs</option>
        </select>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Aucun tournoi trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, i) => <TCard key={t.id} t={t} i={i} userBalance={balance} />)}
        </div>
      )}
    </div>
  );
}
