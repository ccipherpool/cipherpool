import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useOutletContext } from "react-router-dom";

const T = {
  bg:     "#0b0b14",
  card:   "rgba(14,14,28,0.9)",
  card2:  "rgba(20,20,38,0.95)",
  border: "rgba(255,255,255,0.07)",
  teal:   "#00c49a",
  amber:  "#f0a030",
  gold:   "#fbbf24",
  silver: "#c8d0e0",
  bronze: "#cd7f32",
  indigo: "#818cf8",
  rose:   "#f43f5e",
  text:   "#e8e8f4",
  text2:  "#9898b8",
  text3:  "#5c5c7a",
};

const RANK_CFG = {
  1: { icon: "🥇", color: T.gold,   bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)" },
  2: { icon: "🥈", color: T.silver, bg: "rgba(200,208,224,0.07)", border: "rgba(200,208,224,0.18)" },
  3: { icon: "🥉", color: T.bronze, bg: "rgba(205,127,50,0.08)",  border: "rgba(205,127,50,0.2)" },
};

export default function Leaderboard() {
  const { profile: me } = useOutletContext() || {};
  const [players, setPlayers] = useState([]);
  const [period,  setPeriod]  = useState("alltime");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("user_id,total_points,kills,tournaments_played,wins,best_position")
        .gt("tournaments_played", 0)
        .order("total_points", { ascending: false })
        .limit(100);

      if (!statsData?.length) { setPlayers([]); setLoading(false); return; }

      const ids = statsData.map(s => s.user_id);
      const [{ data: profiles }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,free_fire_id,avatar_url,level").in("id", ids),
        supabase.from("wallets").select("user_id,balance").in("user_id", ids),
      ]);

      const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const wMap = Object.fromEntries((wallets || []).map(w => [w.user_id, w.balance || 0]));
      const sMap = Object.fromEntries(statsData.map(s => [s.user_id, s]));

      const list = ids
        .filter(id => pMap[id])
        .map(id => ({
          id,
          name: pMap[id]?.full_name || "Joueur",
          ffId: pMap[id]?.free_fire_id || "—",
          avatar: pMap[id]?.avatar_url,
          level: pMap[id]?.level || 1,
          coins: wMap[id] || 0,
          points: sMap[id]?.total_points || 0,
          kills: sMap[id]?.kills || 0,
          matches: sMap[id]?.tournaments_played || 0,
          wins: sMap[id]?.wins || 0,
          best: sMap[id]?.best_position || null,
        }))
        .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coins - a.coins)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      setPlayers(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const wr = (p) => p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: T.text, padding: "24px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <p style={{ color: T.amber, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>📊 COMPÉTITION</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "clamp(32px,5vw,52px)", letterSpacing: 3, margin: 0 }}>
              CLASSEMENT <span style={{ color: T.amber }}>GÉNÉRAL</span>
            </h1>
            <p style={{ color: T.text3, fontSize: 13 }}>{players.length} joueurs classés</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 10, width: "fit-content", marginBottom: 20, border: `1px solid ${T.border}` }}>
          {[
            { key: "weekly",  label: "SEMAINE" },
            { key: "monthly", label: "MOIS" },
            { key: "alltime", label: "ALL-TIME" },
          ].map(t => (
            <button key={t.key} onClick={() => setPeriod(t.key)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                background: period === t.key ? `linear-gradient(135deg,${T.amber},${T.amber}cc)` : "transparent",
                color: period === t.key ? "#0b0b14" : T.text3,
                fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                transition: "all .2s",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Top 3 podium cards */}
        {!loading && players.length >= 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.08fr 1fr", gap: 12, marginBottom: 20, alignItems: "end" }}>
            {[players[1], players[0], players[2]].map((p, pos) => {
              if (!p) return <div key={pos} />;
              const isCenter = pos === 1;
              const rc = RANK_CFG[p.rank] || {};
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: isCenter ? -20 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pos * 0.08 }}
                  style={{ background: T.card, border: `1px solid ${rc.border || T.border}`, borderRadius: 14, padding: isCenter ? "24px 18px" : "18px 14px", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: isCenter ? `0 0 40px ${rc.color}20` : "none" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${rc.color || T.teal},transparent)` }} />
                  <div style={{ fontSize: isCenter ? 32 : 24, marginBottom: 8 }}>{rc.icon || p.rank}</div>
                  <div style={{ width: isCenter ? 56 : 44, height: isCenter ? 56 : 44, borderRadius: "50%", background: `linear-gradient(135deg,${rc.color || T.teal}40,${rc.color || T.teal}20)`, border: `2px solid ${rc.color || T.teal}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", overflow: "hidden", fontSize: 20, fontWeight: 700, color: rc.color || T.teal }}>
                    {p.avatar ? <img src={p.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.name[0]?.toUpperCase()}
                  </div>
                  <p style={{ color: T.text, fontWeight: 700, fontSize: isCenter ? 14 : 12, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <p style={{ color: rc.color || T.teal, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, margin: 0 }}>{p.points.toLocaleString()} pts</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid rgba(240,160,48,0.15)`, borderTopColor: T.amber }} />
          </div>
        ) : players.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
            <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3 }}>AUCUN JOUEUR CLASSÉ</p>
          </div>
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {/* Col headers */}
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 80px 80px 80px 80px", gap: 0, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: "rgba(255,255,255,0.02)" }}>
              {["#","JOUEUR","POINTS","KILLS","MATCHS","WINS","WIN%"].map((h, i) => (
                <p key={h} style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 1.5, fontWeight: 700, margin: 0, textAlign: i > 1 ? "center" : "left" }}>{h}</p>
              ))}
            </div>

            {players.slice(0, 50).map((p, i) => {
              const isMe = p.id === me?.id;
              const rc = RANK_CFG[p.rank];
              return (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.02 }}
                  style={{
                    display: "grid", gridTemplateColumns: "48px 1fr 100px 80px 80px 80px 80px",
                    padding: "13px 16px", alignItems: "center",
                    borderBottom: i < players.length - 1 ? `1px solid ${T.border}` : "none",
                    background: isMe ? "rgba(0,196,154,0.04)" : rc ? rc.bg : "transparent",
                    borderLeft: isMe ? `3px solid ${T.teal}` : rc ? `3px solid ${rc.color}` : "3px solid transparent",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { if (!isMe && !rc) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { if (!isMe && !rc) e.currentTarget.style.background = "transparent"; }}>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                    {rc ? (
                      <span style={{ fontSize: 18 }}>{rc.icon}</span>
                    ) : (
                      <span style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700 }}>{p.rank}</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: rc ? `${rc.color}25` : "rgba(0,196,154,0.1)", border: `1px solid ${rc ? rc.color + "35" : "rgba(0,196,154,0.2)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: rc?.color || T.teal, overflow: "hidden" }}>
                      {p.avatar ? <img src={p.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: isMe ? T.teal : T.text, fontSize: 13, fontWeight: isMe ? 700 : 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}{isMe && <span style={{ color: T.teal, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", marginLeft: 6 }}>MOI</span>}
                      </p>
                      <p style={{ color: T.text3, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", margin: 0 }}>Niv.{p.level} · {p.ffId}</p>
                    </div>
                  </div>

                  {[
                    { val: p.points.toLocaleString(), color: T.amber },
                    { val: p.kills.toLocaleString(), color: T.rose },
                    { val: p.matches, color: T.text2 },
                    { val: p.wins, color: T.teal },
                    { val: `${wr(p)}%`, color: wr(p) >= 50 ? T.teal : T.text3 },
                  ].map((s, ci) => (
                    <p key={ci} style={{ color: s.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, margin: 0, textAlign: "center" }}>{s.val}</p>
                  ))}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
