// src/pages/Dashboard.jsx — CipherPool Player Hub v6 DESKTOP PRO
// 🔥 Layout desktop/mobile parfait · Grilles adaptatives · Premium
import { useOutletContext, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

// ─── PALETTE PREMIUM ──────────────────────────────────────────────────────────
const P = {
  bg:     "#050508",
  surf:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  purple: "#7c3aed",
  purpleLight: "#a78bfa",
  cyan:   "#06b6d4",
  green:  "#22c55e",
  gold:   "#fbbf24",
  red:    "#ef4444",
  orange: "#f97316",
  indigo: "#818cf8",
  pink:   "#ec4899",
};

const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n ?? 0);

// ─── DIVISIONS ────────────────────────────────────────────────────────────────
const getDivision = rank => {
  if (!rank)       return { label:"SANS RANG", color:"rgba(255,255,255,0.3)", icon:"🎮", pct:0 };
  if (rank <= 10)  return { label:"LÉGENDAIRE", color:"#fbbf24", icon:"👑", pct:95 };
  if (rank <= 50)  return { label:"MASTER",     color:"#a855f7", icon:"💎", pct:80 };
  if (rank <= 100) return { label:"ELITE",      color:"#06b6d4", icon:"⚡", pct:65 };
  if (rank <= 300) return { label:"PRO",        color:"#22c55e", icon:"🔥", pct:45 };
  return               { label:"JOUEUR",    color:P.indigo,  icon:"🎮", pct:20 };
};

const ROLES = {
  super_admin: { label:"SUPER ADMIN", color:"#06b6d4", icon:"👑" },
  admin:       { label:"ADMIN",       color:P.indigo,  icon:"🛡️" },
  founder:     { label:"FONDATEUR",   color:P.purple,  icon:"⚡" },
  fondateur:   { label:"FONDATEUR",   color:P.purple,  icon:"⚡" },
  user:        { label:"JOUEUR",      color:"rgba(255,255,255,0.45)", icon:"🎮" },
};

// ─── COUNTDOWN ────────────────────────────────────────────────────────────────
function useCountdown(target) {
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setS(Math.max(0, Math.floor((new Date(target) - Date.now())/1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!s || s <= 0) return null;
  const h = Math.floor(s/3600).toString().padStart(2,"0");
  const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
  const sec = (s%60).toString().padStart(2,"0");
  return s < 3600 ? `${m}:${sec}` : `${h}:${m}:${sec}`;
}

// ─── LIVE DOT ─────────────────────────────────────────────────────────────────
const LiveDot = ({ color = P.red, size = 7 }) => (
  <span style={{
    display:"inline-block", width:size, height:size,
    borderRadius:"50%", background:color, flexShrink:0,
    boxShadow:`0 0 6px ${color}`,
    animation:"blink 1.4s ease-in-out infinite",
  }}/>
);

// ─── BADGE HELPER ─────────────────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <span style={{
      fontSize:11, fontWeight:700,
      color, background:`${color}12`,
      border:`1px solid ${color}25`,
      padding:"4px 10px", borderRadius:99,
      display:"inline-flex", alignItems:"center", gap:6,
    }}>
      {children}
    </span>
  );
}

