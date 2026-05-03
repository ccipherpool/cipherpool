import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const T = {
  bg:     "#0b0b14",
  card:   "rgba(14,14,28,0.9)",
  card2:  "rgba(22,20,10,0.95)",
  border: "rgba(255,255,255,0.07)",
  teal:   "#00c49a",
  amber:  "#f0a030",
  gold:   "#fbbf24",
  silver: "#c8d0e0",
  bronze: "#cd7f32",
  indigo: "#818cf8",
  text:   "#e8e8f4",
  text2:  "#9898b8",
  text3:  "#5c5c7a",
};

const MEDAL = [
  { rank: 1, icon: "🥇", color: T.gold,   glow: "rgba(251,191,36,0.3)",  bg: "rgba(251,191,36,0.08)",  label: "CHAMPION" },
  { rank: 2, icon: "🥈", color: T.silver, glow: "rgba(200,208,224,0.2)", bg: "rgba(200,208,224,0.05)", label: "FINALISTE" },
  { rank: 3, icon: "🥉", color: T.bronze, glow: "rgba(205,127,50,0.2)",  bg: "rgba(205,127,50,0.06)",  label: "3ÈME PLACE" },
];

function WinnerPodium({ player, medal, delay }) {
  const [hov, setHov] = useState(false);
  if (!player) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: medal.rank === 1 ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 160 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.card2 : T.card,
        border: `1px solid ${hov ? medal.color + "50" : medal.color + "20"}`,
        borderRadius: 16, padding: "28px 20px", textAlign: "center",
        position: "relative", overflow: "hidden", transition: "all .25s",
        transform: medal.rank === 1 ? (hov ? "translateY(-8px) scale(1.02)" : "scale(1.02)") : hov ? "translateY(-6px)" : "none",
        boxShadow: hov ? `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${medal.glow}` : medal.rank === 1 ? `0 0 40px ${medal.glow}` : "none",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${medal.color},transparent)` }} />
      {medal.rank === 1 && (
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, ${medal.glow}, transparent 70%)`, pointerEvents: "none" }} />
      )}

      {/* Medal badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: medal.bg, border: `1px solid ${medal.color}30`, marginBottom: 16 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: medal.color, fontWeight: 700, letterSpacing: 1.5 }}>{medal.label}</span>
      </div>

      {/* Avatar */}
      <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
        <div style={{
          width: medal.rank === 1 ? 88 : 72, height: medal.rank === 1 ? 88 : 72, borderRadius: "50%",
          background: player.avatar_url ? "transparent" : `linear-gradient(135deg,${medal.color}30,${medal.color}10)`,
          border: `3px solid ${medal.color}50`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: medal.rank === 1 ? 32 : 26, fontWeight: 800, color: medal.color, overflow: "hidden", margin: "0 auto",
        }}>
          {player.avatar_url
            ? <img src={player.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : player.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", fontSize: medal.rank === 1 ? 28 : 22 }}>
          {medal.icon}
        </div>
      </div>

      <h3 style={{ color: T.text, fontWeight: 800, fontSize: medal.rank === 1 ? 18 : 15, margin: "10px 0 4px" }}>{player.name || "Joueur"}</h3>
      {player.ff_id && <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, margin: "0 0 12px" }}>ID: {player.ff_id}</p>}

      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ color: medal.color, fontFamily: "'Bebas Neue',cursive", fontSize: 22, lineHeight: 1, margin: 0 }}>{player.wins || 0}</p>
          <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 1 }}>WINS</p>
        </div>
        {player.prize > 0 && (
          <div>
            <p style={{ color: T.amber, fontFamily: "'Bebas Neue',cursive", fontSize: 22, lineHeight: 1, margin: 0 }}>{player.prize.toLocaleString()}</p>
            <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 1 }}>COINS</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function HallOfFame() {
  const [champions, setChampions] = useState([]);
  const [recentWins, setRecentWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: stats } = await supabase
          .from("player_stats")
          .select("user_id,wins,total_points,kills,tournaments_played")
          .gt("wins", 0)
          .order("wins", { ascending: false })
          .limit(20);

        const { data: completed } = await supabase
          .from("tournaments")
          .select("id,name,prize_coins,completed_at,winner_id")
          .eq("status", "completed")
          .not("winner_id", "is", null)
          .order("completed_at", { ascending: false })
          .limit(10);

        if (stats?.length) {
          const ids = stats.map(s => s.user_id);
          const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url,free_fire_id").in("id", ids);
          const pMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
          setChampions(stats.slice(0, 3).map(s => ({
            user_id: s.user_id,
            name: pMap[s.user_id]?.full_name || "Joueur",
            avatar_url: pMap[s.user_id]?.avatar_url,
            ff_id: pMap[s.user_id]?.free_fire_id,
            wins: s.wins,
            points: s.total_points,
          })));
        }

        if (completed?.length) {
          const wIds = completed.map(c => c.winner_id).filter(Boolean);
          const { data: wProfs } = wIds.length ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", wIds) : { data: [] };
          const wMap = Object.fromEntries((wProfs || []).map(p => [p.id, p]));
          setRecentWins(completed.map(c => ({
            ...c,
            winner_name: wMap[c.winner_id]?.full_name || "Joueur",
            winner_avatar: wMap[c.winner_id]?.avatar_url,
          })));
        }
      } catch (_) {}
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: T.text, padding: "32px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40, textAlign: "center" }}>
          <motion.div animate={{ animation: "float 3s ease-in-out infinite" }} style={{ fontSize: 64, marginBottom: 8, display: "inline-block" }}>🏆</motion.div>
          <p style={{ color: T.amber, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>⭐ LÉGENDES</p>
          <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "clamp(38px,6vw,64px)", letterSpacing: 3, margin: "0 0 12px" }}>
            HALL OF <span style={{ color: T.amber }}>FAME</span>
          </h1>
          <p style={{ color: T.text2, fontSize: 14, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Les plus grands champions de CipherPool. Leur gloire restera éternelle.
          </p>
        </motion.div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid rgba(251,191,36,0.15)`, borderTopColor: T.gold }} />
          </div>
        ) : (
          <>
            {/* Podium */}
            {champions.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                  <span style={{ color: T.amber, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3 }}>TOP CHAMPIONS ALL-TIME</span>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 16, alignItems: "end" }}>
                  <div style={{ paddingBottom: 0 }}><WinnerPodium player={champions[1]} medal={MEDAL[1]} delay={0.15} /></div>
                  <div><WinnerPodium player={champions[0]} medal={MEDAL[0]} delay={0.05} /></div>
                  <div style={{ paddingBottom: 0 }}><WinnerPodium player={champions[2]} medal={MEDAL[2]} delay={0.25} /></div>
                </div>
              </div>
            )}

            {/* Recent Tournament Winners */}
            {recentWins.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                  <span style={{ color: T.teal, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3 }}>TOURNOIS RÉCENTS</span>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {recentWins.map((w, i) => (
                    <motion.div key={w.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }}
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 13, background: T.card, border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 28, flexShrink: 0 }}>🏆</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: T.text, fontWeight: 700, fontSize: 14, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                        {w.completed_at && <p style={{ color: T.text3, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", margin: 0 }}>{new Date(w.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {w.winner_avatar ? <img src={w.winner_avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: T.gold, fontSize: 16 }}>👑</span>}
                        </div>
                        <div>
                          <p style={{ color: T.gold, fontWeight: 700, fontSize: 13, margin: 0 }}>{w.winner_name}</p>
                          {w.prize_coins > 0 && <p style={{ color: T.amber, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, margin: 0 }}>+{w.prize_coins.toLocaleString()} 💰</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {champions.length === 0 && recentWins.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.text3 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 3 }}>AUCUN CHAMPION ENCORE</p>
                <p style={{ color: T.text3, fontSize: 13, marginTop: 8 }}>Sois le premier à entrer dans l'histoire !</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
