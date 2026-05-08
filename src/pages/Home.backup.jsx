import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Trophy, Shield, Zap, Users, Crown, Star, ArrowRight, ChevronRight, Play, Sword, Target, Gem, MessageSquare, TrendingUp } from "lucide-react";

/* ── Performance flag ─────────────────────────────────────────── */
const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

/* ── Color tokens ─────────────────────────────────────────────── */
const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";
const PINK   = "#ec4899";
const BG     = "#020617";
const SURF   = "#0b1020";
const CARD   = "rgba(11,16,32,0.95)";
const BORDER = "rgba(255,255,255,0.06)";

/* ── Helpers ──────────────────────────────────────────────────── */
const cx = a => `rgba(0,212,255,${a})`;
const vx = a => `rgba(139,92,246,${a})`;
const ox = a => `rgba(249,115,22,${a})`;
const gx = a => `rgba(16,185,129,${a})`;

/* ── Animated number counter ──────────────────────────────────── */
function Counter({ to, duration = 1400, suffix = "" }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const s = performance.now();
        const tick = ts => {
          const p = Math.min((ts - s) / duration, 1);
          setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString("fr-FR")}{suffix}</span>;
}

/* ── Glow Orbs Background ─────────────────────────────────────── */
function GlowBg({ reduced = false }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "10%", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${cx(.06)}, transparent 70%)`, filter: "blur(60px)" }} />
      <div style={{ position: "absolute", top: "30%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${vx(.05)}, transparent 70%)`, filter: "blur(60px)" }} />
      {!reduced && <div style={{ position: "absolute", bottom: "10%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${ox(.04)}, transparent 70%)`, filter: "blur(80px)" }} />}
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)`, backgroundSize: "60px 60px" }} />
    </div>
  );
}

/* ── Live Tournament Card ─────────────────────────────────────── */
function LiveTournamentCard() {
  const [count, setCount] = useState(47);
  useEffect(() => {
    const t = setInterval(() => setCount(c => c + Math.floor(Math.random() * 3)), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, rotate: 2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ delay: 0.5, duration: 0.8, ease: [.22, 1, .36, 1] }}
      whileHover={{ y: -6, rotate: 0 }}
      style={{ background: CARD, border: `1px solid ${cx(.2)}`, borderRadius: 24, padding: "24px", boxShadow: `0 32px 80px rgba(0,0,0,.7), 0 0 0 1px ${cx(.08)}, 0 0 60px ${cx(.04)}`, position: "relative", overflow: "hidden", width: "100%", maxWidth: 320, marginLeft: "auto" }}>
      <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${CYAN},transparent)`, position: "absolute", top: 0, left: 0, right: 0 }} />
      {/* Live badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: "50%", background: RED, boxShadow: `0 0 10px ${RED}` }} />
        <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: 2, color: RED }}>LIVE</span>
        <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>SOLO RANKED</span>
      </div>
      {/* Title */}
      <h3 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", margin: "0 0 4px" }}>Elite Cup Morocco</h3>
      <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: cx(.7), letterSpacing: 1, marginBottom: 20 }}>SAISON 3 · ROUND 2/4</p>
      {/* Prize */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1.5, marginBottom: 4 }}>PRIZE POOL</p>
          <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: CYAN, letterSpacing: 2, lineHeight: 1, textShadow: `0 0 24px ${cx(.55)}` }}>5,000 CP</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1.5, marginBottom: 4 }}>JOUEURS</p>
          <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: "#fff", letterSpacing: 2, lineHeight: 1 }}>{count}/100</p>
        </div>
      </div>
      {/* Progress */}
      <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 99, marginBottom: 16, overflow: "hidden" }}>
        <motion.div animate={{ width: `${count}%` }} transition={{ duration: 1 }}
          style={{ height: "100%", background: `linear-gradient(90deg,${CYAN},${VIOLET})`, borderRadius: 99, boxShadow: `0 0 12px ${cx(.5)}` }} />
      </div>
      {/* Players */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          {["A","B","C","D"].map((l,i) => (
            <div key={l} style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${[CYAN,VIOLET,ORANGE,GREEN][i]},rgba(0,0,0,.5))`, border: "2px solid #020617", marginLeft: i ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>{l}</div>
          ))}
        </div>
        <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 12, color: "rgba(255,255,255,.5)" }}>+{count - 4} joueurs</p>
      </div>
    </motion.div>
  );
}

/* ── Section header ───────────────────────────────────────────── */
function SectionHeader({ badge, title, desc, align = "center" }) {
  return (
    <div style={{ textAlign: align, marginBottom: 48 }}>
      {badge && (
        <motion.span initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: 2.5, color: CYAN, background: cx(.08), border: `1px solid ${cx(.25)}`, padding: "6px 16px", borderRadius: 20, marginBottom: 16 }}>
          {badge}
        </motion.span>
      )}
      <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}
        style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 800, fontSize: isMobile ? 28 : 36, color: "#fff", margin: "0 0 12px", lineHeight: 1.15 }}>
        {title}
      </motion.h2>
      {desc && (
        <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.14 }}
          style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 15, color: "rgba(255,255,255,.5)", margin: "0 auto", maxWidth: 540, lineHeight: 1.7 }}>
          {desc}
        </motion.p>
      )}
    </div>
  );
}

/* ── Tournament preview card ──────────────────────────────────── */
function TCard({ name, mode, prize, players, max, status, color, delay = 0 }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: .4 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? `linear-gradient(135deg,${color}10,${CARD})` : CARD, border: `1px solid ${hover ? color + "35" : BORDER}`, borderRadius: 20, padding: 24, cursor: "pointer", transition: "all .22s", boxShadow: hover ? `0 12px 40px rgba(0,0,0,.5),0 0 0 1px ${color}15` : "0 4px 20px rgba(0,0,0,.35)", position: "relative", overflow: "hidden" }}>
      <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)`, opacity: hover ? 1 : 0.4, transition: "opacity .22s" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: status === "live" ? RED : status === "open" ? GREEN : "rgba(255,255,255,.4)", background: status === "live" ? "rgba(244,63,94,.12)" : status === "open" ? "rgba(16,185,129,.1)" : "rgba(255,255,255,.05)", border: `1px solid ${status === "live" ? "rgba(244,63,94,.3)" : status === "open" ? "rgba(16,185,129,.25)" : "rgba(255,255,255,.1)"}`, padding: "3px 10px", borderRadius: 20, letterSpacing: 1 }}>
              {status === "live" ? "🔴 LIVE" : status === "open" ? "✅ OUVERT" : "📋 BIENTÔT"}
            </span>
            <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1 }}>{mode}</span>
          </div>
          <h3 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", margin: 0, lineHeight: 1.3 }}>{name}</h3>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1, marginBottom: 4 }}>PRIZE</p>
          <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color, lineHeight: 1, textShadow: `0 0 16px ${color}55` }}>{prize}</p>
        </div>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(players / max) * 100}%`, background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: 99 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 13, color: "rgba(255,255,255,.5)" }}>{players}/{max} joueurs</span>
        <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color, letterSpacing: 1 }}>REJOINDRE →</span>
      </div>
    </motion.div>
  );
}

/* ── Bento card ───────────────────────────────────────────────── */
function Bento({ icon: Icon, title, desc, color, span = 1, delay = 0 }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ gridColumn: `span ${span}`, background: hover ? `linear-gradient(135deg,${color}08,${CARD})` : CARD, border: `1px solid ${hover ? color + "30" : BORDER}`, borderRadius: 20, padding: 28, transition: "all .22s", boxShadow: hover ? `0 8px 32px rgba(0,0,0,.5)` : "none" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={22} color={color} />
      </div>
      <h3 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 13.5, color: "rgba(255,255,255,.45)", margin: 0, lineHeight: 1.7 }}>{desc}</p>
    </motion.div>
  );
}

/* ── Testimonial ──────────────────────────────────────────────── */
const TESTIMONIALS = [
  { name: "Ahmed Pro", role: "🏆 Gagnant Elite Cup", quote: "La seule vraie plateforme esports au Maroc. Paiements rapides, arbitres pros, je reviens à chaque saison.", avatar: "A" },
  { name: "Yassine Gamer", role: "⚔️ Chef de Clan", quote: "L'interface mobile est parfaite. On gère nos matchs de partout, zéro bug. C'est du niveau international.", avatar: "Y" },
  { name: "Sara Esports", role: "🎮 Top Streameuse", quote: "Organisation impeccable. Chaque tournoi est bien géré, les résultats sont vérifiés. C'est sérieux ici.", avatar: "S" },
];

/* ── MAIN ─────────────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [testi, setTesti] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTesti(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: BG, color: "#f8fafc", fontFamily: "Space Grotesk,sans-serif", overflowX: "hidden", position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${cx(.3)}; border-radius: 99px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-glow { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes scan { 0%{top:-100%} 100%{top:200%} }
      `}</style>

      <GlowBg reduced={isMobile} />

      {/* ══════════════ NAVBAR ══════════════ */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: "rgba(2,6,23,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff", boxShadow: `0 0 20px ${cx(.3)}` }}>CP</div>
            <span style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 1.5, color: "#fff" }}>CIPHERPOOL</span>
          </Link>
          {/* Nav links — desktop */}
          <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[["Tournois", "/login"], ["Classement", "/login"], ["Clans", "/login"], ["Store", "/login"]].map(([label, to]) => (
              <Link key={label} to={to} style={{ padding: "8px 14px", borderRadius: 10, color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,.5)"; e.currentTarget.style.background = "transparent"; }}>
                {label}
              </Link>
            ))}
          </nav>
          {/* CTA */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link to="/login" style={{ padding: "9px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.75)", fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cx(.4); e.currentTarget.style.color = CYAN; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; e.currentTarget.style.color = "rgba(255,255,255,.75)"; }}>
              Connexion
            </Link>
            <Link to="/register"
              style={{ padding: "9px 20px", borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#00d4ff)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: `0 4px 16px ${cx(.25)}`, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = ".9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}>
              Rejoindre →
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 64, position: "relative", overflow: "hidden" }}>
        {/* Scan line */}
        {!isMobile && <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${cx(.15)},transparent)`, animation: "scan 6s linear infinite", pointerEvents: "none" }} />}

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "60px 20px" : "0 40px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 60, alignItems: "center", width: "100%" }}>
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: 2.5, color: CYAN, background: cx(.07), border: `1px solid ${cx(.25)}`, padding: "6px 16px", borderRadius: 20, marginBottom: 24 }}>
                ⚡ MAROC'S #1 ESPORTS ARENA
              </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1, duration: .7 }}
              style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 800, fontSize: isMobile ? 40 : 62, lineHeight: 1.08, marginBottom: 20, letterSpacing: -1 }}>
              Free Fire Tournaments.{" "}
              <span style={{ background: `linear-gradient(135deg,${CYAN},${VIOLET})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Real Rewards.
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .22 }}
              style={{ fontSize: 16, color: "rgba(255,255,255,.55)", lineHeight: 1.8, marginBottom: 36, maxWidth: 460 }}>
              La première arène compétitive au Maroc. Rejoins des tournois Free Fire, gagne des pièces, builds ton clan et monte dans les classements.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 }}
              style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 48 }}>
              <motion.button whileHover={{ scale: 1.03, boxShadow: `0 16px 40px ${cx(.3)}` }} whileTap={{ scale: .97 }}
                onClick={() => navigate("/register")}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 14, background: `linear-gradient(135deg,#4f46e5,${CYAN})`, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 24px ${cx(.2)}` }}>
                <Play size={17} fill="#fff" /> JOUER MAINTENANT
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }}
                onClick={() => navigate("/login")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>
                <Trophy size={16} /> Voir les tournois
              </motion.button>
            </motion.div>

            {/* Mini stats */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }}
              style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {[["10K+","Joueurs",CYAN],["+500","Tournois",VIOLET],["100K","CP distribuées",ORANGE]].map(([v,l,c]) => (
                <div key={l}>
                  <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, color: c, letterSpacing: 1, lineHeight: 1, textShadow: `0 0 20px ${c}40` }}>{v}</p>
                  <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 2, marginTop: 3 }}>{l.toUpperCase()}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Live card */}
          {!isMobile && <LiveTournamentCard />}
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <section style={{ background: `linear-gradient(135deg,rgba(79,70,229,.08),rgba(0,212,255,.04))`, borderTop: "1px solid rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "36px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 32, textAlign: "center" }}>
          {[
            { val: 10000, suffix: "+", label: "JOUEURS ACTIFS", color: CYAN },
            { val: 500,   suffix: "+", label: "TOURNOIS JOUÉS", color: VIOLET },
            { val: 150,   suffix: "+", label: "CLANS CRÉÉS",    color: ORANGE },
            { val: 98,    suffix: "%", label: "SATISFACTION",   color: GREEN  },
          ].map(s => (
            <div key={s.label}>
              <motion.p whileInView={{ opacity: 1 }} initial={{ opacity: 0 }} viewport={{ once: true }}
                style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 40, color: s.color, letterSpacing: 2, lineHeight: 1, textShadow: `0 0 28px ${s.color}40` }}>
                <Counter to={s.val} suffix={s.suffix} />
              </motion.p>
              <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 2, marginTop: 6 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ FEATURED TOURNAMENTS ══════════════ */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 40px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <SectionHeader
          badge="🏆 COMPÉTITIONS"
          title="Tournois en cours"
          desc="Des tournois quotidiens pour tous les niveaux. Solo, duo et squad disponibles."
        />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 20 }}>
          <TCard name="Elite Cup Ramadan" mode="SOLO" prize="10K CP" players={87} max={100} status="live" color={CYAN} delay={.04} />
          <TCard name="Duo Champions League" mode="DUO" prize="5K CP" players={34} max={50} status="open" color={VIOLET} delay={.1} />
          <TCard name="Squad Warfare S4" mode="SQUAD" prize="20K CP" players={0} max={16} status="soon" color={ORANGE} delay={.16} />
        </div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: "center", marginTop: 32 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }}
            onClick={() => navigate("/login")}
            style={{ padding: "12px 32px", borderRadius: 14, background: "transparent", border: `1px solid ${cx(.3)}`, color: CYAN, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "JetBrains Mono,monospace", letterSpacing: 1.5 }}>
            VOIR TOUS LES TOURNOIS →
          </motion.button>
        </motion.div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section style={{ padding: isMobile ? "60px 20px" : "80px 40px", background: `linear-gradient(180deg,transparent,rgba(139,92,246,.04),transparent)`, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHeader badge="⚡ COMMENT ÇA MARCHE" title="Simple. Rapide. Compétitif." desc="En 3 étapes, tu passes du profil à la victoire." />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 24 }}>
            {[
              { step: "01", icon: "🎮", title: "Crée ton compte", desc: "Inscris-toi avec ton Free Fire ID. Ton profil est prêt en moins d'une minute.", color: CYAN },
              { step: "02", icon: "🏆", title: "Rejoins un tournoi", desc: "Choisis parmi les tournois disponibles — solo, duo ou squad. Paye les frais d'inscription en coins.", color: VIOLET },
              { step: "03", icon: "💎", title: "Gagne des récompenses", desc: "Soumets tes résultats, notre équipe vérifie, et les coins arrivent dans ton wallet instantanément.", color: ORANGE },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .1 }}
                style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 16, right: 20, fontFamily: "'Bebas Neue',cursive", fontSize: 64, color: `${s.color}08`, lineHeight: 1 }}>{s.step}</div>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${s.color}12`, border: `1px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ BENTO FEATURES ══════════════ */}
      <section style={{ padding: isMobile ? "60px 20px" : "80px 40px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <SectionHeader badge="✨ FONCTIONNALITÉS" title="Tout ce dont tu as besoin" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
          <Bento icon={Shield} title="Résultats vérifiés" desc="Chaque match est vérifié manuellement par nos admins. Aucune triche possible." color={CYAN} delay={.04} />
          <Bento icon={Gem} title="Wallet intégré" desc="Gère tes coins, achète des items, retire en temps réel via nos partenaires." color={VIOLET} delay={.08} />
          <Bento icon={Users} title="Clans & Équipes" desc="Crée ou rejoins un clan. Compétitions en équipe et classements dédiés." color={ORANGE} delay={.12} />
          <Bento icon={Trophy} title="Tournois quotidiens" desc="Des compétitions chaque jour, pour tous les niveaux et modes de jeu." color={GREEN} delay={.16} />
          <Bento icon={TrendingUp} title="Stats & Rankings" desc="Tes stats en temps réel. K/D ratio, win rate, classement national." color={PINK} delay={.20} />
          <Bento icon={MessageSquare} title="Chat global" desc="Discute avec la communauté, trouve des teammates, coordonne tes stratégies." color={CYAN} delay={.24} />
        </div>
      </section>

      {/* ══════════════ LEADERBOARD PREVIEW ══════════════ */}
      <section style={{ padding: isMobile ? "60px 20px" : "80px 40px", background: `linear-gradient(180deg,transparent,rgba(0,212,255,.03),transparent)`, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <SectionHeader badge="🏆 CLASSEMENT" title="Top Joueurs" desc="Les meilleurs de la communauté. Tu veux ton nom ici ?" />
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 12, alignItems: "center" }}>
              <Crown size={16} color={CYAN} />
              <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: 2.5, color: "rgba(255,255,255,.4)" }}>CLASSEMENT NATIONAL · SAISON 3</span>
            </div>
            {[
              { rank: 1, name: "SHADOW_FF", region: "Casablanca", wins: 47, kd: "8.2", coins: 12400, color: "#fbbf24" },
              { rank: 2, name: "VORTEX_PRO", region: "Rabat", wins: 42, kd: "7.6", coins: 9800, color: "#94a3b8" },
              { rank: 3, name: "STRIKER_MA", region: "Marrakech", wins: 38, kd: "6.9", coins: 8200, color: "#f97316" },
              { rank: 4, name: "GHOST_X", region: "Fès", wins: 35, kd: "6.2", coins: 7100, color: CYAN },
              { rank: 5, name: "APEX_MA", region: "Tanger", wins: 31, kd: "5.8", coins: 6500, color: VIOLET },
            ].map((p, i) => (
              <motion.div key={p.rank} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * .07 }}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.04)" : "none", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.02)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: p.color, minWidth: 32, textAlign: "center", textShadow: `0 0 16px ${p.color}40` }}>#{p.rank}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${p.color}30,${BG})`, border: `1px solid ${p.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: p.color }}>
                  {p.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 2 }}>{p.name}</p>
                  <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1 }}>{p.region}</p>
                </div>
                <div style={{ display: "flex", gap: 24, textAlign: "right" }}>
                  <div>
                    <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1, marginBottom: 3 }}>WINS</p>
                    <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: GREEN, lineHeight: 1 }}>{p.wins}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1, marginBottom: 3 }}>K/D</p>
                    <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: ORANGE, lineHeight: 1 }}>{p.kd}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1, marginBottom: 3 }}>COINS</p>
                    <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: CYAN, lineHeight: 1 }}>{p.coins.toLocaleString("fr-FR")}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div style={{ padding: "16px 24px", textAlign: "center" }}>
              <button onClick={() => navigate("/login")}
                style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, color: CYAN, background: "none", border: "none", cursor: "pointer", letterSpacing: 1.5 }}>
                VOIR LE CLASSEMENT COMPLET →
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section style={{ padding: isMobile ? "60px 20px" : "80px 40px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <SectionHeader badge="💬 TÉMOIGNAGES" title="Ce qu'ils disent" />
          <div style={{ position: "relative", height: 200 }}>
            <AnimatePresence mode="wait">
              {TESTIMONIALS.map((t, i) => i === testi && (
                <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  style={{ position: "absolute", inset: 0, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,.75)", lineHeight: 1.8, fontStyle: "italic" }}>"{t.quote}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${CYAN},${VIOLET})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>{t.avatar}</div>
                    <div>
                      <p style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{t.name}</p>
                      <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: 1 }}>{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setTesti(i)}
                style={{ width: i === testi ? 24 : 8, height: 8, borderRadius: 99, background: i === testi ? CYAN : "rgba(255,255,255,.15)", border: "none", cursor: "pointer", transition: "all .25s", boxShadow: i === testi ? `0 0 12px ${cx(.5)}` : "none" }} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA ══════════════ */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 40px", position: "relative", zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", background: `linear-gradient(135deg,rgba(79,70,229,.12),rgba(0,212,255,.06))`, border: `1px solid ${cx(.15)}`, borderRadius: 32, padding: isMobile ? "48px 24px" : "72px 64px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle,${cx(.1)},transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${CYAN},${VIOLET},transparent)` }} />
          <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: 2.5, color: CYAN, background: cx(.07), border: `1px solid ${cx(.2)}`, padding: "5px 16px", borderRadius: 20, display: "inline-block", marginBottom: 20 }}>
            ⚡ REJOINS L'ARÈNE
          </span>
          <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 800, fontSize: isMobile ? 30 : 48, color: "#fff", lineHeight: 1.1, marginBottom: 16, position: "relative" }}>
            Prêt à devenir le meilleur<br />du Maroc ?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.5)", marginBottom: 36, lineHeight: 1.7, position: "relative" }}>
            Des milliers de joueurs t'attendent. Inscris-toi gratuitement et commence ton journey compétitif aujourd'hui.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <motion.button whileHover={{ scale: 1.04, boxShadow: `0 20px 48px ${cx(.3)}` }} whileTap={{ scale: .97 }}
              onClick={() => navigate("/register")}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 32px", borderRadius: 16, background: `linear-gradient(135deg,#4f46e5,${CYAN})`, border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 28px ${cx(.2)}` }}>
              <Play size={18} fill="#fff" /> CRÉER MON COMPTE
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}
              onClick={() => navigate("/login")}
              style={{ padding: "15px 28px", borderRadius: 16, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              J'ai déjà un compte
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "32px 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#fff" }}>CP</div>
          <span style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: "rgba(255,255,255,.6)" }}>CIPHERPOOL</span>
        </div>
        <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: 1 }}>
          © 2026 CipherPool · Maroc's Premier Free Fire Platform · All rights reserved
        </p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16 }}>
          {[["Telegram","https://t.me/cipherpool"],["Discord","#"]].map(([label,href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,.3)", textDecoration: "none", letterSpacing: 1, transition: "color .15s" }}
              onMouseEnter={e => e.currentTarget.style.color = CYAN}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