// ─── TOURNAMENT CARD ──────────────────────────────────────────────────────────
function TournamentCard({ t, idx }) {
  const nav = useNavigate();
  const pct = t.max_players > 0 ? Math.round((t.current_players/t.max_players)*100) : 0;
  const remaining = t.max_players - (t.current_players ?? 0);
  const isLive  = t.status === "in_progress";
  const isFull  = pct >= 100;
  const isHot   = pct >= 75 && !isFull;
  const isFree  = !t.entry_fee || t.entry_fee === 0;
  const countdown = useCountdown(t.start_date);
  const ac = isLive ? P.red : P.purple;

  return (
    <motion.div
      initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:idx*0.05, duration:0.3 }}
      whileTap={{ scale:0.98 }}
      onClick={() => nav(`/tournaments/${t.id}`)}
      style={{
        background: isLive ? "rgba(239,68,68,0.04)" : P.surf,
        border:`1px solid ${isLive?"rgba(239,68,68,0.22)":"rgba(124,58,237,0.18)"}`,
        borderRadius:16, overflow:"hidden", cursor:"pointer", position:"relative",
      }}
    >
      <div style={{ height:3, background:`linear-gradient(90deg,${ac},${isLive?P.orange:P.cyan})` }}/>
      <div style={{ position:"absolute", top:10, right:10, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
        {isLive && <Badge color={P.red}>⚡ LIVE</Badge>}
        {remaining <= 3 && !isFull && <Badge color={P.orange}>🔥 {remaining} PLACE{remaining>1?"S":""}</Badge>}
        {isHot && remaining > 3 && <Badge color={P.gold}>🔥 CHAUD</Badge>}
        {isFull && <Badge color="#6b7280">🔒 COMPLET</Badge>}
        {isFree && !isFull && <Badge color={P.green}>🎁 GRATUIT</Badge>}
      </div>
      <div style={{ padding:"14px 16px" }}>
        <h3 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 10px", paddingRight:80, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {t.name}
        </h3>
        <div style={{ display:"flex", gap:14, marginBottom:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>🏆 <b style={{ color:P.gold }}>{fmt(t.prize_coins)}</b> CP</span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>👥 {t.current_players}/{t.max_players}</span>
          {t.mode && <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>🎮 {t.mode}</span>}
        </div>
        {countdown && !isLive && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, background:"rgba(251,191,36,0.08)", padding:"5px 12px", borderRadius:30, width:"fit-content" }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>⏳ DÉPART</span>
            <span style={{ fontSize:14, fontWeight:900, color:P.gold, fontFamily:"monospace" }}>{countdown}</span>
          </div>
        )}
        <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden", marginBottom:12 }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8, delay:idx*0.05 }}
            style={{ height:"100%", borderRadius:99, background: pct>=75 ? `linear-gradient(90deg,${P.red},${P.orange})` : `linear-gradient(90deg,${P.purple},${P.cyan})` }}/>
        </div>
        <button onClick={e => { e.stopPropagation(); nav(`/tournaments/${t.id}`); }}
          style={{
            width:"100%", padding:"11px 0", borderRadius:12, border:"none",
            cursor: isFull ? "not-allowed" : "pointer", fontSize:13, fontWeight:800,
            background: isFull ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg,${ac},${isLive?P.orange:P.cyan})`,
            color: isFull ? "rgba(255,255,255,0.3)" : "#fff",
            boxShadow: !isFull ? `0 4px 15px ${ac}40` : "none",
          }}>
          {isFull ? "🔒 COMPLET" : isLive ? "🎮 REJOINDRE LIVE" : "⚡ S'INSCRIRE"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, suffix="", color, trend, delay=0, onClick }) {
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.3 }} whileTap={{ scale:0.97 }}
      onClick={onClick}
      style={{
        background:P.surf, border:`1px solid ${color}20`,
        borderRadius:14, padding:"14px 12px", cursor:"pointer",
        position:"relative", overflow:"hidden",
      }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.5 }}/>
      <div style={{ width:32, height:32, background:`${color}15`, border:`1px solid ${color}22`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:900, lineHeight:1, color:"#fff", marginBottom:3 }}>{fmt(value)}<span style={{ fontSize:"45%", color, marginLeft:2 }}>{suffix}</span></div>
      <div style={{ fontSize:9, letterSpacing:1.5, color:"rgba(255,255,255,0.35)", textTransform:"uppercase" }}>{label}</div>
      {trend && <div style={{ fontSize:9, color: trend.positive ? P.green : "rgba(255,255,255,0.4)", marginTop:4 }}>{trend.text}</div>}
    </motion.div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate();
  const { profile, balance } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ played:0, wins:0, kills:0, winRate:0, rank:null, total_points:0, top3:0 });
  const [daily, setDaily] = useState(null);
  const [liveData, setLiveData] = useState({ liveCount:0, onlineCount:0, lastWinner:null });
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const coins = balance ?? 0;
  const role = ROLES[profile?.role] ?? ROLES.user;
  const approved = profile?.verification_status === "approved";
  const firstName = (profile?.full_name?.split(" ")[0] ?? "JOUEUR").toUpperCase();
  const division = getDivision(stats.rank);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const [
      { data: trn }, { data: st }, { data: msgs }, { data: claims },
      { data: lastResult }, { data: onlineProfiles }, { data: activeMatches }
    ] = await Promise.all([
      supabase.from("tournaments").select("id,name,status,max_players,current_players,prize_coins,entry_fee,mode,start_date").in("status", ["open","in_progress"]).order("created_at", { ascending:false }).limit(6),
      supabase.from("player_stats").select("*").eq("user_id", profile.id).maybeSingle(),
      supabase.from("admin_messages").select("*").order("created_at", { ascending:false }).limit(3),
      supabase.from("user_daily_claims").select("*").eq("user_id", profile.id).order("claimed_at", { ascending:false }).limit(7),
      supabase.from("match_results").select("user_id, points, profiles!match_results_user_id_fkey(full_name)").eq("status","verified").eq("placement",1).order("submitted_at", { ascending:false }).limit(1),
      supabase.from("profiles").select("id").gte("last_seen", new Date(Date.now()-5*60*1000).toISOString()),
      supabase.from("tournaments").select("id").eq("status", "in_progress"),
    ]);
    setTournaments(trn ?? []);
    setMessages(msgs ?? []);
    if (st) setStats({
      played: st.tournaments_played ?? 0, wins: st.wins ?? 0, kills: st.kills ?? 0,
      winRate: st.wins>0 && st.tournaments_played>0 ? Math.round((st.wins/st.tournaments_played)*100) : 0,
      rank: st.rank ?? null, total_points: st.total_points ?? 0, top3: st.top3_finishes ?? 0,
    });
    const liveCount = (activeMatches ?? []).length;
    const onlineCount = (onlineProfiles ?? []).length;
    const lastWinner = lastResult?.[0] ? { name: lastResult[0].profiles?.full_name || "Joueur", points: lastResult[0].points } : null;
    setLiveData({ liveCount, onlineCount, lastWinner });
    const todayClaim = (claims ?? []).find(c => new Date(c.claimed_at).toDateString() === new Date().toDateString());
    const streak = claims?.length ?? 0;
    setDaily({ canClaim: !todayClaim, streak });
    if (st) {
      const m = [];
      if (st.tournaments_played === 0) m.push({ icon:"🎮", text:"Joue ton 1er tournoi", prog:0, target:1, done:false });
      else if (st.wins === 0) m.push({ icon:"🏆", text:"Gagne ton 1er tournoi", prog:0, target:1, done:false });
      else m.push({ icon:"🏆", text:"Victoires", prog:st.wins, target:Math.max(5, st.wins+3), done:false });
      m.push({ icon:"🎯", text:"Kills", prog:st.kills, target:Math.max(10, st.kills+5), done:false });
      if (!todayClaim) m.push({ icon:"🎁", text:"Bonus quotidien", prog:0, target:1, done:false });
      else m.push({ icon:"🎁", text:"Bonus réclamé", prog:1, target:1, done:true });
      setMissions(m.slice(0,3));
    }
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    load();
    const ch = supabase.channel(`hub-${profile.id}`)
      .on("postgres_changes",{ event:"*", schema:"public", table:"tournaments" }, (p) => {
        if (p.eventType === "INSERT" && ["open","in_progress"].includes(p.new.status))
          setTournaments(prev => [p.new, ...prev].slice(0,6));
        else if (p.eventType === "UPDATE")
          setTournaments(prev => prev.map(t => t.id===p.new.id ? p.new : t).filter(t => ["open","in_progress"].includes(t.status)));
      })
      .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"player_stats", filter:`user_id=eq.${profile.id}` }, (p) => {
        const s = p.new;
        setStats({
          played:s.tournaments_played??0, wins:s.wins??0, kills:s.kills??0, rank:s.rank??null,
          total_points:s.total_points??0, top3:s.top3_finishes??0,
          winRate: s.wins>0&&s.tournaments_played>0 ? Math.round((s.wins/s.tournaments_played)*100):0,
        });
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile?.id, load]);

  const nextTournoi = tournaments.find(t => t.status==="open" && t.start_date);
  const countdownNext = useCountdown(nextTournoi?.start_date);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:P.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div><div style={{ width:40, height:40, border:"2px solid rgba(124,58,237,0.2)", borderTopColor:P.purple, borderRadius:"50%", animation:"spin 0.9s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:P.bg, color:"#fff", fontFamily:"'Inter',sans-serif", padding:"24px clamp(16px,4vw,48px) 80px", maxWidth:1400, margin:"0 auto", width:"100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.2)}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .db-action{display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border:none;border-radius:14px;cursor:pointer;font-weight:800;font-size:15px;padding:14px 28px;transition:all .2s;box-shadow:0 6px 20px rgba(124,58,237,0.3);}
        .db-action:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(124,58,237,0.4);}
        .db-ghost{display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.12);border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;padding:12px 24px;transition:all .2s;}
        .db-ghost:hover{background:rgba(255,255,255,0.08);color:#fff;}
        .db-lbl{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#7c3aed;display:flex;align-items:center;gap:8px;margin-bottom:14px;}
        .db-lbl::before{content:'';width:18px;height:2px;background:#7c3aed;}
        .db-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:16px 18px;}
        .db-qlink{display:flex;flex-direction:column;gap:4px;padding:14px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;transition:all .15s;}
        .db-qlink:hover{background:rgba(124,58,237,0.08);border-color:rgba(124,58,237,0.3);transform:translateY(-2px);}
        /* DESKTOP GRID SYSTEM */
        .db-top-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,0.6fr);gap:24px;align-items:start;margin-bottom:32px;}
        .db-main-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,0.8fr);gap:24px;align-items:start;margin-bottom:32px;}
        .db-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
        .db-trn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}
        .db-rewards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
        .db-actions-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}
        @media(max-width:1000px){
          .db-top-grid{grid-template-columns:1fr;gap:20px;}
          .db-main-grid{grid-template-columns:1fr;gap:24px;}
          .db-stats-grid{grid-template-columns:repeat(4,minmax(0,1fr));}
          .db-rewards-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
          .db-actions-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
        }
        @media(max-width:680px){
          .db-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
          .db-rewards-grid{grid-template-columns:1fr;}
          .db-actions-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
          .db-trn-grid{grid-template-columns:1fr;}
          .db-action,.db-ghost{padding:12px 20px;font-size:13px;width:100%;}
        }
      `}</style>

      {/* ========== TOP GRID: Hero + Side Widgets ========== */}
      <div className="db-top-grid">
        {/* LEFT: Hero Section */}
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
          <p style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.35)", marginBottom:8 }}>
            {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
          </p>
          <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:900, lineHeight:1, marginBottom:16, letterSpacing:-0.5 }}>
            PRÊT À DOMINER,{" "}
            <span style={{ background:`linear-gradient(135deg,${P.purple},${P.cyan})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              {firstName}?
            </span>
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:24 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${P.purple},${P.cyan})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:20, boxShadow:`0 4px 18px rgba(124,58,237,0.3)` }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:14 }}/> : firstName[0]}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Badge color={role.color}>{role.icon} {role.label}</Badge>
              {approved && <Badge color={P.green}>✓ VÉRIFIÉ</Badge>}
              <Badge color={P.gold}>💎 {coins.toLocaleString()} CP</Badge>
              {stats.rank && <Badge color={division.color}>{division.icon} {division.label} · #{stats.rank}</Badge>}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button className="db-action" onClick={() => nav("/tournaments")}>🚀 JOUER MAINTENANT</button>
            <button className="db-ghost" onClick={() => nav("/leaderboard")}>📊 MON CLASSEMENT</button>
          </div>
        </motion.div>

        {/* RIGHT: Live Stats + Daily Quick */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Live Bar */}
          {(liveData.liveCount > 0 || liveData.onlineCount > 0 || liveData.lastWinner) && (
            <div style={{ background:"rgba(239,68,68,0.05)", border:`1px solid rgba(239,68,68,0.2)`, borderRadius:16, padding:"14px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <LiveDot /><span style={{ fontSize:11, fontWeight:800, color:P.red }}>EN DIRECT</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {liveData.liveCount > 0 && <span style={{ fontSize:12 }}>🏟️ <b>{liveData.liveCount}</b> tournoi{liveData.liveCount>1?"s":""} en cours</span>}
                {liveData.onlineCount > 0 && <span style={{ fontSize:12 }}>🟢 <b>{liveData.onlineCount}</b> joueur{liveData.onlineCount>1?"s":""} en ligne</span>}
                {liveData.lastWinner && <span style={{ fontSize:12 }}>🏆 Dernier gagnant: <b style={{ color:P.gold }}>{liveData.lastWinner.name}</b></span>}
                {countdownNext && <span style={{ fontSize:12 }}>⏳ Prochain départ: <b style={{ color:P.gold }}>{countdownNext}</b></span>}
                <button onClick={() => nav("/tournaments")} style={{ fontSize:11, color:P.red, background:"rgba(239,68,68,0.1)", border:"none", borderRadius:30, padding:"6px 12px", cursor:"pointer", alignSelf:"flex-start" }}>Voir tous →</button>
              </div>
            </div>
          )}
          {/* Daily Rewards Mini */}
          {daily && (
            <div onClick={() => nav("/daily-rewards")} style={{ background:daily.canClaim ? `linear-gradient(135deg,${P.gold}10,${P.purple}05)` : P.surf, border:`1px solid ${daily.canClaim ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius:16, padding:"14px 18px", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:32, animation:daily.canClaim ? "floatY 1.5s ease-in-out infinite" : "none" }}>🎁</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:800 }}>Récompense quotidienne</div>
                  <div style={{ fontSize:12, color:daily.canClaim ? P.gold : "rgba(255,255,255,0.5)" }}>{daily.canClaim ? "🔔 À réclamer !" : "✓ Déjà réclamée"}</div>
                  <div style={{ fontSize:11, color:P.red, marginTop:4 }}>🔥 Série: {daily.streak} jours</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== TOURNAMENTS ========== */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div className="db-lbl" style={{ marginBottom:0 }}>🎮 Tournois actifs</div>
          <button onClick={() => nav("/tournaments")} style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.4)", background:"none", border:"none", cursor:"pointer" }}>Voir tout →</button>
        </div>
        {tournaments.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px", background:P.surf, border:`1px solid rgba(255,255,255,0.05)`, borderRadius:20 }}>
            <span style={{ fontSize:48, display:"block", marginBottom:12, animation:"floatY 3s ease-in-out infinite" }}>🏟️</span>
            <p style={{ fontSize:16, fontWeight:800, color:"rgba(255,255,255,0.3)", marginBottom:16 }}>ARÈNE EN VEILLE</p>
            <button className="db-action" onClick={() => nav("/tournaments")} style={{ padding:"10px 24px", fontSize:13, margin:"0 auto" }}>Parcourir →</button>
          </div>
        ) : (
          <div className="db-trn-grid">{tournaments.map((t,i) => <TournamentCard key={t.id} t={t} idx={i}/>)}</div>
        )}
      </div>

      {/* ========== MAIN GRID: Missions + Stats | Rank + Rewards ========== */}
      <div className="db-main-grid">
        {/* LEFT COLUMN */}
        <div>
          {/* Missions */}
          {missions.length > 0 && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:24 }}>
              <div className="db-lbl">🎯 Missions du jour</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {missions.map((m, i) => {
                  const pct = m.target > 0 ? Math.min(100, Math.round((m.prog/m.target)*100)) : 0;
                  return (
                    <div key={i} style={{ padding:"12px 16px", borderRadius:14, background: m.done ? "rgba(34,197,94,0.04)" : P.surf, border:`1px solid ${m.done?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.06)"}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:18 }}>{m.icon}</span><span style={{ fontSize:13, fontWeight:600, color:m.done ? P.green : "#fff" }}>{m.text}</span></div>
                        <span style={{ fontSize:11, fontWeight:700, color:m.done ? P.green : "rgba(255,255,255,0.5)" }}>{m.done ? "✓" : `${m.prog}/${m.target}`}</span>
                      </div>
                      <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6, delay:i*0.05 }} style={{ height:"100%", borderRadius:99, background: m.done ? P.green : `linear-gradient(90deg,${P.purple},${P.cyan})` }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div>
            <div className="db-lbl">📊 Mes performances</div>
            <div className="db-stats-grid">
              <StatCard icon="🎮" label="TOURNOIS" value={stats.played} color={P.cyan} delay={0} onClick={() => nav("/stats")} trend={stats.played > 0 ? { text:`${stats.played} matchs`, positive:true } : null}/>
              <StatCard icon="🏆" label="VICTOIRES" value={stats.wins} color={P.gold} delay={0.05} onClick={() => nav("/stats")} trend={stats.wins > 0 ? { text:`${stats.wins} win${stats.wins>1?"s":""}`, positive:true } : null}/>
              <StatCard icon="🎯" label="KILLS" value={stats.kills} color={P.purple} delay={0.1} onClick={() => nav("/stats")}/>
              <StatCard icon="📈" label="WIN RATE" value={stats.winRate} suffix="%" color={P.green} delay={0.15} onClick={() => nav("/stats")}/>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Rank Card */}
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} style={{ marginBottom:24 }}>
            <div className="db-lbl">🏆 Mon classement</div>
            <div className="db-card" onClick={() => nav("/leaderboard")} style={{ cursor:"pointer", background:`linear-gradient(135deg,${division.color}08,transparent)`, border:`1px solid ${division.color}25` }}>
              <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"clamp(44px,8vw,64px)", fontWeight:900, lineHeight:1, color: stats.rank ? "#fff" : "rgba(255,255,255,0.15)" }}>{stats.rank ? `#${stats.rank}` : "—"}</div>
                  <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.3)" }}>GLOBAL</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:20, fontWeight:900, color:division.color, marginBottom:4 }}>{division.icon} {division.label}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:6 }}>{stats.rank ? (stats.rank<=10 ? "Top 1% — Légendaire" : stats.rank<=50 ? "Top 5% — Master" : stats.rank<=100 ? "Top 10% — Elite" : "Continue à grimper !") : "Joue pour obtenir un rang"}</div>
                  <div style={{ fontSize:13, color:P.gold }}>💎 {stats.total_points.toLocaleString()} pts</div>
                </div>
                <div style={{ minWidth:120 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>WIN RATE</span><span style={{ fontSize:14, fontWeight:800, color:P.green }}>{stats.winRate}%</span></div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.1)", borderRadius:99 }}><div style={{ width:`${stats.winRate}%`, height:"100%", borderRadius:99, background:`linear-gradient(90deg,${P.green},${P.cyan})` }}/></div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:6 }}>{stats.wins}V · {stats.played-stats.wins}D</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rewards */}
          {daily && (
            <div>
              <div className="db-lbl">🎁 Bonus & récompenses</div>
              <div className="db-rewards-grid">
                <div onClick={() => nav("/daily-rewards")} style={{ background:daily.canClaim ? `linear-gradient(135deg,${P.gold}10,${P.purple}05)` : P.surf, border:`1px solid ${daily.canClaim ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius:14, padding:"14px", cursor:"pointer" }}>
                  <span style={{ fontSize:28, display:"block", marginBottom:8, animation:daily.canClaim ? "floatY 1.5s ease-in-out infinite" : "none" }}>🎁</span>
                  <div style={{ fontSize:13, fontWeight:700 }}>Récompense du jour</div>
                  <div style={{ fontSize:11, color:daily.canClaim ? P.gold : "rgba(255,255,255,0.5)" }}>{daily.canClaim ? "🔔 Disponible" : "✓ Réclamée"}</div>
                </div>
                <div onClick={() => nav("/daily-rewards")} style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:14, padding:"14px", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}><span style={{ fontSize:28 }}>🔥</span><span style={{ fontSize:36, fontWeight:900, color:P.red, lineHeight:1 }}>{daily.streak}</span></div>
                  <div style={{ fontSize:13, fontWeight:700 }}>Jours d'affilée</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{daily.streak >= 7 ? "🔥 Série légendaire !" : daily.streak >= 3 ? "Bonne série !" : "Lance ta série"}</div>
                </div>
                <div onClick={() => nav("/achievements")} style={{ background:P.surf, border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"14px", cursor:"pointer" }}>
                  <span style={{ fontSize:28, display:"block", marginBottom:8 }}>🏅</span>
                  <div style={{ fontSize:13, fontWeight:700 }}>Achievements</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Succès débloqués</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== QUICK ACTIONS ========== */}
      <div style={{ marginBottom:32 }}>
        <div className="db-lbl">⚡ Actions rapides</div>
        <div className="db-actions-grid">
          {[
            { icon:"🎮", label:"JOUER", sub:"Tournois", path:"/tournaments" },
            { icon:"📊", label:"CLASSEMENT", sub:"Mon rang", path:"/leaderboard" },
            { icon:"🎁", label:"BONUS", sub:"Daily", path:"/daily-rewards" },
            { icon:"📈", label:"MES STATS", sub:"Kills & Wins", path:"/stats" },
            { icon:"🏅", label:"SUCCÈS", sub:"Achievements", path:"/achievements" },
            { icon:"🛍️", label:"BOUTIQUE", sub:"Items", path:"/store" },
          ].map((item, i) => (
            <motion.div key={item.label} className="db-qlink" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 + i*0.03 }} onClick={() => nav(item.path)}>
              <div style={{ fontSize:22 }}>{item.icon}</div>
              <div style={{ fontSize:12, fontWeight:800, color:"#fff" }}>{item.label}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{item.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ========== ANNOUNCEMENTS ========== */}
      {messages.length > 0 && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <div className="db-lbl">📣 Annonces</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {messages.map(m => (
              <div key={m.id} style={{ padding:"14px 18px", background:"rgba(124,58,237,0.05)", borderLeft:`4px solid ${P.purple}`, borderRadius:12 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:4 }}>{m.title ?? "ANNONCE"}</p>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", margin:0 }}>{m.content ?? m.message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* STICKY BOTTOM CTA */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, padding:"12px 16px", background:"rgba(5,5,8,0.96)", backdropFilter:"blur(20px)", borderTop:`1px solid rgba(124,58,237,0.2)`, display:"none" }} className="db-sticky">
        <button className="db-action" onClick={() => nav("/tournaments")} style={{ width:"100%", padding:"12px" }}>🚀 REJOINDRE UN TOURNOI</button>
      </div>
      <style>{`@media(max-width:768px){ .db-sticky{ display:block!important; } }`}</style>
    </div>
  );
}