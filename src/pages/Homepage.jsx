import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n ?? 0);
const accent = "#7c3aed";
const accentCyan = "#06b6d4";
const red = "#ef4444";

// ─── COUNTDOWN HOOK ───────────────────────────────────────────────────────────
function useCountdown(target) {
  const [secs, setSecs] = useState(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(target) - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (secs === null) return null;
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    open:        { label: "🟢 OUVERT",   color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    in_progress: { label: "🔴 LIVE",     color: red,       bg: "rgba(239,68,68,0.12)" },
    full:        { label: "🔒 COMPLET",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  };
  const c = cfg[status] || cfg.open;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: c.color,
      background: c.bg, padding: "3px 10px", borderRadius: 99 }}>
      {c.label}
    </span>
  );
}

// ─── TOURNAMENT CARD ──────────────────────────────────────────────────────────
function TournamentCard({ t, index, user }) {
  const nav = useNavigate();
  const pct = t.max_players > 0 ? Math.round((t.current_players / t.max_players) * 100) : 0;
  const almostFull = pct >= 80 && pct < 100;
  const isFree = !t.entry_fee || t.entry_fee === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={() => nav(user ? `/tournaments/${t.id}` : "/register")}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${t.status === "in_progress" ? red + "44" : "rgba(124,58,237,0.2)"}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.2s",
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top accent line */}
      <div style={{ height: 3, background: t.status === "in_progress"
        ? `linear-gradient(90deg,${red},#f97316)`
        : `linear-gradient(90deg,${accent},${accentCyan})` }} />

      {/* Badges */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {almostFull && (
          <span style={{ fontSize: 9, fontWeight: 800, color: "#f59e0b",
            background: "rgba(245,158,11,0.15)", padding: "3px 8px", borderRadius: 99 }}>
            🔥 PRESQUE COMPLET
          </span>
        )}
        {isFree && (
          <span style={{ fontSize: 9, fontWeight: 800, color: "#22c55e",
            background: "rgba(34,197,94,0.12)", padding: "3px 8px", borderRadius: 99 }}>
            🆓 GRATUIT
          </span>
        )}
      </div>

      <div style={{ padding: "14px 16px" }}>
        <div style={{ marginBottom: 10 }}>
          <StatusBadge status={t.status} />
        </div>

        <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 800,
          color: "#fff", margin: "0 0 10px", lineHeight: 1.2, paddingRight: 80 }}>
          {t.name}
        </h3>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            🏆 <strong style={{ color: "#fbbf24" }}>{fmt(t.prize_coins)}</strong> coins
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            👥 {t.current_players}/{t.max_players}
          </span>
          {t.entry_fee > 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              💰 {t.entry_fee} coins
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: index * 0.07 + 0.2 }}
            style={{
              height: "100%",
              background: pct >= 80 ? `linear-gradient(90deg,${red},#f97316)` : `linear-gradient(90deg,${accent},${accentCyan})`,
              borderRadius: 99,
            }}
          />
        </div>

        {/* CTA */}
        <button
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
            cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13,
            fontWeight: 800, letterSpacing: 0.5, transition: "all 0.2s",
            background: t.status === "in_progress"
              ? `linear-gradient(135deg,${red},#f97316)`
              : `linear-gradient(135deg,${accent},${accentCyan})`,
            color: "#fff",
            boxShadow: t.status === "in_progress"
              ? "0 4px 20px rgba(239,68,68,0.3)"
              : "0 4px 20px rgba(124,58,237,0.3)",
          }}
          onClick={e => { e.stopPropagation(); nav(user ? `/tournaments/${t.id}` : "/register"); }}
        >
          {t.status === "in_progress" ? "🔴 Rejoindre LIVE" : "⚡ Rejoindre"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Homepage() {
  const nav = useNavigate();
  const [user, setUser]               = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats]             = useState({ players: 0, tournaments: 0, prizePool: 0 });
  const [onlineCount, setOnlineCount] = useState(0);
  const [nextTournoi, setNextTournoi] = useState(null);
  const [menuOpen, setMenuOpen]       = useState(false);

  const countdown = useCountdown(nextTournoi?.start_date || null);

  useEffect(() => {
    let presenceCh;

    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      if (u) {
        presenceCh = supabase
          .channel("home-presence-v2", { config: { presence: { key: u.id } } })
          .on("presence", { event: "sync" }, () => {
            setOnlineCount(Object.keys(presenceCh.presenceState()).length);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") await presenceCh.track({ user_id: u.id, at: Date.now() });
          });
      }

      // Tournaments actifs
      const { data: trn } = await supabase
        .from("tournaments")
        .select("id,name,status,max_players,current_players,prize_coins,entry_fee,start_date,game_type,mode")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(6);
      setTournaments(trn ?? []);

      // Prochain tournoi avec countdown
      const openTrn = trn?.find(t => t.status === "open" && t.start_date);
      setNextTournoi(openTrn || null);

      // Leaderboard top 3
      const { data: lb } = await supabase
        .from("player_stats")
        .select("user_id, total_points, wins, kills")
        .gt("tournaments_played", 0)
        .order("total_points", { ascending: false })
        .limit(3);

      if (lb?.length) {
        const ids = lb.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, free_fire_id")
          .in("id", ids);
        const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        setLeaderboard(lb.map((s, i) => ({ ...s, ...pMap[s.user_id], rank: i + 1 })));
      }

      // Stats globales
      const [pRes, tRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
      ]);
      let prize = 0;
      try {
        const { data: pd } = await supabase.from("tournaments").select("prize_coins");
        prize = pd?.reduce((s, t) => s + (t.prize_coins ?? 0), 0) ?? 0;
      } catch {}
      setStats({ players: pRes.count ?? 0, tournaments: tRes.count ?? 0, prizePool: prize });
    })();

    return () => { if (presenceCh) supabase.removeChannel(presenceCh); };
  }, []);

  const rankEmoji = r => r === 1 ? "👑" : r === 2 ? "🥈" : "🥉";

  return (
    <div style={{ minHeight: "100vh", background: "#050508", color: "#fff",
      fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 99px; }
        @keyframes pulse-online {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .hp-section { padding: clamp(40px,8vw,80px) clamp(16px,5vw,40px); max-width: 900px; margin: 0 auto; }
        .hp-section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
          color: ${accent}; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
        }
        .hp-section-label::before { content: ''; width: 20px; height: 2px; background: ${accent}; }
        .hp-title {
          font-size: clamp(24px,5vw,40px); font-weight: 900; line-height: 1.1; margin: 0 0 8px;
        }
        .hp-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg,${accent},${accentCyan});
          color: #fff; border: none; border-radius: 12px; cursor: pointer;
          font-family: 'Inter',sans-serif; font-weight: 800; font-size: 15px;
          padding: 15px 28px; transition: all 0.2s; letter-spacing: 0.3px;
          box-shadow: 0 6px 28px rgba(124,58,237,0.4);
        }
        .hp-btn-primary:active { transform: scale(0.97); }
        .hp-btn-outline {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; cursor: pointer;
          font-family: 'Inter',sans-serif; font-weight: 700; font-size: 14px;
          padding: 14px 24px; transition: all 0.2s;
        }
        .hp-btn-outline:active { transform: scale(0.97); background: rgba(255,255,255,0.08); }
      `}</style>

      {/* ══ TOPBAR ═══════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(5,5,8,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px,5vw,40px)", height: 60,
      }}>
        {/* Logo */}
        <div onClick={() => nav("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: `linear-gradient(135deg,${accent},${accentCyan})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 14, boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
          }}>CP</div>
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>
            CIPHER<span style={{ color: accent }}>POOL</span>
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Online badge */}
          {onlineCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
              padding: "5px 10px", borderRadius: 99 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
                animation: "pulse-online 2s infinite", display: "block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e" }}>{onlineCount}</span>
            </div>
          )}

          {user ? (
            <button onClick={() => nav("/dashboard")} className="hp-btn-primary"
              style={{ padding: "9px 18px", fontSize: 13 }}>
              Mon espace →
            </button>
          ) : (
            <>
              <button onClick={() => nav("/login")} className="hp-btn-outline"
                style={{ padding: "9px 16px", fontSize: 13 }}>
                Connexion
              </button>
              <button onClick={() => nav("/register")} className="hp-btn-primary"
                style={{ padding: "9px 18px", fontSize: 13 }}>
                S'inscrire
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ══ SCREEN 1 — HERO ══════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "calc(100svh - 60px)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "clamp(32px,8vw,80px) clamp(16px,5vw,40px)",
        position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(124,58,237,0.08) 0%, transparent 70%)",
      }}>
        {/* BG grid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)`,
          backgroundSize: "50px 50px" }} />

        <div style={{ position: "relative", maxWidth: 700, animation: "fadeUp 0.7s ease both" }}>
          {/* Tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
            background: `rgba(124,58,237,0.12)`, border: `1px solid rgba(124,58,237,0.25)`,
            padding: "6px 14px", borderRadius: 99 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent,
              animation: "pulse-online 2s infinite", display: "block" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 0.5 }}>
              Platform eSport #1 Maroc
            </span>
          </div>

          {/* Headline */}
          <h1 className="hp-title" style={{ marginBottom: 16 }}>
            Dkhol l'arène.{" "}
            <span style={{
              background: `linear-gradient(135deg,${accent},${accentCyan})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Wrrihm chkun nta.</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(14px,3vw,17px)", color: "rgba(255,255,255,0.55)",
            lineHeight: 1.65, maxWidth: 520, marginBottom: 32 }}>
            Tournois Free Fire, rewards, classement live — kol chi mn téléphone dyalk.
            Inscription rapide, cash prizes, w communauté gaming 🇲🇦.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <button className="hp-btn-primary" onClick={() => nav(user ? "/tournaments" : "/register")}
              style={{ flex: "1 1 160px", maxWidth: 240 }}>
              🚀 Bda Daba
            </button>
            <button className="hp-btn-outline" onClick={() => nav("/tournaments")}
              style={{ flex: "1 1 140px", maxWidth: 220 }}>
              🏆 Chof Tournois
            </button>
          </div>

          {/* Social proof chips */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { icon: "🔥", val: `+${fmt(stats.players)}`, label: "joueurs" },
              { icon: "🏆", val: fmt(stats.tournaments), label: "tournois" },
              { icon: "🟢", val: onlineCount > 0 ? onlineCount : "...", label: "en ligne" },
            ].map(({ icon, val, label }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                padding: "8px 14px", borderRadius: 10,
              }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{val}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.2)" }}>SCROLL</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 1, height: 30, background: `linear-gradient(${accent},transparent)` }} />
        </div>
      </section>

      {/* ══ SCREEN 2 — TOURNOIS ACTIFS ═══════════════════════════════════════ */}
      <section className="hp-section">
        <div className="hp-section-label">🎮 Action Immédiate</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h2 className="hp-title">Tournois kaynin daba</h2>
          <button onClick={() => nav("/tournaments")} className="hp-btn-outline"
            style={{ padding: "9px 18px", fontSize: 13 }}>
            Voir tout →
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏟️</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, marginBottom: 16 }}>
              Pas encore de tournois actifs
            </p>
            <button className="hp-btn-primary" onClick={() => nav("/register")}>
              S'inscrire pour être notifié
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(300px,100%),1fr))", gap: 14 }}>
            {tournaments.map((t, i) => (
              <TournamentCard key={t.id} t={t} index={i} user={user} />
            ))}
          </div>
        )}
      </section>

      {/* ══ SCREEN 3 — COUNTDOWN PROCHAIN TOURNOI ════════════════════════════ */}
      {nextTournoi && countdown && (
        <section style={{ padding: "clamp(32px,6vw,60px) clamp(16px,5vw,40px)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                background: `linear-gradient(135deg, rgba(239,68,68,0.08), rgba(124,58,237,0.08))`,
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 20, padding: "clamp(24px,5vw,40px)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 24,
              }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: red, marginBottom: 8 }}>
                  ⏳ PROCHAIN TOURNOI
                </div>
                <h3 style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 900, color: "#fff", margin: "0 0 6px" }}>
                  {nextTournoi.name}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  💰 {fmt(nextTournoi.prize_coins)} coins · 👥 {nextTournoi.current_players}/{nextTournoi.max_players}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(32px,7vw,52px)",
                  fontWeight: 900, color: red, letterSpacing: 2,
                  textShadow: "0 0 30px rgba(239,68,68,0.5)" }}>
                  {countdown}
                </div>
                <button className="hp-btn-primary" onClick={() => nav(user ? `/tournaments/${nextTournoi.id}` : "/register")}
                  style={{ padding: "12px 28px", fontSize: 14 }}>
                  🎯 Réserver ma place
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══ SCREEN 4 — POURQUOI JOUER ICI ════════════════════════════════════ */}
      <section className="hp-section">
        <div className="hp-section-label">💎 La valeur</div>
        <h2 className="hp-title" style={{ marginBottom: 28 }}>3lach تلعب هنا؟</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(200px,100%),1fr))", gap: 12 }}>
          {[
            { icon: "🏆", title: "Tournois chaque semaine", desc: "Battle Royale, Clash Squad, Solo, Duo, Squad" },
            { icon: "💰", title: "Rba7 coins & rewards", desc: "Cash prizes, récompenses exclusives, bonus quotidiens" },
            { icon: "🧑‍🤝‍🧑", title: "L3ab m3a team", desc: "Crée ton équipe, recrute, et montez ensemble" },
            { icon: "📊", title: "Tla3 f classement", desc: "Ranking live, stats détaillées, ton niveau réel" },
          ].map(({ icon, title, desc }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(124,58,237,0.15)",
                borderRadius: 16, padding: "20px 18px",
                transition: "border-color 0.2s",
              }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: "#fff", margin: "0 0 6px" }}>{title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ SCREEN 5 — TOP JOUEURS ════════════════════════════════════════════ */}
      {leaderboard.length > 0 && (
        <section className="hp-section">
          <div className="hp-section-label">🔥 Compétition</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h2 className="hp-title">Top joueurs aujourd'hui</h2>
            <button onClick={() => nav("/leaderboard")} className="hp-btn-outline"
              style={{ padding: "9px 18px", fontSize: 13 }}>
              Classement complet →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leaderboard.map((p, i) => (
              <motion.div key={p.user_id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                onClick={() => nav("/leaderboard")}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "14px 18px", borderRadius: 14, cursor: "pointer",
                  background: i === 0 ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${i === 0 ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)"}`,
                  transition: "background 0.15s",
                }}>
                {/* Rank */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: i === 0 ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {rankEmoji(p.rank)}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: p.avatar_url ? "transparent" : `linear-gradient(135deg,${accent},${accentCyan})`,
                  overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 16,
                }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (p.full_name?.[0] || "?")}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "#fff", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.full_name || "Joueur"}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>
                    FF: {p.free_fire_id || "—"}
                  </p>
                </div>

                {/* Points */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontWeight: 900, fontSize: 17,
                    color: i === 0 ? "#fbbf24" : accent, margin: 0 }}>
                    {(p.total_points || 0).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>pts</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ══ SCREEN 6 — HOW IT WORKS ══════════════════════════════════════════ */}
      <section className="hp-section">
        <div className="hp-section-label">✅ Simple</div>
        <h2 className="hp-title" style={{ marginBottom: 28 }}>Kifach تلعب؟</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 24, top: 48, bottom: 48, width: 2,
            background: `linear-gradient(${accent},${accentCyan})`, opacity: 0.25 }} />

          {[
            { num: "01", icon: "✍️", title: "Créer compte", desc: "Inscription gratuite en 2 minutes avec ton Free Fire ID" },
            { num: "02", icon: "🎮", title: "Rejoindre tournoi", desc: "Choisis ton tournoi, envoie ta demande, attends l'approbation" },
            { num: "03", icon: "🏆", title: "Gagner rewards", desc: "Joue, soumets ton résultat avec screenshot, gagne coins & prizes" },
          ].map(({ num, icon, title, desc }, i) => (
            <motion.div key={num}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ display: "flex", gap: 20, padding: "20px 0", alignItems: "flex-start" }}>
              {/* Step circle */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg,${accent},${accentCyan})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, boxShadow: `0 4px 20px rgba(124,58,237,0.3)`,
                position: "relative", zIndex: 1,
              }}>
                {icon}
              </div>

              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 1, marginBottom: 4 }}>
                  STEP {num}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 17, color: "#fff", margin: "0 0 6px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ SCREEN 7 — FINAL CTA ═════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(48px,8vw,80px) clamp(16px,5vw,40px)" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            maxWidth: 700, margin: "0 auto", textAlign: "center",
            background: `linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.08))`,
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: 24, padding: "clamp(32px,6vw,56px) clamp(20px,5vw,48px)",
          }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🎮</div>
          <h2 style={{ fontSize: "clamp(24px,5vw,38px)", fontWeight: 900,
            margin: "0 0 12px", lineHeight: 1.15 }}>
            Wach wajed{" "}
            <span style={{
              background: `linear-gradient(135deg,${accent},${accentCyan})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>تربح؟</span>
          </h2>
          <p style={{ fontSize: "clamp(14px,3vw,16px)", color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6, marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
            Rejoins des milliers de joueurs Free Fire. Tournois, classements, rewards — kol chi mne l'arena.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="hp-btn-primary" onClick={() => nav(user ? "/tournaments" : "/register")}
              style={{ flex: "1 1 160px", maxWidth: 240, padding: "16px 28px", fontSize: 16 }}>
              🚀 Bda Daba
            </button>
            {!user && (
              <button className="hp-btn-outline" onClick={() => nav("/login")}
                style={{ flex: "1 1 140px", maxWidth: 200 }}>
                Déjà inscrit →
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "clamp(24px,5vw,40px) clamp(16px,5vw,40px)",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `linear-gradient(135deg,${accent},${accentCyan})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 11,
          }}>CP</div>
          <span style={{ fontWeight: 900, fontSize: 15 }}>
            CIPHER<span style={{ color: accent }}>POOL</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {[
            ["Tournois", "/tournaments"], ["Classement", "/leaderboard"],
            ["Équipes", "/teams"], ["Actualités", "/news"],
          ].map(([label, path]) => (
            <button key={label} onClick={() => nav(path)}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: 13, padding: 0,
                transition: "color 0.15s", fontFamily: "'Inter',sans-serif" }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.4)"}>
              {label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>
          © 2026 CipherPool · Platform eSport Free Fire Maroc 🇲🇦
        </p>
      </footer>

      {/* ══ STICKY BOTTOM CTA (mobile only) ══════════════════════════════════ */}
      {!user && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          padding: "12px 16px",
          background: "rgba(5,5,8,0.95)", backdropFilter: "blur(20px)",
          borderTop: `1px solid rgba(124,58,237,0.2)`,
          display: "none",  // shown via CSS
        }}
          className="sticky-mobile-cta"
        >
          <button className="hp-btn-primary" onClick={() => nav("/register")}
            style={{ width: "100%", padding: "15px", fontSize: 15 }}>
            🎮 Rejoindre Tournoi — Gratuit
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sticky-mobile-cta { display: block !important; }
          .hp-section { padding-bottom: 90px !important; }
        }
      `}</style>
    </div>
  );
}