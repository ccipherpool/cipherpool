import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Shield, Zap, ArrowRight, Sparkles,
  Swords, Globe, Crown, Menu, X, Star,
  Users, TrendingUp, ChevronDown, ArrowUpRight,
  Coffee, GitBranch, Flame
} from "lucide-react";
import { ContainerScroll } from "../components/ui/ContainerScroll";
import { useCountUp } from "../hooks/useCountUp";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { use3DTilt } from "../hooks/use3DTilt";

const FlowArt     = lazy(() => import("../components/ui/FlowArt"));
const FlowSection = lazy(() => import("../components/ui/FlowArt").then(m => ({ default: m.FlowSection })));

// ── Pre-computed configs (stable, no Math.random on render) ──────────
const MATRIX_CFG = [...Array(10)].map((_, i) => ({
  left:     `${(i * 9.7 + 3) % 100}%`,
  height:   `${80 + (i * 23) % 100}px`,
  duration: 2.2 + i * 0.3,
  delay:    (i * 0.5) % 2.5,
  color:    i % 3 === 0 ? '#8B5CF6' : i % 3 === 1 ? '#06B6D4' : '#A78BFA',
}));

const PARTICLE_CFG = [...Array(20)].map((_, i) => ({
  size:     `${1.5 + (i * 0.22) % 3.5}px`,
  color:    i % 4 === 0 ? '#8B5CF6' : i % 4 === 1 ? '#06B6D4' : i % 4 === 2 ? '#F59E0B' : '#A78BFA',
  left:     `${(i * 5.1 + 2) % 100}%`,
  top:      `${(i * 4.7 + 8) % 100}%`,
  duration: 2.5 + (i * 0.22) % 3.5,
  delay:    (i * 0.35) % 5,
  xOffset:  (i % 2 === 0 ? 1 : -1) * ((i * 1.3) % 12),
}));

// ── Background effects ───────────────────────────────────────────────
const MatrixRain = () => (
  <div className="absolute inset-0 overflow-hidden opacity-25 pointer-events-none">
    {MATRIX_CFG.map((cfg, i) => (
      <motion.div
        key={i}
        className="absolute top-0 w-px"
        style={{
          left: cfg.left,
          height: cfg.height,
          background: `linear-gradient(to bottom, transparent, ${cfg.color}80, transparent)`,
          willChange: 'transform',
        }}
        animate={{ y: ['0vh', '105vh'], opacity: [0, 0.9, 0] }}
        transition={{ duration: cfg.duration, repeat: Infinity, delay: cfg.delay, ease: "linear" }}
      />
    ))}
  </div>
);

const FloatingParticles = () => (
  <div className="absolute inset-0 pointer-events-none">
    {PARTICLE_CFG.map((p, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: p.size, height: p.size,
          background: p.color,
          left: p.left, top: p.top,
          boxShadow: `0 0 6px ${p.color}`,
          willChange: 'transform, opacity',
        }}
        animate={{ y: [0, -24, 0], x: [0, p.xOffset, 0], opacity: [0, 0.9, 0], scale: [0, 1.4, 0] }}
        transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
      />
    ))}
  </div>
);

