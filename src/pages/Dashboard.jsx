// src/pages/Dashboard.jsx — CipherPool Player Hub v4
// 🔥 Addictive · Pro · Mobile-first · Real data only
import { useOutletContext, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const P = {
  bg:     "#050508",
  surf:   "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  purple: "#7c3aed",
  cyan:   "#06b6d4",
  green:  "#22c55e",
  gold:   "#fbbf24",
  red:    "#ef4444",
  orange: "#f97316",
  indigo: "#818cf8",
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
      transition={{ delay:idx*0.06, duration:0.3 }}
      whileTap={{ scale:0.985 }}
      onClick={() => nav(`/tournaments/${t.id}`)}
      style={{
        background: isLive ? "rgba(239,68,68,0.04)" : P.surf,
        border:`1px solid ${isLive?"rgba(239,68,68,0.22)":"rgba(124,58,237,0.18)"}`,
        borderRadius:14, overflow:"hidden", cursor:"pointer", position:"relative",
      }}
    >
      {/* accent top */}
      <div style={{ height:3, background:`linear-gradient(90deg,${ac},${isLive?P.orange:P.cyan})` }}/>

      {/* badges */}
      <div style={{ position:"absolute", top:10, right:10,
        display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
        {isLive && (
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:9,
            fontWeight:800, color:P.red, background:"rgba(239,68,68,0.12)",
            padding:"3px 8px", borderRadius:99 }}>
            <LiveDot size={5}/> LIVE
          </span>
        )}
        {remaining <= 3 && !isFull && (
          <span style={{ fontSize:9, fontWeight:800, color:P.orange,
            background:"rgba(249,115,22,0.12)", padding:"3px 8px", borderRadius:99 }}>
            🔥 {remaining} PLACE{remaining>1?"S":""} RESTANTE{remaining>1?"S":""}
          </span>
        )}
        {isHot && remaining > 3 && (
          <span style={{ fontSize:9, fontWeight:800, color:P.gold,
            background:"rgba(251,191,36,0.1)", padding:"3px 8px", borderRadius:99 }}>
            🔥 PRESQUE COMPLET
          </span>
        )}
        {isFull && (
          <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.35)",
            background:"rgba(255,255,255,0.05)", padding:"3px 8px", borderRadius:99 }}>
            🔒 COMPLET
          </span>
        )}
        {isFree && !isFull && (
          <span style={{ fontSize:9, fontWeight:800, color:P.green,
            background:"rgba(34,197,94,0.1)", padding:"3px 8px", borderRadius:99 }}>
            🆓 GRATUIT
          </span>
        )}
      </div>

      <div style={{ padding:"10px 12px 12px" }}>
        <h3 style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:800,
          color:"#fff", margin:"0 0 8px", lineHeight:1.2, paddingRight:80,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {t.name}
        </h3>

        <div style={{ display:"flex", gap:12, marginBottom:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>
            🏆 <b style={{ color:P.gold }}>{fmt(t.prize_coins)}</b> CP
          </span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>
            👥 {t.current_players}/{t.max_players}
          </span>
          {t.mode && (
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>
              🎮 {t.mode}
            </span>
          )}
        </div>

        {/* countdown */}
        {countdown && !isLive && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>⏳ Commence dans</span>
            <span style={{ fontSize:14, fontWeight:900, color:P.gold, letterSpacing:1,
              fontFamily:"'Inter',sans-serif" }}>
              {countdown}
            </span>
          </div>
        )}

        {/* progress */}
        <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:99,
          overflow:"hidden", marginBottom:12 }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
            transition={{ duration:0.9, delay:idx*0.06+0.2 }}
            style={{ height:"100%", borderRadius:99,
              background: pct>=75
                ? `linear-gradient(90deg,${P.red},${P.orange})`
                : `linear-gradient(90deg,${P.purple},${P.cyan})` }}/>
        </div>

        {/* CTA */}
        <button
          onClick={e => { e.stopPropagation(); nav(`/tournaments/${t.id}`); }}
          style={{
            width:"100%", padding:"12px 0", borderRadius:10, border:"none",
            cursor: isFull ? "not-allowed" : "pointer",
            fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:800,
            letterSpacing:0.3, transition:"transform 0.15s",
            background: isFull
              ? "rgba(255,255,255,0.05)"
              : isLive
              ? `linear-gradient(135deg,${P.red},${P.orange})`
              : `linear-gradient(135deg,${P.purple},${P.cyan})`,
            color: isFull ? "rgba(255,255,255,0.25)" : "#fff",
            boxShadow: !isFull ? `0 4px 18px ${isLive?"rgba(239,68,68,0.25)":"rgba(124,58,237,0.25)"}` : "none",
          }}
        >
          {isFull ? "🔒 Tournoi complet" : isLive ? "🔴 REJOINDRE LIVE" : "⚡ REJOINDRE"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, suffix="", color, trend, delay=0, onClick }) {
  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.3 }} whileTap={{ scale:0.97 }}
      onClick={onClick}
      style={{
        background:P.surf, border:`1px solid ${color}20`,
        borderRadius:14, padding:"16px 14px",
        cursor:"pointer", position:"relative", overflow:"hidden",
      }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.5 }}/>
      <div style={{ width:34, height:34, background:`${color}15`,
        border:`1px solid ${color}22`, borderRadius:9,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:16, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:"'Inter',sans-serif",
        fontSize:"clamp(24px,5vw,36px)", fontWeight:900,
        lineHeight:1, color:"#fff", marginBottom:4 }}>
        {fmt(value)}<span style={{ fontSize:"52%", color, marginLeft:2 }}>{suffix}</span>
      </div>
      <div style={{ fontSize:9, letterSpacing:1.5, color:"rgba(255,255,255,0.3)",
        textTransform:"uppercase", marginBottom: trend?5:0 }}>
        {label}
      </div>
      {trend && (
        <div style={{ fontSize:10, fontWeight:600,
          color: trend.positive ? P.green : "rgba(255,255,255,0.25)" }}>
          {trend.text}
        </div>
      )}
    </motion.div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate();
  const { profile, balance } = useOutletContext() || {};
  const [tournaments,   setTournaments]   = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [stats,         setStats]         = useState({ played:0, wins:0, kills:0, winRate:0, rank:null, total_points:0 });
  const [daily,         setDaily]         = useState(null);   // { canClaim, streak }
  const [liveData,      setLiveData]      = useState({ liveCount:0, onlineCount:0, lastWinner:null });
  const [missions,      setMissions]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  const coins    = balance ?? 0;
  const role     = ROLES[profile?.role] ?? ROLES.user;
  const approved = profile?.verification_status === "approved";
  const firstName = (profile?.full_name?.split(" ")[0] ?? "JOUEUR").toUpperCase();
  const division = getDivision(stats.rank);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!profile?.id) return;

    const today = new Date().toISOString().split("T")[0];

    const [
      { data: trn },
      { data: st },
      { data: msgs },
      { data: claims },
      { data: lastResult },
      { data: onlineProfiles },
    ] = await Promise.all([
      supabase.from("tournaments")
        .select("id,name,status,max_players,current_players,prize_coins,entry_fee,mode,start_date")
        .in("status", ["open","in_progress"])
        .order("created_at", { ascending:false })
        .limit(6),
      supabase.from("player_stats")
        .select("*").eq("user_id", profile.id).maybeSingle(),
      supabase.from("admin_messages")
        .select("*").order("created_at", { ascending:false }).limit(3),
      supabase.from("user_daily_claims")
        .select("*").eq("user_id", profile.id)
        .order("claimed_at", { ascending:false }).limit(7),
      supabase.from("match_results")
        .select("user_id, points, profiles!match_results_user_id_fkey(full_name)")
        .eq("status","verified").eq("placement",1)
        .order("submitted_at", { ascending:false }).limit(1),
      supabase.from("profiles")
        .select("id")
        .gte("last_seen", new Date(Date.now()-5*60*1000).toISOString()),
    ]);

    setTournaments(trn ?? []);
    setMessages(msgs ?? []);

    // stats
    if (st) setStats({
      played: st.tournaments_played ?? 0,
      wins:   st.wins ?? 0,
      kills:  st.kills ?? 0,
      winRate: st.wins>0 && st.tournaments_played>0
        ? Math.round((st.wins/st.tournaments_played)*100) : 0,
      rank:   st.rank ?? null,
      total_points: st.total_points ?? 0,
    });

    // live data — real numbers only
    const liveCount = (trn ?? []).filter(t => t.status==="in_progress").length;
    const onlineCount = (onlineProfiles ?? []).length;
    const lastWinner = lastResult?.[0]
      ? { name: lastResult[0].profiles?.full_name || "Joueur", points: lastResult[0].points }
      : null;
    setLiveData({ liveCount, onlineCount, lastWinner });

    // daily reward
    const todayClaim = (claims ?? []).find(c =>
      new Date(c.claimed_at).toDateString() === new Date().toDateString());
    const streak = claims?.length ?? 0;
    setDaily({ canClaim: !todayClaim, streak });

    // missions dynamiques depuis les stats
    if (st) {
      const m = [];
      if ((st.tournaments_played ?? 0) === 0)
        m.push({ icon:"🎮", text:"Joue ton 1er tournoi", prog:0, target:1, done:false });
      else if ((st.wins ?? 0) === 0)
        m.push({ icon:"🏆", text:"Gagne ton 1er tournoi", prog:0, target:1, done:false });
      else
        m.push({ icon:"🏆", text:"Victoires au total", prog:st.wins??0, target:Math.max(5, (st.wins??0)+3), done:false });
      m.push({ icon:"🎯", text:"Kills totaux", prog:st.kills??0, target:Math.max(10, (st.kills??0)+5), done:false });
      if (!todayClaim)
        m.push({ icon:"🎁", text:"Réclame ton bonus du jour", prog:0, target:1, done:false });
      else
        m.push({ icon:"🎁", text:"Bonus quotidien réclamé", prog:1, target:1, done:true });
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
          setTournaments(prev => prev
            .map(t => t.id===p.new.id ? p.new : t)
            .filter(t => ["open","in_progress"].includes(t.status)));
      })
      .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"player_stats",
        filter:`user_id=eq.${profile.id}` }, (p) => {
        const s = p.new;
        setStats({
          played:s.tournaments_played??0, wins:s.wins??0,
          kills:s.kills??0, rank:s.rank??null, total_points:s.total_points??0,
          winRate: s.wins>0&&s.tournaments_played>0
            ? Math.round((s.wins/s.tournaments_played)*100):0,
        });
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [profile?.id, load]);

  // ✅ Hooks AVANT le early return (React rules)
  const nextTournoi = tournaments.find(t => t.status==="open" && t.start_date);
  const countdownNext = useCountdown(nextTournoi?.start_date);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:P.bg,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div>
        <div style={{ width:40, height:40, border:"2px solid rgba(124,58,237,0.2)",
          borderTopColor:P.purple, borderRadius:"50%", margin:"0 auto 14px",
          animation:"spin 0.9s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:P.bg, color:"#fff",
      fontFamily:"'Inter',sans-serif",
      padding:"16px clamp(12px,4vw,44px) 90px",
      maxWidth:940, margin:"0 auto" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.35)}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .db-action{
          display:flex;align-items:center;justify-content:center;gap:8px;
          background:linear-gradient(135deg,#7c3aed,#06b6d4);
          color:#fff;border:none;border-radius:12px;cursor:pointer;
          font-family:'Inter',sans-serif;font-weight:800;font-size:15px;
          padding:15px 24px;transition:transform .15s;
          box-shadow:0 6px 26px rgba(124,58,237,0.35);width:100%;
        }
        .db-action:active{transform:scale(.97)}
        .db-ghost{
          display:flex;align-items:center;justify-content:center;gap:7px;
          background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);
          border:1px solid rgba(255,255,255,0.1);border-radius:12px;cursor:pointer;
          font-family:'Inter',sans-serif;font-weight:700;font-size:14px;
          padding:13px 20px;transition:all .15s;width:100%;
        }
        .db-ghost:active{background:rgba(255,255,255,0.08)}
        .db-lbl{
          font-size:10px;font-weight:700;letter-spacing:3px;
          text-transform:uppercase;color:#7c3aed;
          display:flex;align-items:center;gap:8px;margin-bottom:10px;
        }
        .db-lbl::before{content:'';width:16px;height:2px;background:#7c3aed;}
        .db-card{
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:14px;padding:16px 14px;
        }
        .db-qlink{
          display:flex;flex-direction:column;gap:4px;
          padding:14px 12px;background:rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.06);
          border-radius:12px;cursor:pointer;transition:all .15s;
        }
        .db-qlink:active{background:rgba(124,58,237,0.08);border-color:rgba(124,58,237,0.25);}
        @media(max-width:640px){
          .db-cta-row{flex-direction:column!important}
          .db-stats-grid{grid-template-columns:1fr 1fr!important}
          .db-trn-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          FOLD 1 — HERO
      ══════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
        style={{ marginBottom:16 }}>

        {/* Greeting */}
        <p style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.3)",
          marginBottom:8, textTransform:"uppercase" }}>
          {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
        </p>

        {/* MAIN TITLE — dynamic based on context */}
        {(() => {
          let title = "PRÊT À DOMINER,";
          let sub = firstName + "?";
          if (liveData.liveCount > 0) { title = "UN MATCH T'ATTEND,"; }
          else if (daily?.canClaim)   { title = "TON BONUS EST PRÊT,"; }
          else if (stats.played === 0){ title = "TON PREMIER MATCH,"; sub = "COMMENCE ICI"; }
          return (
            <h1 style={{ fontFamily:"'Inter',sans-serif",
              fontSize:"clamp(24px,6vw,50px)", fontWeight:900,
              lineHeight:1.0, letterSpacing:-0.5, marginBottom:16 }}>
              {title}{" "}
              <span style={{ background:`linear-gradient(135deg,${P.purple},${P.cyan})`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                {sub}
              </span>
            </h1>
          );
        })()}

        {/* Player strip */}
        <div style={{ display:"flex", alignItems:"center", gap:10,
          marginBottom:22, flexWrap:"wrap" }}>
          <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
            background:`linear-gradient(135deg,${P.purple},${P.cyan})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:900, fontSize:18, overflow:"hidden",
            boxShadow:`0 4px 18px rgba(124,58,237,0.3)` }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : firstName[0]}
          </div>

          <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
            <Badge color={role.color}>{role.icon} {role.label}</Badge>
            {approved && <Badge color={P.green}>✓ VÉRIFIÉ</Badge>}
            <Badge color={P.gold} bold>💎 {coins.toLocaleString()} CP</Badge>
            {stats.rank && (
              <Badge color={division.color}>
                {division.icon} {division.label} · #{stats.rank}
              </Badge>
            )}
          </div>
        </div>

        {/* Main CTAs */}
        <div className="db-cta-row" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 190px", maxWidth:260 }}>
            <button className="db-action" onClick={() => nav("/tournaments")}>
              🚀 JOUER MAINTENANT
            </button>
          </div>
          <div style={{ flex:"1 1 160px", maxWidth:220 }}>
            <button className="db-ghost" onClick={() => nav("/leaderboard")}>
              📊 MON CLASSEMENT
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          FOLD 2 — LIVE BAR (real data only)
      ══════════════════════════════════════════════════════════ */}
      {(liveData.liveCount > 0 || liveData.onlineCount > 0 || liveData.lastWinner) && (
        <motion.div initial={{ opacity:0, x:-14 }} animate={{ opacity:1, x:0 }}
          transition={{ delay:0.08 }} style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px",
            background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.18)",
            borderRadius:12, flexWrap:"wrap", rowGap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
              <LiveDot/>
              <span style={{ fontSize:11, fontWeight:800, color:P.red, letterSpacing:1 }}>
                EN DIRECT
              </span>
            </div>
            {liveData.liveCount > 0 && (
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>
                🏟️ <b style={{ color:"#fff" }}>{liveData.liveCount}</b> tournoi{liveData.liveCount>1?"s":""} live
              </span>
            )}
            {liveData.onlineCount > 0 && (
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>
                🟢 <b style={{ color:"#fff" }}>{liveData.onlineCount}</b> joueur{liveData.onlineCount>1?"s":""} en ligne
              </span>
            )}
            {liveData.lastWinner && (
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>
                🏆 Dernier gagnant:{" "}
                <b style={{ color:P.gold }}>{liveData.lastWinner.name}</b>
                {liveData.lastWinner.points > 0 && (
                  <b style={{ color:P.green }}> +{liveData.lastWinner.points} pts</b>
                )}
              </span>
            )}
            {countdownNext && (
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>
                ⏳ Prochain:{" "}
                <b style={{ color:P.gold, fontFamily:"'Inter',sans-serif" }}>
                  {countdownNext}
                </b>
              </span>
            )}
            <button onClick={() => nav("/tournaments")}
              style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:P.red,
                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.22)",
                borderRadius:8, padding:"5px 12px", cursor:"pointer", flexShrink:0 }}>
              Voir →
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FOLD 3 — TOURNOIS (BEFORE STATS)
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div className="db-lbl" style={{ marginBottom:0 }}>🎮 Tournois actifs</div>
          <button onClick={() => nav("/tournaments")}
            style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)",
              background:"none", border:"none", cursor:"pointer" }}>
            Voir tout →
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div style={{ textAlign:"center", padding:"44px 16px",
            background:P.surf, border:"1px solid rgba(255,255,255,0.05)",
            borderRadius:14 }}>
            <p style={{ fontSize:36, marginBottom:12,
              animation:"floatY 3s ease-in-out infinite" }}>🏟️</p>
            <p style={{ fontSize:15, fontWeight:800,
              color:"rgba(255,255,255,0.2)", marginBottom:16 }}>
              ARÈNE EN VEILLE
            </p>
            <button className="db-action" onClick={() => nav("/tournaments")}
              style={{ maxWidth:200, margin:"0 auto" }}>
              Parcourir →
            </button>
          </div>
        ) : (
          <div className="db-trn-grid" style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(min(280px,100%),1fr))",
            gap:12 }}>
            {tournaments.map((t,i) => <TournamentCard key={t.id} t={t} idx={i}/>)}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOLD 4 — MISSIONS DU JOUR
      ══════════════════════════════════════════════════════════ */}
      {missions.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.12 }} style={{ marginBottom:22 }}>
          <div className="db-lbl">🎯 Missions du jour</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {missions.map((m, i) => {
              const pct = Math.min(100, m.target > 0 ? Math.round((m.prog/m.target)*100) : 0);
              return (
                <div key={i} style={{ padding:"14px 16px", borderRadius:12,
                  background: m.done ? "rgba(34,197,94,0.04)" : P.surf,
                  border:`1px solid ${m.done?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.06)"}` }}>
                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", marginBottom:8, gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:18 }}>{m.icon}</span>
                      <span style={{ fontSize:13, fontWeight:700,
                        color: m.done ? P.green : "#fff" }}>{m.text}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, flexShrink:0,
                      color: m.done ? P.green : "rgba(255,255,255,0.4)" }}>
                      {m.done ? "✓ DONE" : `${m.prog}/${m.target}`}
                    </span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.05)",
                    borderRadius:99, overflow:"hidden" }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                      transition={{ duration:0.8, delay:0.1+i*0.08 }}
                      style={{ height:"100%", borderRadius:99,
                        background: m.done
                          ? P.green
                          : `linear-gradient(90deg,${P.purple},${P.cyan})` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─ PROGRESSION CLUSTER ─ */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", marginBottom:20 }}/>
      {/* ══════════════════════════════════════════════════════════
          FOLD 5 — STATS (smart cards with trends)
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:22 }}>
        <div className="db-lbl">📊 Mes performances</div>
        <div className="db-stats-grid" style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(min(140px,45vw),1fr))",
          gap:8 }}>
          <StatCard icon="🎮" label="TOURNOIS JOUÉS" value={stats.played}
            color={P.cyan} delay={0} onClick={() => nav("/stats")}
            trend={stats.played > 0 ? { text:`${stats.played} match${stats.played>1?"s":""}`, positive:true } : null}/>
          <StatCard icon="🏆" label="VICTOIRES" value={stats.wins}
            color={P.gold} delay={0.06} onClick={() => nav("/stats")}
            trend={stats.wins > 0 ? { text:`Série: ${stats.wins} win${stats.wins>1?"s":""}`, positive:true } : null}/>
          <StatCard icon="🎯" label="KILLS TOTAUX" value={stats.kills}
            color={P.purple} delay={0.12} onClick={() => nav("/stats")}
            trend={stats.kills > 0 ? { text:"Top chasseur 🎯", positive:true } : null}/>
          <StatCard icon="📈" label="WIN RATE" value={stats.winRate} suffix="%"
            color={P.green} delay={0.18} onClick={() => nav("/stats")}
            trend={stats.winRate >= 50
              ? { text:"Top 50% joueurs", positive:true }
              : stats.winRate > 0
              ? { text:"Continue à jouer !", positive:false }
              : null}/>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOLD 6 — RANK + PRESTIGE
      ══════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.18 }} style={{ marginBottom:22 }}>
        <div className="db-lbl">🏆 Mon classement</div>
        <div className="db-card" onClick={() => nav("/leaderboard")}
          style={{ cursor:"pointer",
            background: `linear-gradient(135deg,${division.color}06,rgba(255,255,255,0.02))`,
            border:`1px solid ${division.color}20` }}>
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
            {/* Left: rank + division */}
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Inter',sans-serif",
                  fontSize:"clamp(44px,8vw,64px)", fontWeight:900, lineHeight:1,
                  color: stats.rank ? "#fff" : "rgba(255,255,255,0.1)" }}>
                  {stats.rank ? `#${stats.rank}` : "—"}
                </div>
                <div style={{ fontSize:9, letterSpacing:2,
                  color:"rgba(255,255,255,0.25)", marginTop:2 }}>
                  GLOBAL
                </div>
              </div>
              <div>
                <div style={{ fontSize:20, fontWeight:900, color:division.color,
                  marginBottom:4 }}>
                  {division.icon} {division.label}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>
                  {stats.rank
                    ? stats.rank<=10  ? "Top 1% — Légendaire 👑"
                    : stats.rank<=50  ? "Top 5% — Elite"
                    : stats.rank<=100 ? "Top 10% — Pro"
                    :                   "Continue à grimper !"
                    : "Joue pour obtenir un rang"}
                </div>
                <div style={{ fontSize:12, color:P.gold }}>
                  💎 {stats.total_points.toLocaleString()} pts total
                </div>
              </div>
            </div>

            {/* Right: win rate */}
            <div style={{ flex:"0 0 150px", minWidth:120 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:9, letterSpacing:1, color:"rgba(255,255,255,0.25)" }}>
                  WIN RATE
                </span>
                <span style={{ fontSize:14, fontWeight:800, color:P.green }}>
                  {stats.winRate}%
                </span>
              </div>
              <div style={{ height:5, background:"rgba(255,255,255,0.06)",
                borderRadius:99, overflow:"hidden" }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${stats.winRate}%` }}
                  transition={{ delay:0.5, duration:1.2, ease:[.22,1,.36,1] }}
                  style={{ height:"100%", borderRadius:99,
                    background:`linear-gradient(90deg,${P.green},${P.cyan})` }}/>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6 }}>
                {stats.wins}V · {stats.played-stats.wins}D
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─ REWARDS CLUSTER ─ */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.05)", marginBottom:20 }}/>
      {/* ══════════════════════════════════════════════════════════
          FOLD 7 — DAILY REWARD + STREAK
      ══════════════════════════════════════════════════════════ */}
      {daily && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.22 }} style={{ marginBottom:22 }}>
          <div className="db-lbl">🎁 Bonus & récompenses</div>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(min(180px,100%),1fr))",
            gap:8 }}>
            {/* Daily */}
            <div onClick={() => nav("/daily-rewards")}
              style={{ padding:"13px 14px", borderRadius:12, cursor:"pointer",
                background: daily.canClaim
                  ? "linear-gradient(135deg,rgba(251,191,36,0.07),rgba(124,58,237,0.05))"
                  : P.surf,
                border:`1px solid ${daily.canClaim
                  ? "rgba(251,191,36,0.25)":"rgba(255,255,255,0.06)"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:24,
                  animation: daily.canClaim ? "floatY 2s ease-in-out infinite" : "none" }}>
                  🎁
                </span>
                {daily.canClaim && (
                  <span style={{ fontSize:9, fontWeight:800, color:P.gold,
                    background:"rgba(251,191,36,0.12)", padding:"3px 8px", borderRadius:99,
                    animation:"blink 2s infinite" }}>
                    DISPONIBLE
                  </span>
                )}
              </div>
              <p style={{ fontSize:14, fontWeight:800, color:"#fff", margin:"0 0 3px" }}>
                Récompense du jour
              </p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", margin:0 }}>
                {daily.canClaim ? "Clique pour réclamer !" : "Déjà réclamée ✓"}
              </p>
            </div>

            {/* Streak */}
            <div onClick={() => nav("/daily-rewards")}
              style={{ padding:"13px 14px", borderRadius:12, cursor:"pointer",
                background:"rgba(239,68,68,0.04)",
                border:"1px solid rgba(239,68,68,0.14)" }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:24 }}>🔥</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:36,
                  fontWeight:900, color:P.red, lineHeight:1 }}>
                  {daily.streak}
                </span>
              </div>
              <p style={{ fontSize:14, fontWeight:800, color:"#fff", margin:"0 0 3px" }}>
                Jours d'affilée
              </p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", margin:0 }}>
                {daily.streak >= 7
                  ? "🔥 Série légendaire !"
                  : daily.streak >= 3
                  ? "Bonne série, continue !"
                  : "Lance ta série aujourd'hui"}
              </p>
            </div>

            {/* Achievements shortcut */}
            <div onClick={() => nav("/achievements")}
              style={{ padding:"13px 14px", borderRadius:12, cursor:"pointer",
                background:P.surf, border:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize:24, display:"block", marginBottom:10 }}>🏅</span>
              <p style={{ fontSize:14, fontWeight:800, color:"#fff", margin:"0 0 3px" }}>
                Achievements
              </p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", margin:0 }}>
                Succès débloqués
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FOLD 8 — QUICK ACTIONS
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:22 }}>
        <div className="db-lbl">⚡ Actions rapides</div>
        <div style={{ display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(min(130px,43vw),1fr))",
          gap:7 }}>
          {[
            { icon:"🎮", label:"JOUER",       sub:"Tournois",     path:"/tournaments",   color:P.purple },
            { icon:"📊", label:"CLASSEMENT",  sub:"Mon rang",     path:"/leaderboard",   color:P.cyan },
            { icon:"🎁", label:"BONUS",        sub:"Daily",        path:"/daily-rewards", color:P.gold },
            { icon:"📈", label:"MES STATS",   sub:"Kills & Wins", path:"/stats",         color:P.green },
            { icon:"🏅", label:"SUCCÈS",       sub:"Achievements", path:"/achievements",  color:"#a855f7" },
            { icon:"🛍️", label:"BOUTIQUE",    sub:"Items",        path:"/store",         color:P.cyan },
          ].map(({ icon, label, sub, path, color }, i) => (
            <motion.div key={label} className="db-qlink"
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.04 }}
              onClick={() => nav(path)}
              whileTap={{ scale:0.96 }}>
              <div style={{ fontSize:20 }}>{icon}</div>
              <div style={{ fontSize:11, fontWeight:800, color:"#fff",
                letterSpacing:0.3 }}>{label}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOLD 9 — ANNOUNCEMENTS (collapsible if many)
      ══════════════════════════════════════════════════════════ */}
      {messages.length > 0 && (
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.28 }} style={{ marginBottom:20 }}>
          <div className="db-lbl">📣 Annonces</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {messages.map(m => (
              <div key={m.id} style={{ padding:"14px 16px",
                background:"rgba(124,58,237,0.04)",
                border:"1px solid rgba(124,58,237,0.15)",
                borderLeft:`3px solid ${P.purple}`,
                borderRadius:10 }}>
                <p style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 4px" }}>
                  {m.title ?? "ANNONCE"}
                </p>
                <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)",
                  lineHeight:1.5, margin:0 }}>
                  {m.content ?? m.message ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STICKY BOTTOM CTA — mobile only
      ══════════════════════════════════════════════════════════ */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50,
        padding:"10px 14px 12px",
        background:"rgba(5,5,8,0.96)", backdropFilter:"blur(20px)",
        borderTop:`1px solid rgba(124,58,237,0.15)`,
        display:"none" }} className="db-sticky">
        <button className="db-action" onClick={() => nav("/tournaments")}
          style={{ fontSize:14 }}>
          🚀 Rejoindre un tournoi
        </button>
      </div>

      <style>{`
        @media(max-width:768px){ .db-sticky{ display:block!important; } }
      `}</style>
    </div>
  );
}

// ─── BADGE HELPER ─────────────────────────────────────────────────────────────
function Badge({ color, bold, children }) {
  return (
    <span style={{
      fontSize:11, fontWeight: bold ? 800 : 700,
      color, background:`${color}12`,
      border:`1px solid ${color}25`,
      padding:"4px 10px", borderRadius:99,
    }}>
      {children}
    </span>
  );
}