import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  Trophy, Zap, Target, TrendingUp, Gift, Star,
  ShoppingBag, BarChart3, Shield, ArrowRight, Flame,
  Crown, Sword,
} from "lucide-react";
import { BauhausCard } from "../components/ui/BauhausCard";
import { RatingInteraction } from "../components/ui/RatingInteraction";

function StatCard({ icon: Icon, label, value, color, accentColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl p-5 group hover:-translate-y-1 transition-all duration-300"
      style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at top right, ${accentColor}08, transparent 60%)` }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,${accentColor}00,${accentColor}40,${accentColor}00)` }} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}20` }}>
          <Icon size={16} style={{ color: accentColor }} />
        </div>
      </div>
      <p className="text-3xl font-black tracking-tighter" style={{ color }}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
    </motion.div>
  );
}

function TournamentRow({ t, i }) {
  const status = {
    active:    { label: "EN COURS", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
    upcoming:  { label: "À VENIR",  color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    completed: { label: "TERMINÉ",  color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.05)" },
  }[t.status] || { label: "À VENIR", color: "#f97316", bg: "rgba(249,115,22,0.1)" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
    >
      <Link
        to={`/tournaments/${t.id}`}
        className="flex items-center gap-4 p-4 rounded-xl group transition-all duration-200"
        style={{ border: "1px solid rgba(255,255,255,0.04)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}>
          🏆
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{t.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] font-mono text-orange-400">{(t.prize_coins || 0).toLocaleString()} CP</span>
            <span className="text-[11px] text-white/30">{t.current_players || 0}/{t.max_players || 0} joueurs</span>
          </div>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0" style={{ color: status.color, background: status.bg }}>
          {status.label}
        </span>
      </Link>
    </motion.div>
  );
}

const QUICK_ACCESS = [
  { icon: Trophy,    label: "Tournois",      sub: "Participe",     to: "/tournaments",   accent: "#06b6d4" },
  { icon: Shield,    label: "Clans",         sub: "Rejoins",       to: "/clans",         accent: "#a78bfa" },
  { icon: ShoppingBag, label: "Boutique",    sub: "Dépense",       to: "/store",         accent: "#f97316" },
  { icon: BarChart3, label: "Classement",    sub: "Ton rang",      to: "/leaderboard",   accent: "#34d399" },
  { icon: Gift,      label: "Daily Bonus",   sub: "Tes bonus",     to: "/daily-rewards", accent: "#f43f5e" },
  { icon: Star,      label: "Succès",        sub: "Tes badges",    to: "/achievements",  accent: "#fbbf24" },
];

export default function Dashboard() {
  const { profile, balance } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, [profile?.id]);

  const fetchAll = async () => {
    try {
      const [{ data: tourney }, { data: top }, { data: stats }] = await Promise.all([
        supabase.from("tournaments").select("id,name,status,prize_coins,max_players,current_players")
          .in("status", ["active", "upcoming"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("player_stats").select("user_id,total_points,wins,tournaments_played")
          .order("total_points", { ascending: false }).limit(5),
        profile?.id
          ? supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle()
          : { data: null },
      ]);
      setTournaments(tourney || []);
      setPlayerStats(stats);
      if (top?.length) {
        const ids = top.map(t => t.user_id);
        const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids);
        const pMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
        setTopPlayers(top.map((s, i) => ({ ...s, rank: i + 1, name: pMap[s.user_id]?.full_name || "Joueur", avatar: pMap[s.user_id]?.avatar_url })));
      }
    } catch (_) {}
    setLoading(false);
  };

  const level   = profile?.level || 1;
  const xp      = profile?.xp || 0;
  const xpPct   = Math.min(100, (xp % 1000) / 10);
  const xpNext  = Math.ceil(xp / 1000) * 1000;
  const wins    = playerStats?.wins || 0;
  const matches = playerStats?.tournaments_played || 0;
  const pts     = playerStats?.total_points || 0;
  const wr      = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Joueur";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)" }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,#06b6d4,transparent)" }} />

        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2 font-mono">⚡ SAISON 1 ACTIVE</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">
              BON RETOUR,{" "}
              <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {firstName.toUpperCase()}
              </span>
            </h1>
            <p className="text-sm text-white/40 mb-5 font-medium">
              {matches > 0 ? `${matches} match${matches > 1 ? "s" : ""} joué${matches > 1 ? "s" : ""} — Continue à grinder.` : "Lance-toi dans ton premier tournoi !"}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/tournaments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)" }}
              >
                <Sword size={16} /> Jouer maintenant
              </Link>
              <Link
                to="/daily-rewards"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-white/5 active:scale-95"
                style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}
              >
                <Gift size={16} /> Daily Bonus
              </Link>
            </div>
          </div>

          {/* XP Card */}
          <div className="min-w-[200px] rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">NIVEAU</span>
              <span className="text-xl font-black" style={{ color: "#a78bfa" }}>{level}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1.2, ease: [.22, 1, .36, 1], delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#a78bfa,#06b6d4)" }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/25 font-mono mb-4">
              <span>{xp.toLocaleString()} XP</span>
              <span>{xpNext.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {[
                { val: wins,            color: "#f97316", label: "WINS" },
                { val: `${wr}%`,        color: "#06b6d4", label: "WR" },
                { val: pts.toLocaleString(), color: "#a78bfa", label: "PTS" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-base font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[9px] text-white/25 font-mono tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard delay={0.05} icon={Trophy}     label="Pièces"    value={balance || 0}                 color="#f97316"  accentColor="#f97316" />
        <StatCard delay={0.1}  icon={Zap}        label="XP Total"  value={xp}                           color="#a78bfa"  accentColor="#a78bfa" />
        <StatCard delay={0.15} icon={Flame}      label="Victoires" value={wins}                         color="#06b6d4"  accentColor="#06b6d4" />
        <StatCard delay={0.2}  icon={TrendingUp} label="Win Rate"  value={`${wr}%`}                     color="#34d399"  accentColor="#34d399" />
      </div>

      {/* ── QUICK ACCESS ── */}
      <div>
        <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
          <Zap size={12} className="text-cyan-500" /> Accès Rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACCESS.map((q, i) => (
            <motion.div
              key={q.to}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link
                to={q.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl group transition-all duration-200 hover:-translate-y-1"
                style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.05)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = q.accent + "25"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${q.accent}12`, border: `1px solid ${q.accent}20` }}>
                  <q.icon size={18} style={{ color: q.accent }} />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold text-white">{q.label}</p>
                  <p className="text-[10px] text-white/30">{q.sub}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── FEATURED ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BauhausCard
          accentColor="#06b6d4"
          topInscription="CIPHERPOOL ESPORTS"
          mainText="Rejoins l'Élite"
          subMainText="Participe aux tournois et grimpe le classement"
          progressBarInscription="Saison 1"
          progress={65}
          progressValue="65%"
          filledButtonInscription="TOURNOIS"
          outlinedButtonInscription="PROFIL"
          onFilledButtonClick={() => window.location.href = "/tournaments"}
          onOutlinedButtonClick={() => window.location.href = "/profile"}
        />
        <div className="rounded-2xl p-6 flex flex-col items-center justify-center gap-4" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] font-mono">⭐ TON EXPÉRIENCE</p>
          <p className="text-sm text-white/50 text-center">Comment tu trouves CipherPool aujourd'hui ?</p>
          <RatingInteraction />
        </div>
      </div>

      {/* ── TOURNAMENTS + TOP PLAYERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 md:gap-6">

        {/* Tournaments */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Trophy size={14} className="text-cyan-500" />
              <span>Tournois Actifs</span>
            </h3>
            <Link to="/tournaments" className="text-[11px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 transition-colors">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {tournaments.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Aucun tournoi actif</p>
              </div>
            ) : (
              tournaments.map((t, i) => <TournamentRow key={t.id} t={t} i={i} />)
            )}
          </div>
        </div>

        {/* Top Players */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Crown size={14} className="text-orange-400" />
              <span>Top Joueurs</span>
            </h3>
            <Link to="/leaderboard" className="text-[11px] font-bold text-cyan-500 hover:text-cyan-400 transition-colors">Tout →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {topPlayers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Aucun joueur</p>
              </div>
            ) : (
              topPlayers.map((p, i) => (
                <motion.div
                  key={p.user_id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.07 * i }}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: i < 3 ? ["rgba(249,115,22,0.15)", "rgba(200,200,220,0.08)", "rgba(180,140,60,0.08)"][i] : "rgba(255,255,255,0.04)" }}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : <span className="text-[11px] font-mono text-white/30">{p.rank}</span>}
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
                    {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : p.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-white/30 font-mono">{(p.total_points || 0).toLocaleString()} pts</p>
                  </div>
                  <span className="text-[11px] font-bold text-cyan-500 font-mono">{p.wins}W</span>
                </motion.div>
              ))
            )}
          </div>
          <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <Link to="/leaderboard" className="block text-center text-[11px] font-bold text-cyan-500 hover:text-cyan-400 py-2 transition-colors">
              Classement Complet →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