// ── Animated counter for hero stats ──────────────────────────────────
function HeroStat({ icon: Icon, value, suffix = '', label, delay }) {
  const { ref, visible } = useScrollReveal();
  const num = useCountUp(parseInt(value) || 0, { duration: 1600, enabled: visible });
  const { ref: tilt, onMouseMove, onMouseLeave } = use3DTilt({ max: 8 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 260 }}
    >
      <div
        ref={tilt}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="luxury-card p-6 text-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="w-10 h-10 rounded-xl bg-cyber-dim flex items-center justify-center mx-auto mb-3">
          <Icon size={20} className="text-cyber-400" />
        </div>
        <div className="font-heading text-3xl font-black text-white leading-none mb-1">
          {visible ? num.toLocaleString() : '0'}{suffix}
        </div>
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/35">{label}</div>
      </div>
    </motion.div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────
const FEATURE_ACCENTS = ['cyber', 'cyan', 'gold', 'cyber', 'cyan', 'gold'];
const FEATURE_ICON_BG = [
  'bg-cyber-dim text-cyber-400',
  'bg-cyan-dim  text-neon-cyan',
  'bg-gold-dim  text-cyber-gold',
  'bg-cyber-dim text-cyber-400',
  'bg-cyan-dim  text-neon-cyan',
  'bg-gold-dim  text-cyber-gold',
];

function FeatureCard({ icon: Icon, title, description, index }) {
  const { ref: tilt, onMouseMove, onMouseLeave } = use3DTilt({ max: 10 });
  const { ref, visible } = useScrollReveal();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 3) * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={tilt}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={`luxury-card luxury-card-${FEATURE_ACCENTS[index] === 'cyber' ? '' : FEATURE_ACCENTS[index]} p-7`}
        style={{ transformStyle: 'preserve-3d', height: '100%' }}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${FEATURE_ICON_BG[index]}`}>
          <Icon size={24} />
        </div>
        <h3 className="font-heading text-base font-black tracking-tight text-white mb-3">{title}</h3>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrolled(window.scrollY > 50); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: Shield,     title: "Sécurité Maximale",  description: "IA anti-triche en temps réel. Chaque match est audité. Intégrité garantie à 99.9%." },
    { icon: Zap,        title: "Récompenses Flash",   description: "Wallet intégré. Gains instantanés après chaque victoire. Zéro délai, zéro friction." },
    { icon: Globe,      title: "Réseau Puissant",     description: "15 000+ joueurs marocains. Clans, teams, communauté solide et compétitive." },
    { icon: Trophy,     title: "Tournois Premium",    description: "Compétitions quotidiennes avec prize pools attractifs. Du casual au niveau pro." },
    { icon: Users,      title: "Guerre de Clans",     description: "Clans vs clans dans des batailles épiques. Montez dans le classement national." },
    { icon: TrendingUp, title: "Stats Live",           description: "K/D, win rate, progression ELO. Analysez vos performances en temps réel." },
  ];

  const testimonials = [
    { quote: "CipherPool a révolutionné ma façon de jouer. Les récompenses sont instantanées, c'est incroyable !", name: "Yassine B.", role: "Pro Player" },
    { quote: "La meilleure plateforme de tournois au Maroc. L'anti-triche est vraiment efficace.", name: "Laila M.", role: "Chef de Clan" },
    { quote: "Une communauté incroyable et des tournois bien organisés. Je recommande à 100% !", name: "Amine K.", role: "Streamer" },
  ];

  return (
    <div className="relative min-h-screen bg-cp-base text-white overflow-x-hidden">

      {/* ── Global ambient background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb-cyber w-[700px] h-[700px] top-[-200px] left-[-200px]" />
        <div className="orb-cyan w-[500px] h-[500px] bottom-[-100px] right-[-100px]" />
        <div className="cyber-grid absolute inset-0 opacity-60" />
        <img
          src="/logo.png"
          aria-hidden="true"
          fetchpriority="low"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-[720px] min-w-[300px] select-none"
          style={{ opacity: 0.03, mixBlendMode: 'screen', filter: 'grayscale(0.2) blur(0.5px)' }}
          alt=""
        />
        <MatrixRain />
        <FloatingParticles />
      </div>

      {/* ── Navigation ── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-cp-s1/90 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-transparent'
        }`}
      >
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-500 to-cyber-700 flex items-center justify-center shadow-lg shadow-cyber-glow group-hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all duration-300">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-heading font-black text-xl tracking-tight">
              CIPHER<span className="text-cyber">POOL</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {[['Tournois', '/tournaments'], ['Classement', '/leaderboard'], ['Clans', '/clans'], ['Store', '/store']].map(([label, to]) => (
              <Link
                key={label}
                to={to}
                className="relative px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 hover:text-white transition-colors group"
              >
                {label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-gradient-to-r from-cyber to-neon-cyan group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:block cyber-btn cyber-btn-ghost cyber-btn-sm"
            >
              Connexion
            </button>
            <button
              onClick={() => navigate("/register")}
              className="cyber-btn cyber-btn-primary cyber-btn-sm"
            >
              <Swords size={13} />
              Rejoindre
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/60 hover:text-white"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 left-0 right-0 z-40 command-panel m-3 p-5 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {[['Tournois', '/tournaments'], ['Classement', '/leaderboard'], ['Clans', '/clans'], ['Store', '/store']].map(([label, to]) => (
                <Link
                  key={label}
                  to={to}
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-4 md:px-8 overflow-hidden pt-16">
        <div className="relative z-10 text-center max-w-6xl mx-auto w-full">

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
            style={{
              background: 'rgba(139,92,246,0.10)',
              border: '1px solid rgba(139,92,246,0.30)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-cyber-400"
            />
            <Flame size={12} className="text-cyber-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyber-400">
              Plateforme #1 Esport Marocain
            </span>
          </motion.div>

          {/* Main title */}
          <div className="overflow-hidden mb-4">
            <motion.h1
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading text-[clamp(52px,10vw,120px)] font-black leading-[0.9] tracking-tight text-white"
            >
              ASCENDEZ
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading text-[clamp(52px,10vw,120px)] font-black leading-[0.9] tracking-tight text-cyber"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #8B5CF6 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'border-rotate 4s ease-in-out infinite',
              }}
            >
              VERS LA GLOIRE
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="text-base md:text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Plongez dans l'arène ultime du gaming compétitif.
            <br />
            <span className="text-white/70 font-semibold">Tournois · Récompenses · Gloire</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate("/register")}
              className="cyber-btn cyber-btn-primary cyber-btn-lg group"
            >
              <Swords size={18} />
              REJOINDRE L'ARÈNE
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/tournaments")}
              className="cyber-btn cyber-btn-ghost cyber-btn-lg"
            >
              <Trophy size={16} />
              VOIR LES TOURNOIS
              <ArrowUpRight size={14} />
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto"
          >
            <HeroStat icon={Users}    value={15000} suffix="+" label="Joueurs Actifs" delay={0}    />
            <HeroStat icon={Trophy}   value={800}   suffix="+" label="Tournois/Mois"  delay={0.1}  />
            <HeroStat icon={Shield}   value={99}    suffix="%" label="Anti-Triche"    delay={0.2}  />
            <HeroStat icon={Zap}      value={1}     suffix="s" label="Récompenses"    delay={0.3}  />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown size={20} className="text-cyber-400/60" />
          </motion.div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/20">Scroll</span>
        </motion.div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="relative py-28 px-4 md:px-8">
        {/* Section ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-cyber w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[10px] font-black tracking-[0.4em] uppercase text-cyber-400/60 mb-3">Pourquoi CipherPool</p>
            <h2 className="font-heading text-[clamp(32px,6vw,64px)] font-black tracking-tight text-white">
              L'ARME ULTIME
              <br />
              <span className="text-cyber">DU GAMER MAROCAIN</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CINEMATIC FLOW ══════════ */}
      <section className="relative z-10">
        <Suspense fallback={<div className="h-[60vh]" />}>
          <FlowArt>
            <FlowSection className="bg-cp-s1">
              <div className="flex flex-col justify-center h-full max-w-4xl mx-auto px-8">
                <span className="text-cyber-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Phase 01</span>
                <h2 className="font-heading text-[clamp(36px,7vw,80px)] font-black text-white uppercase tracking-tight leading-none mb-6">
                  CHOISISSEZ<br />
                  <span className="text-cyber">VOTRE ARÈNE</span>
                </h2>
                <p className="text-base text-white/40 max-w-xl leading-relaxed">
                  Des centaines de tournois quotidiens sur Free Fire et plus. Trouvez la compétition qui vous correspond.
                </p>
              </div>
            </FlowSection>
            <FlowSection className="bg-cp-s2">
              <div className="flex flex-col justify-center h-full max-w-4xl mx-auto px-8 text-right items-end">
                <span className="text-neon-gold font-black text-[10px] uppercase tracking-[0.4em] mb-4">Phase 02</span>
                <h2 className="font-heading text-[clamp(36px,7vw,80px)] font-black text-white uppercase tracking-tight leading-none mb-6">
                  ENGAGEZ LE<br />
                  <span className="text-cyan-glow">COMBAT</span>
                </h2>
                <p className="text-base text-white/40 max-w-xl leading-relaxed">
                  Affrontez les meilleurs joueurs dans une arène sécurisée. Notre IA veille sur chaque duel.
                </p>
              </div>
            </FlowSection>
            <FlowSection className="bg-cp-base">
              <div className="flex flex-col justify-center h-full max-w-4xl mx-auto px-8">
                <span className="text-neon-cyan font-black text-[10px] uppercase tracking-[0.4em] mb-4">Phase 03</span>
                <h2 className="font-heading text-[clamp(36px,7vw,80px)] font-black text-white uppercase tracking-tight leading-none mb-6">
                  SÉCURISEZ<br />
                  <span className="text-fire">VOTRE GLOIRE</span>
                </h2>
                <p className="text-base text-white/40 max-w-xl leading-relaxed">
                  Gains instantanés sur votre wallet. Montez dans le Hall of Fame. Devenez une légende.
                </p>
              </div>
            </FlowSection>
          </FlowArt>
        </Suspense>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="relative py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-[10px] font-black tracking-[0.4em] uppercase text-cyan-400/60 mb-3">Ce qu'ils disent</p>
            <h2 className="font-heading text-[clamp(28px,5vw,56px)] font-black tracking-tight text-white">
              PAROLE DE <span className="text-cyber">GUERRIERS</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="luxury-card p-7"
              >
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/50 mb-7 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-500 to-neon-cyan flex items-center justify-center text-white font-black text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/30">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CONTAINER SCROLL SHOWCASE ══════════ */}
      <section className="relative py-16 overflow-hidden">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-black tracking-[0.4em] uppercase text-cyber-400/60 mb-3">Interface Tactique</p>
              <h2 className="font-heading text-[clamp(28px,6vw,64px)] font-black text-white leading-tight uppercase tracking-tight">
                L'EXPÉRIENCE<br />
                <span className="text-cyber">ULTIME DU GAMING</span>
              </h2>
            </div>
          }
        >
          <div className="relative h-full w-full bg-cp-s1 rounded-2xl overflow-hidden border border-white/[0.07]">
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070"
              className="w-full h-full object-cover opacity-50"
              loading="lazy"
              decoding="async"
              alt="Dashboard Preview"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cp-s1 via-cp-s1/30 to-transparent" />
            <div className="absolute bottom-7 left-7 right-7 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black text-cyber-400 uppercase tracking-[0.4em] mb-1.5">Operational Grid</p>
                <h3 className="font-heading text-xl font-black text-white uppercase tracking-tight">DASHBOARD V4.0</h3>
              </div>
              <div className="flex gap-3">
                <div className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-[11px] font-bold text-neon-green uppercase">Optimal</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Latency</p>
                  <p className="text-[11px] font-bold text-white uppercase">18ms</p>
                </div>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* ══════════ CTA FINAL ══════════ */}
      <section className="relative py-28 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb-cyber w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="cyber-grid absolute inset-0" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <div className="luxury-card cyber-border p-14 md:p-20">
            <Crown size={36} className="text-yellow-400 mx-auto mb-6 opacity-80" />
            <h2 className="font-heading text-[clamp(36px,7vw,80px)] font-black text-white leading-none tracking-tight mb-6">
              PRÊT À DEVENIR<br />
              <span className="text-luxury">UNE LÉGENDE</span> ?
            </h2>
            <p className="text-base text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
              L'arène vous attend. Rejoignez l'élite du gaming marocain dès maintenant.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate("/register")} className="cyber-btn cyber-btn-primary cyber-btn-lg group">
                <Swords size={18} />
                ENTRER DANS L'ARÈNE
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate("/login")} className="cyber-btn cyber-btn-outline cyber-btn-lg">
                J'ai déjà un compte
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="relative py-14 px-4 md:px-8 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyber-500 to-cyber-700 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="font-heading font-black text-lg tracking-tight">CIPHER<span className="text-cyber">POOL</span></span>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {['Confidentialité', 'Conditions', 'Support', 'Discord'].map((item) => (
                <Link key={item} to="/" className="text-xs text-white/25 hover:text-cyber-400 transition-colors">
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex gap-3">
              {[Coffee, GitBranch].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-cyber-400 hover:border-cyber-border transition-all">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          <div className="pt-8 border-t border-white/[0.04] text-center">
            <p className="text-[11px] text-white/20">
              © 2026 CipherPool Games. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
