<<<<<<< HEAD
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const T = {
  bg:      "#0b0b14",
  card:    "rgba(14,14,28,0.85)",
  card2:   "rgba(20,20,36,0.9)",
  border:  "rgba(255,255,255,0.07)",
  bHov:    "rgba(0,196,154,0.22)",
  teal:    "#00c49a",
  tealD:   "#009e7a",
  amber:   "#f0a030",
  indigo:  "#818cf8",
  rose:    "#f43f5e",
  text:    "#e8e8f4",
  text2:   "#9898b8",
  text3:   "#5c5c7a",
=======
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Wallet, Zap, Target, ArrowRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const stats = [
    { label: 'Coins', value: profile?.coins || 0, icon: Wallet, color: 'text-blue-600' },
    { label: 'XP', value: profile?.xp || 0, icon: Zap, color: 'text-orange-500' },
    { label: 'Rang', value: '#12', icon: Trophy, color: 'text-yellow-500' },
    { label: 'Wins', value: '24', icon: Target, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
            <Star size={12} fill="currentColor" /> Saison 1 Active
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Salut, {profile?.full_name?.split(' ')[0] || 'Guerrier'} !
          </h1>
          <p className="text-slate-500 font-medium mb-6">Tes statistiques sont prêtes. Prêt pour le combat ?</p>
          <Link to="/tournaments" className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
            VOIR LES TOURNOIS <ArrowRight size={18} />
          </Link>
        </div>
        
        {/* Progress Circle/Card */}
        <div className="w-full md:w-64 bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Niveau {profile?.level || 1}</span>
            <span className="text-xs font-bold text-slate-600">650 / 1000 XP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity (Simplified) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-black text-sm uppercase tracking-widest text-slate-900">Derniers Matchs</h2>
          <Link to="/history" className="text-[10px] font-bold text-blue-600 uppercase">Voir tout</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Trophy size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Casablanca Cup #{102 + i}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Terminé • +500 CP</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase">Won</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
>>>>>>> 3fcff3464aa0768235c4df18a6a55ccab21257ae
};

const STATUS_CFG = {
  active:    { label: "EN COURS",   color: T.teal,   bg: "rgba(0,196,154,0.1)",   dot: T.teal },
  upcoming:  { label: "À VENIR",    color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  dot: "#60a5fa" },
  completed: { label: "TERMINÉ",    color: T.text3,   bg: "rgba(92,92,122,0.08)",  dot: T.text3 },
};

function StatCard({ icon, label, value, color, sub, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)`, opacity: 0.7 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: T.text3, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{label}</p>
          <p style={{ color, fontFamily: "'Bebas Neue',cursive", fontSize: 34, lineHeight: 1, letterSpacing: 1 }}>{value}</p>
          {sub && <p style={{ color: T.text3, fontSize: 10, marginTop: 4 }}>{sub}</p>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function TournamentRow({ t, i }) {
  const s = STATUS_CFG[t.status] || STATUS_CFG.upcoming;
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
      <Link to={`/tournaments/${t.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, transition: "all .2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.bHov; e.currentTarget.style.background = T.card2; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `rgba(0,196,154,0.1)`, border: `1px solid rgba(0,196,154,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          🏆
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: T.amber, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>💰 {(t.prize_coins || 0).toLocaleString()}</span>
            <span style={{ color: T.text3, fontSize: 11 }}>{t.current_players || 0}/{t.max_players || 0} joueurs</span>
          </div>
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 6, background: s.bg, color: s.color, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: s.dot, marginRight: 5, verticalAlign: "middle" }} />
          {s.label}
        </span>
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { profile, balance } = useOutletContext() || {};

  const [tournaments,   setTournaments]   = useState([]);
  const [topPlayers,    setTopPlayers]    = useState([]);
  const [playerStats,   setPlayerStats]   = useState(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    fetchAll();
  }, [profile?.id]);

  const fetchAll = async () => {
    try {
      const [{ data: tourney }, { data: top }, { data: stats }] = await Promise.all([
        supabase.from("tournaments").select("id,name,status,prize_coins,entry_fee,max_players,current_players").in("status", ["active","upcoming"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("player_stats").select("user_id,total_points,wins,tournaments_played").order("total_points", { ascending: false }).limit(5),
        profile?.id ? supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle() : { data: null },
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

  const QUICK = [
    { icon: "🏆", label: "TOURNOIS",       sub: "Participe & gagne",   to: "/tournaments", color: T.teal },
    { icon: "⚔️", label: "CLANS",          sub: "Rejoins une équipe",  to: "/clans",       color: "#a78bfa" },
    { icon: "🛍️", label: "BOUTIQUE",       sub: "Dépense tes pièces",  to: "/store",       color: T.amber },
    { icon: "📊", label: "CLASSEMENT",     sub: "Vois ton rang",        to: "/leaderboard", color: "#60a5fa" },
    { icon: "🎁", label: "DAILY REWARDS",  sub: "Récupère tes bonus",   to: "/daily-rewards", color: "#f43f5e" },
    { icon: "🏅", label: "ACHIEVEMENTS",   sub: "Tes succès",           to: "/achievements",  color: "#fbbf24" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid rgba(0,196,154,0.15)`, borderTopColor: T.teal }} />
    </div>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: T.text, padding: "24px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── HERO ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ borderRadius: 18, background: T.card, border: `1px solid ${T.border}`, marginBottom: 24, overflow: "hidden", position: "relative" }}>
          {/* BG gradient */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,196,154,0.05) 0%, transparent 60%, rgba(240,160,48,0.04) 100%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 300, height: "100%", background: "radial-gradient(ellipse at right, rgba(0,196,154,0.07), transparent 70%)", pointerEvents: "none" }} />

          <div style={{ padding: "32px 36px", display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center", position: "relative" }}>
            <div>
              <p style={{ color: T.teal, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>⚡ SAISON 1 ACTIVE</p>
              <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "clamp(36px,5vw,54px)", letterSpacing: 2, color: T.text, margin: "0 0 10px", lineHeight: 1 }}>
                BON RETOUR, <span style={{ color: T.teal }}>{firstName.toUpperCase()}</span>
              </h1>
              <p style={{ color: T.text2, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Continue à grinder et domine le classement. {matches > 0 ? `${matches} match${matches > 1 ? "s" : ""} joué${matches > 1 ? "s" : ""}.` : "Lance-toi dans ton premier tournoi !"}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link to="/tournaments" style={{ padding: "11px 24px", borderRadius: 10, background: `linear-gradient(135deg,${T.teal},${T.tealD})`, color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, textDecoration: "none", boxShadow: `0 4px 20px rgba(0,196,154,0.3)` }}>
                  JOUER MAINTENANT →
                </Link>
                <Link to="/daily-rewards" style={{ padding: "11px 20px", borderRadius: 10, background: "rgba(240,160,48,0.1)", border: "1px solid rgba(240,160,48,0.25)", color: T.amber, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, textDecoration: "none" }}>
                  🎁 DAILY
                </Link>
              </div>
            </div>

            {/* XP Card */}
            <div style={{ minWidth: 200, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2 }}>NIVEAU ACTUEL</p>
                <p style={{ color: T.indigo, fontFamily: "'Bebas Neue',cursive", fontSize: 26, lineHeight: 1 }}>{level}</p>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.2, ease: [.22, 1, .36, 1], delay: 0.3 }}
                  style={{ height: "100%", background: `linear-gradient(90deg,${T.indigo},${T.teal})`, borderRadius: 99, boxShadow: `0 0 10px rgba(129,140,248,0.4)` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>{xp.toLocaleString()} XP</span>
                <span style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>{xpNext.toLocaleString()}</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: T.amber, fontFamily: "'Bebas Neue',cursive", fontSize: 20, lineHeight: 1 }}>{wins}</p>
                  <p style={{ color: T.text3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>WINS</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: T.teal, fontFamily: "'Bebas Neue',cursive", fontSize: 20, lineHeight: 1 }}>{wr}%</p>
                  <p style={{ color: T.text3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>WIN RATE</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: T.indigo, fontFamily: "'Bebas Neue',cursive", fontSize: 20, lineHeight: 1 }}>{pts.toLocaleString()}</p>
                  <p style={{ color: T.text3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>POINTS</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── STATS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard delay={0.05} icon="💎" label="PIÈCES" value={(balance || 0).toLocaleString("fr-FR")} color={T.amber} sub="Solde actuel" />
          <StatCard delay={0.1}  icon="⚡" label="XP TOTAL" value={xp.toLocaleString()} color={T.indigo} sub={`Niveau ${level}`} />
          <StatCard delay={0.15} icon="🏆" label="VICTOIRES" value={wins} color={T.teal} sub={`${matches} matchs joués`} />
          <StatCard delay={0.2}  icon="📈" label="WIN RATE" value={`${wr}%`} color={T.rose} sub="Taux de victoire" />
        </div>

        {/* ── QUICK ACCESS ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 2, color: T.text, marginBottom: 14 }}>
            ACCÈS <span style={{ color: T.teal }}>RAPIDE</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
            {QUICK.map((q, i) => (
              <motion.div key={q.to} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}>
                <Link to={q.to} style={{ display: "block", padding: "16px 14px", borderRadius: 13, background: T.card, border: `1px solid ${T.border}`, textDecoration: "none", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = q.color + "40"; e.currentTarget.style.background = T.card2; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{q.icon}</div>
                  <p style={{ color: q.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 3 }}>{q.label}</p>
                  <p style={{ color: T.text3, fontSize: 11 }}>{q.sub}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── TOURNAMENTS + LEADERBOARD ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* Tournaments */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 2, color: T.text }}>
                TOURNOIS <span style={{ color: T.teal }}>ACTIFS</span>
              </h2>
              <Link to="/tournaments" style={{ color: T.teal, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", textDecoration: "none", fontWeight: 700 }}>VOIR TOUT →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tournaments.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: T.text3, background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3 }}>AUCUN TOURNOI ACTIF</p>
                </div>
              ) : (
                tournaments.map((t, i) => <TournamentRow key={t.id} t={t} i={i} />)
              )}
            </div>
          </div>

          {/* Top Players */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 2, color: T.text }}>
                TOP <span style={{ color: T.amber }}>JOUEURS</span>
              </h2>
              <Link to="/leaderboard" style={{ color: T.teal, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", textDecoration: "none", fontWeight: 700 }}>TOUT →</Link>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              {topPlayers.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.text3 }}>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 2 }}>AUCUN JOUEUR</p>
                </div>
              ) : topPlayers.map((p, i) => (
                <motion.div key={p.user_id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 * i }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < topPlayers.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: i === 0 ? "rgba(240,160,48,0.15)" : i === 1 ? "rgba(200,200,220,0.1)" : i === 2 ? "rgba(180,140,60,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${i === 0 ? "rgba(240,160,48,0.3)" : i === 1 ? "rgba(200,200,220,0.2)" : i === 2 ? "rgba(180,140,60,0.2)" : T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Bebas Neue',cursive", fontSize: 14,
                    color: i === 0 ? T.amber : i === 1 ? "#c8c8dc" : i === 2 ? "#b48c3c" : T.text3,
                  }}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : p.rank}
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${T.teal},${T.tealD})`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                    {p.avatar ? <img src={p.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: T.text, fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                    <p style={{ color: T.text3, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", margin: 0 }}>{(p.total_points || 0).toLocaleString()} pts</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: T.teal, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, margin: 0 }}>{p.wins}W</p>
                  </div>
                </motion.div>
              ))}
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
                <Link to="/leaderboard" style={{ display: "block", textAlign: "center", color: T.teal, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, textDecoration: "none", padding: "8px 0" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = ".7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                  CLASSEMENT COMPLET →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
