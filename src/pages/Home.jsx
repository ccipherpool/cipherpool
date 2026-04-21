import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { motion, useInView } from "framer-motion";

/* ─── PALETTE ─────────────────────────────────────────────── */
const P = {
  bg: "#030010",
  card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  primary: "#8b3dff",
  primaryGlow: "rgba(139,61,255,0.5)",
  cyan: "#00d4ff",
  cyanGlow: "rgba(0,212,255,0.45)",
  amber: "#fbbf24",
};

/* ─── ANIMATED COUNTER ────────────────────────────────────── */
function Counter({ value, duration = 1800 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value, duration]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/* ─── PARTICLE CANVAS ─────────────────────────────────────── */
function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.00008 + 0.00003,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.y -= s.speed;
        if (s.y < 0) { s.y = 1; s.x = Math.random(); }
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

/* ─── GRADIENT CARD ───────────────────────────────────────── */
function GCard({ children, accent = P.primary, delay = 0, style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 20,
        padding: 1,
        background: hovered
          ? `linear-gradient(135deg, ${accent}60, transparent 60%)`
          : `linear-gradient(135deg, ${accent}18, transparent)`,
        transition: "all 0.35s ease",
        boxShadow: hovered ? `0 0 40px ${accent}25, 0 16px 48px rgba(0,0,0,0.5)` : "0 4px 24px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      <div style={{ borderRadius: 19, background: "rgba(10,8,25,0.92)", padding: "28px 26px", height: "100%" }}>
        {children}
      </div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: "🏆", title: "بطولات احترافية", desc: "Battle Royale & Clash Squad مع أنظمة لعب متعددة ومراحل متقدمة", accent: P.primary },
  { icon: "🛡️", title: "تحقق آمن", desc: "نظام تحقق صارم يضمن لعب نظيف ومنافسة عادلة لجميع اللاعبين", accent: P.cyan },
  { icon: "💎", title: "اقتصاد العملات", desc: "اكسب عملات يومياً، المهمات، والبطولات واستبدلها بجوائز حصرية", accent: P.amber },
  { icon: "🛡️", title: "نظام الأفواج", desc: "كوّن فريقك الأسطوري، إدارة الأدوار، والمنافسة كفريق متكامل", accent: P.primary },
  { icon: "📊", title: "ترتيب شهري", desc: "تنافس على الصدارة كل شهر وأثبت أنك الأفضل في المغرب", accent: P.cyan },
  { icon: "🎁", title: "مكافآت يومية", desc: "مهمات يومية وأسبوعية مع ستريك للإبقاء على حماسك في المنافسة", accent: P.amber },
];

const STEPS = [
  { num: "01", icon: "📝", title: "إنشاء حساب", desc: "سجل ببريدك الإلكتروني وأنشئ ملفك الشخصي في ثوانٍ", accent: P.primary },
  { num: "02", icon: "✅", title: "التحقق الفوري", desc: "حسابك فعّال فور التسجيل — ابدأ مباشرة بدون انتظار", accent: P.cyan },
  { num: "03", icon: "🏆", title: "انضم للبطولات", desc: "سجل في البطولات واربح الجوائز والعملات والمجد", accent: P.amber },
];

export default function Home() {
  const [stats, setStats] = useState({ players: 1247, tournaments: 51, online: 126, prizes: 12400 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ count: players }, { count: tournaments }] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("tournaments").select("*", { count: "exact", head: true }),
        ]);
        setStats(s => ({
          ...s,
          players: players || s.players,
          tournaments: tournaments || s.tournaments,
        }));
      } catch (_) {}
    };
    fetchStats();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: P.bg, color: "#fff", overflowX: "hidden", fontFamily: "'Space Grotesk', sans-serif" }}>
      <StarField />

      {/* ── AURORA BG ──────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-15%", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(${P.primary}18, transparent 65%)`, animation: "float1 20s ease infinite" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(${P.cyan}12, transparent 65%)`, animation: "float2 25s ease infinite" }} />
        <div style={{ position: "absolute", top: "40%", left: "40%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(${P.amber}08, transparent 65%)`, animation: "float1 30s ease infinite reverse" }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.05)} 66%{transform:translate(-40px,60px) scale(.97)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-60px,50px) scale(.97)} 66%{transform:translate(50px,-60px) scale(1.05)} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .btn-primary-home { background: linear-gradient(135deg, ${P.primary}, #4f46e5); border: none; color: #fff; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 700; border-radius: 14px; transition: all .3s; }
        .btn-primary-home:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 48px ${P.primaryGlow}; }
        .btn-outline-home { background: transparent; border: 1px solid rgba(139,61,255,.4); color: rgba(255,255,255,.8); cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 600; border-radius: 14px; transition: all .3s; }
        .btn-outline-home:hover { border-color: ${P.primary}; background: ${P.primaryGlow}10; transform: translateY(-3px); }
        .glass-home { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.07); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(24px) saturate(1.8)",
        background: "rgba(3,0,16,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 0 rgba(139,61,255,0.12)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${P.primary}, #4f46e5)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${P.primaryGlow}` }}>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 15, color: "#fff", letterSpacing: 1 }}>CP</span>
            </div>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 3, color: "#fff" }}>
              CIPHER<span style={{ color: P.primary, textShadow: `0 0 20px ${P.primaryGlow}` }}>POOL</span>
            </span>
            <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(139,61,255,.15)", border: "1px solid rgba(139,61,255,.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: P.primary, letterSpacing: 2 }}>BETA</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button className="btn-outline-home" style={{ padding: "9px 22px", fontSize: 13, letterSpacing: 1 }}>Connexion</button>
            </Link>
            <Link to="/register" style={{ textDecoration: "none" }}>
              <button className="btn-primary-home" style={{ padding: "9px 22px", fontSize: 13, letterSpacing: 1, boxShadow: `0 6px 24px ${P.primaryGlow}` }}>
                S'inscrire
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 60px" }}>

        <div style={{ maxWidth: 860, width: "100%" }}>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 99, background: "rgba(139,61,255,.12)", border: "1px solid rgba(139,61,255,.3)", marginBottom: 28 }}
          >
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>🎮</motion.span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: P.primary }}>MOROCCO'S #1 ESPORTS PLATFORM</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(56px, 10vw, 110px)", letterSpacing: 4, lineHeight: 0.95, marginBottom: 28 }}
          >
            <span style={{
              background: `linear-gradient(135deg, #fff 0%, ${P.primary} 40%, ${P.cyan} 70%, #fff 100%)`,
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gradShift 5s ease infinite",
              display: "block",
            }}>
              CIPHER
            </span>
            <span style={{ color: "#fff", display: "block" }}>POOL</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{ fontSize: "clamp(15px, 2.5vw, 20px)", color: "rgba(255,255,255,.55)", lineHeight: 1.7, marginBottom: 44, maxWidth: 580, margin: "0 auto 44px" }}
          >
            منصة البطولات الأولى في المغرب للعبة{" "}
            <span style={{ color: P.primary, fontWeight: 700 }}>Free Fire</span> و{" "}
            <span style={{ color: P.cyan, fontWeight: 700 }}>Blood Strike</span>
            <br />
            <span style={{ color: "rgba(255,255,255,.35)", fontSize: "0.88em" }}>سجل، تنافس، واكسب الجوائز</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 72 }}
          >
            <Link to="/register" style={{ textDecoration: "none" }}>
              <button className="btn-primary-home" style={{ padding: "16px 40px", fontSize: 15, letterSpacing: 2, boxShadow: `0 12px 40px ${P.primaryGlow}` }}>
                ابدأ الآن — مجاناً
              </button>
            </Link>
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button className="btn-outline-home" style={{ padding: "16px 40px", fontSize: 15, letterSpacing: 2 }}>
                دخول للحساب
              </button>
            </Link>
          </motion.div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, maxWidth: 640, margin: "0 auto" }}>
            {[
              { value: stats.players, label: "لاعب مسجل", accent: P.primary },
              { value: stats.tournaments, label: "بطولة", accent: P.cyan },
              { value: stats.online, label: "متصل الآن", accent: "#22c55e" },
              { value: stats.prizes, label: "عملة موزعة", accent: P.amber },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
                style={{
                  padding: "18px 14px", borderRadius: 16, textAlign: "center",
                  background: `rgba(255,255,255,0.03)`,
                  border: `1px solid ${s.accent}25`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
                  backdropFilter: "blur(10px)",
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`, opacity: 0.7 }} />
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 34, letterSpacing: 2, color: s.accent, lineHeight: 1, textShadow: `0 0 20px ${s.accent}60` }}>
                  <Counter value={s.value} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,.35)", marginTop: 6 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 56 }}
          >
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 4, color: `${P.primary}80`, marginBottom: 12 }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: 3, color: "#fff" }}>
              ثلاث خطوات{" "}
              <span style={{ color: P.primary, textShadow: `0 0 30px ${P.primaryGlow}` }}>للبداية</span>
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {STEPS.map((s, i) => (
              <GCard key={i} accent={s.accent} delay={i * 0.1}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 52, color: `${s.accent}18`, letterSpacing: 2, lineHeight: 1, marginBottom: 12 }}>{s.num}</div>
                <div style={{ fontSize: 40, marginBottom: 14 }}>{s.icon}</div>
                <h3 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 24, letterSpacing: 2, color: "#fff", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{s.desc}</p>
              </GCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: 56 }}
          >
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 4, color: `${P.cyan}80`, marginBottom: 12 }}>PLATFORM FEATURES</p>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: 3, color: "#fff" }}>
              لماذا{" "}
              <span style={{ color: P.cyan, textShadow: `0 0 30px ${P.cyanGlow}` }}>CipherPool</span>
              ؟
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <GCard key={i} accent={f.accent} delay={i * 0.07}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 2, color: "#fff", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", lineHeight: 1.7 }}>{f.desc}</p>
              </GCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              padding: "60px 40px",
              borderRadius: 28,
              position: "relative",
              overflow: "hidden",
              background: `radial-gradient(ellipse at 50% 0%, ${P.primary}18, transparent 70%), rgba(255,255,255,0.02)`,
              border: "1px solid rgba(139,61,255,.25)",
              boxShadow: `0 0 80px ${P.primary}12, 0 32px 80px rgba(0,0,0,.5)`,
            }}
          >
            <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg, transparent, ${P.primary}, ${P.cyan}, transparent)` }} />
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 4, color: `${P.primary}80`, marginBottom: 16 }}>JOIN THE ARENA</p>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(42px, 6vw, 68px)", letterSpacing: 4, color: "#fff", lineHeight: 1, marginBottom: 16 }}>
              مستعد للمنافسة؟
            </h2>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
              انضم لأكثر من{" "}
              <span style={{ color: P.primary, fontWeight: 700 }}>{stats.players.toLocaleString()}</span>{" "}
              لاعب وابدأ رحلتك نحو القمة الآن
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <button className="btn-primary-home" style={{ padding: "16px 44px", fontSize: 15, letterSpacing: 2, boxShadow: `0 12px 40px ${P.primaryGlow}` }}>
                  أنشئ حسابك مجاناً
                </button>
              </Link>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <button className="btn-outline-home" style={{ padding: "16px 44px", fontSize: 15, letterSpacing: 2 }}>
                  تسجيل الدخول
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "32px 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${P.primary}, #4f46e5)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 12, color: "#fff" }}>CP</span>
            </div>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,.5)" }}>
              CIPHER<span style={{ color: P.primary }}>POOL</span>
            </span>
          </div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,.2)" }}>
            © 2026 CIPHERPOOL — ALL RIGHTS RESERVED
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Tournois", "Classement", "Support"].map(l => (
              <a key={l} href="#" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,.25)", textDecoration: "none", transition: "color .2s" }}
                onMouseEnter={e => e.target.style.color = P.primary}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.25)"}>
                {l.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
