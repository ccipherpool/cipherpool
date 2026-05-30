import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Shield, Zap, ArrowRight, Sparkles,
  Swords, Globe, Crown, Menu, X, Star,
  Users, TrendingUp, ChevronDown, ArrowUpRight,
  Flame, CheckCircle2, Wallet, Radio,
  Target, Lock, MessageSquare, BarChart3,
  Globe2, Play, Camera, GitBranch,
  UserCheck, Layers, ChevronRight,
} from "lucide-react";
import { ContainerScroll } from "../components/ui/ContainerScroll";
import { useCountUp } from "../hooks/useCountUp";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { use3DTilt } from "../hooks/use3DTilt";

const FlowArt     = lazy(() => import("../components/ui/FlowArt"));
const FlowSection = lazy(() => import("../components/ui/FlowArt").then(m => ({ default: m.FlowSection })));

/* ── Stable pre-computed configs ─────────────────────────────────── */
const PARTICLE_CFG = [...Array(24)].map((_, i) => ({
  size:     `${1.2 + (i * 0.18) % 3}px`,
  color:    i % 4 === 0 ? '#7C3AED' : i % 4 === 1 ? '#06B6D4' : i % 4 === 2 ? '#F59E0B' : '#A78BFA',
  left:     `${(i * 4.3 + 2) % 100}%`,
  top:      `${(i * 3.9 + 5) % 100}%`,
  duration: 3 + (i * 0.25) % 4,
  delay:    (i * 0.4) % 6,
  y:        (i % 2 === 0 ? -1 : 1) * (10 + (i * 1.7) % 20),
  x:        (i % 3 === 0 ? 1 : -1) * ((i * 1.1) % 10),
}));

const GRID_LINES = [...Array(8)].map((_, i) => ({
  left: `${(i + 1) * 12.5}%`,
  delay: i * 0.1,
}));

/* ── Background components ───────────────────────────────────────── */
const FloatingParticles = () => (
  <div className="absolute inset-0 pointer-events-none">
    {PARTICLE_CFG.map((p, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{ width: p.size, height: p.size, background: p.color, left: p.left, top: p.top, boxShadow: `0 0 8px ${p.color}80` }}
        animate={{ y: [0, p.y, 0], x: [0, p.x, 0], opacity: [0, 0.8, 0], scale: [0, 1.2, 0] }}
        transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const CyberGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
    {GRID_LINES.map((l, i) => (
      <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: l.left, background: 'linear-gradient(to bottom, transparent, rgba(124,58,237,0.15) 20%, rgba(124,58,237,0.15) 80%, transparent)' }} />
    ))}
    <div className="absolute left-0 right-0 h-px top-[30%]" style={{ background: 'linear-gradient(to right, transparent, rgba(6,182,212,0.12), transparent)' }} />
    <div className="absolute left-0 right-0 h-px top-[65%]" style={{ background: 'linear-gradient(to right, transparent, rgba(124,58,237,0.10), transparent)' }} />
  </div>
);

/* ── Animated stat counter ───────────────────────────────────────── */
function HeroStat({ icon: Icon, value, suffix = '', label, delay, color = '#7C3AED' }) {
  const { ref, visible } = useScrollReveal();
  const num = useCountUp(parseInt(value) || 0, { duration: 1800, enabled: visible });
  const { ref: tilt, onMouseMove, onMouseLeave } = use3DTilt({ max: 6 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 280 }}
    >
      <div
        ref={tilt}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="relative group cursor-default"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '20px 24px',
          transformStyle: 'preserve-3d',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = `${color}40`;
          e.currentTarget.style.boxShadow = `0 0 24px ${color}15`;
        }}
        onMouseLeave2={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
          <Icon size={17} style={{ color }} />
        </div>
        <div className="font-heading text-2xl font-black text-white leading-none mb-1">
          {visible ? num.toLocaleString() : '0'}{suffix}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
        <div className="absolute bottom-0 left-0 right-0 h-px rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to right, transparent, ${color}60, transparent)` }} />
      </div>
    </motion.div>
  );
}

/* ── Feature card ───────────────────────────────────────────────── */
const FEATURE_COLORS = [
  { bg: 'rgba(124,58,237,0.12)',  icon: '#A78BFA', border: 'rgba(124,58,237,0.25)', glow: 'rgba(124,58,237,0.08)' },
  { bg: 'rgba(6,182,212,0.12)',   icon: '#22D3EE', border: 'rgba(6,182,212,0.25)',   glow: 'rgba(6,182,212,0.08)'  },
  { bg: 'rgba(245,158,11,0.12)',  icon: '#FCD34D', border: 'rgba(245,158,11,0.25)',  glow: 'rgba(245,158,11,0.08)' },
  { bg: 'rgba(124,58,237,0.12)',  icon: '#A78BFA', border: 'rgba(124,58,237,0.25)', glow: 'rgba(124,58,237,0.08)' },
  { bg: 'rgba(6,182,212,0.12)',   icon: '#22D3EE', border: 'rgba(6,182,212,0.25)',   glow: 'rgba(6,182,212,0.08)'  },
  { bg: 'rgba(245,158,11,0.12)',  icon: '#FCD34D', border: 'rgba(245,158,11,0.25)',  glow: 'rgba(245,158,11,0.08)' },
];

function FeatureCard({ icon: Icon, title, description, index, badge }) {
  const { ref: tilt, onMouseMove, onMouseLeave } = use3DTilt({ max: 8 });
  const { ref, visible } = useScrollReveal();
  const c = FEATURE_COLORS[index % FEATURE_COLORS.length];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: (index % 3) * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div
        ref={tilt}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${c.border}`,
          borderRadius: 20,
          padding: '28px 24px',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'box-shadow 0.3s, border-color 0.3s',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 40px ${c.glow}, 0 20px 40px rgba(0,0,0,0.3)`; }}
        onMouseLeave2={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(to right, transparent, ${c.icon}80, transparent)` }} />

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: c.bg }}>
          <Icon size={22} style={{ color: c.icon }} />
        </div>

        {/* Badge */}
        {badge && (
          <span className="absolute top-5 right-5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: c.bg, color: c.icon, border: `1px solid ${c.border}` }}>
            {badge}
          </span>
        )}

        <h3 className="font-heading text-[15px] font-black text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</p>

        <div className="flex items-center gap-1 mt-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.icon }}>
          <span className="text-[11px] font-bold">En savoir plus</span>
          <ChevronRight size={11} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── How it works step ───────────────────────────────────────────── */
function StepCard({ num, icon: Icon, title, desc, delay, color }) {
  const { ref, visible } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Step number ring */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full" style={{ background: `${color}18`, border: `1px solid ${color}35` }} />
        <div className="absolute inset-[6px] rounded-full flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={26} style={{ color }} />
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] text-white" style={{ background: color, boxShadow: `0 0 12px ${color}60` }}>
          {num}
        </div>
      </div>
      <h3 className="font-heading text-lg font-black text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed max-w-[220px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
    </motion.div>
  );
}

/* ── Testimonial card ────────────────────────────────────────────── */
function TestimonialCard({ quote, name, role, avatar, delay, color = '#7C3AED' }) {
  const { ref, visible } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding: '28px 24px',
        height: '100%',
      }}
    >
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, j) => (
          <Star key={j} size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
        ))}
      </div>
      <p className="text-sm italic leading-relaxed flex-1 mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
        "{quote}"
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm" style={{ background: `linear-gradient(135deg, ${color}, #06B6D4)` }}>
          {avatar || name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{role}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [liveCount, setLiveCount] = useState(47);

  useEffect(() => {
    let ticking = false;
    const handle = () => {
      if (!ticking) { requestAnimationFrame(() => { setScrolled(window.scrollY > 50); ticking = false; }); ticking = true; }
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  /* Simulate live tournament count */
  useEffect(() => {
    const t = setInterval(() => {
      setLiveCount(c => c + (Math.random() > 0.5 ? 1 : -1) > 30 ? c + (Math.random() > 0.5 ? 1 : -1) : 31);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const features = [
    { icon: Shield,     title: "Anti-Triche IA",       description: "Détection en temps réel. Chaque match audité. Intégrité garantie à 99.9% grâce à notre IA propriétaire.", badge: "IA" },
    { icon: Zap,        title: "Récompenses Flash",     description: "Wallet intégré. Gains crédités instantanément après victoire. Zéro délai, zéro friction, zéro attente." },
    { icon: Globe,      title: "Réseau Marocain",       description: "15 000+ joueurs actifs. Clans, équipes, communauté soudée. La plus grande plateforme esport du Maroc." },
    { icon: Trophy,     title: "Tournois Premium",      description: "Compétitions quotidiennes avec prize pools élevés. Du format casual jusqu'au niveau semi-professionnel.", badge: "HOT" },
    { icon: Users,      title: "Guerre de Clans",       description: "Clans contre clans dans des batailles épiques. Montez dans le classement national et défendez votre région." },
    { icon: TrendingUp, title: "Stats & Analytics",     description: "K/D ratio, win rate, progression ELO, heat maps. Analysez vos performances et progressez méthodiquement." },
  ];

  const steps = [
    { num: '01', icon: UserCheck,  title: "Créez votre compte",    desc: "Inscription gratuite en 30 secondes. Choisissez votre pseudo, connectez-vous.", color: '#7C3AED' },
    { num: '02', icon: Target,     title: "Rejoignez un tournoi",  desc: "Parcourez les arènes disponibles. Inscrivez-vous avec votre wallet CipherPool.", color: '#06B6D4' },
    { num: '03', icon: Wallet,     title: "Encaissez vos gains",   desc: "Victoire = gains immédiats. Retirez ou réinvestissez dans le prochain tournoi.", color: '#F59E0B' },
  ];

  const testimonials = [
    { quote: "CipherPool a révolutionné ma façon de jouer. Les récompenses sont instantanées, la communauté est incroyable. Je ne joue plus nulle part ailleurs.", name: "Yassine B.", role: "Pro Player · Top 50 Maroc", color: '#7C3AED' },
    { quote: "La meilleure plateforme de tournois au Maroc. L'anti-triche est vraiment efficace et les admins sont réactifs. Légitimement la référence.", name: "Laila M.", role: "Chef de Clan · 2000+ ELO", color: '#06B6D4' },
    { quote: "Une communauté incroyable, des tournois bien organisés, des gains instantanés. Je recommande CipherPool à 100% à tous les joueurs sérieux !", name: "Amine K.", role: "Streamer · 25K abonnés", color: '#F59E0B' },
  ];

  const navLinks = [['Tournois', '/tournaments'], ['Classement', '/leaderboard'], ['Clans', '/clans'], ['Store', '/store']];

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#0B1020', color: 'white' }}>

      {/* ── Global ambient ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Orbs */}
        <div className="absolute top-[-20vh] left-[-10vw] w-[70vw] h-[70vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-[-10vh] right-[-5vw] w-[50vw] h-[50vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        {/* Logo watermark */}
        <img src="/logo.png" aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] max-w-[650px] select-none" style={{ opacity: 0.025, mixBlendMode: 'screen', filter: 'blur(0.5px)' }} alt="" />
        <CyberGrid />
        <FloatingParticles />
      </div>

      {/* ══════════ NAV ══════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={scrolled ? {
          background: 'rgba(11,16,32,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        } : {}}
      >
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]" style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="font-heading font-black text-xl tracking-tight text-white">
              CIPHER<span style={{ color: '#A78BFA' }}>POOL</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(([label, to]) => (
              <Link key={label} to={to} className="relative px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-colors group" style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
              >
                {label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px group-hover:w-full transition-all duration-300" style={{ background: 'linear-gradient(to right, #7C3AED, #06B6D4)' }} />
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate("/login")} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 border" style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              Connexion
            </button>
            <button onClick={() => navigate("/register")} className="flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all duration-200 shadow-lg" style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 30px rgba(124,58,237,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.35)'; e.currentTarget.style.transform = ''; }}
            >
              <Swords size={13} />
              Rejoindre
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-xl transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 left-0 right-0 z-40 m-3 p-4 lg:hidden rounded-2xl"
            style={{ background: 'rgba(18,24,43,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex flex-col gap-1">
              {navLinks.map(([label, to]) => (
                <Link key={label} to={to} className="px-4 py-3 rounded-xl text-sm font-bold transition-all" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={() => setMobileMenuOpen(false)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
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

          {/* Live status pill */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-10"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.7)' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <Radio size={11} style={{ color: '#A78BFA' }} />
            <span className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: '#A78BFA' }}>
              LIVE — <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }}>{liveCount}</motion.span> tournois en cours
            </span>
          </motion.div>

          {/* Main title */}
          <div className="overflow-hidden mb-3">
            <motion.h1
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading font-black leading-[0.88] tracking-tight text-white"
              style={{ fontSize: 'clamp(56px, 11vw, 130px)' }}
            >
              ASCENDEZ
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading font-black leading-[0.88] tracking-tight"
              style={{
                fontSize: 'clamp(56px, 11vw, 130px)',
                background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 50%, #7C3AED 100%)',
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            La plateforme #1 du gaming compétitif marocain.
            <br />
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>Tournois · Récompenses · Communauté</span>
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <button
              onClick={() => navigate("/register")}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest text-white transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 48px rgba(124,58,237,0.6)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)'; e.currentTarget.style.transform = ''; }}
            >
              <Swords size={17} />
              REJOINDRE L'ARÈNE
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/tournaments")}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(124,58,237,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <Trophy size={16} />
              VOIR LES TOURNOIS
              <ArrowUpRight size={14} />
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
          >
            <HeroStat icon={Users}    value={15000} suffix="+" label="Joueurs Actifs"  delay={0}    color="#7C3AED" />
            <HeroStat icon={Trophy}   value={800}   suffix="+" label="Tournois/Mois"   delay={0.1}  color="#06B6D4" />
            <HeroStat icon={Shield}   value={99}    suffix="%" label="Anti-Triche"     delay={0.2}  color="#10B981" />
            <HeroStat icon={Zap}      value={1}     suffix="s" label="Récompenses"     delay={0.3}  color="#F59E0B" />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown size={18} style={{ color: 'rgba(167,139,250,0.5)' }} />
          </motion.div>
          <span className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.2)' }}>Scroll</span>
        </motion.div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="relative py-28 px-4 md:px-8">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.05) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.45em] uppercase mb-4" style={{ color: 'rgba(167,139,250,0.6)' }}>Pourquoi CipherPool</p>
            <h2 className="font-heading font-black tracking-tight text-white" style={{ fontSize: 'clamp(32px, 6vw, 64px)' }}>
              L'ARME ULTIME
              <br />
              <span style={{ color: '#A78BFA' }}>DU GAMER MAROCAIN</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="relative py-24 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(124,58,237,0.03)' }} />
        <div className="relative max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.45em] uppercase mb-4" style={{ color: 'rgba(6,182,212,0.7)' }}>Comment ça marche</p>
            <h2 className="font-heading font-black tracking-tight text-white" style={{ fontSize: 'clamp(28px, 5vw, 56px)' }}>
              3 ÉTAPES VERS <span style={{ color: '#22D3EE' }}>LA VICTOIRE</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-10 left-[25%] right-[25%] h-px" style={{ background: 'linear-gradient(to right, rgba(124,58,237,0.4), rgba(6,182,212,0.4))' }} />
            {steps.map((s, i) => (
              <StepCard key={i} {...s} delay={i * 0.15} />
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
                <span className="font-black text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: '#A78BFA' }}>Phase 01</span>
                <h2 className="font-heading font-black text-white uppercase tracking-tight leading-none mb-6" style={{ fontSize: 'clamp(36px, 7vw, 80px)' }}>
                  CHOISISSEZ<br /><span style={{ color: '#7C3AED' }}>VOTRE ARÈNE</span>
                </h2>
                <p className="text-base leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.4)' }}>Des centaines de tournois quotidiens. Trouvez la compétition qui vous correspond parmi nos formats variés.</p>
              </div>
            </FlowSection>
            <FlowSection className="bg-cp-s2">
              <div className="flex flex-col justify-center h-full max-w-4xl mx-auto px-8 text-right items-end">
                <span className="font-black text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: '#FCD34D' }}>Phase 02</span>
                <h2 className="font-heading font-black text-white uppercase tracking-tight leading-none mb-6" style={{ fontSize: 'clamp(36px, 7vw, 80px)' }}>
                  ENGAGEZ LE<br /><span style={{ color: '#06B6D4' }}>COMBAT</span>
                </h2>
                <p className="text-base leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.4)' }}>Affrontez les meilleurs dans une arène sécurisée. Notre IA surveille chaque duel en temps réel.</p>
              </div>
            </FlowSection>
            <FlowSection className="bg-cp-base">
              <div className="flex flex-col justify-center h-full max-w-4xl mx-auto px-8">
                <span className="font-black text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: '#22D3EE' }}>Phase 03</span>
                <h2 className="font-heading font-black text-white uppercase tracking-tight leading-none mb-6" style={{ fontSize: 'clamp(36px, 7vw, 80px)' }}>
                  SÉCURISEZ<br /><span style={{ color: '#F59E0B' }}>VOTRE GLOIRE</span>
                </h2>
                <p className="text-base leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.4)' }}>Gains instantanés sur wallet. Montez dans le Hall of Fame. Construisez votre légende.</p>
              </div>
            </FlowSection>
          </FlowArt>
        </Suspense>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="relative py-28 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-[10px] font-black tracking-[0.45em] uppercase mb-4" style={{ color: 'rgba(245,158,11,0.7)' }}>Témoignages</p>
            <h2 className="font-heading font-black tracking-tight text-white" style={{ fontSize: 'clamp(28px, 5vw, 56px)' }}>
              PAROLE DE <span style={{ color: '#FCD34D' }}>GUERRIERS</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PLATFORM PREVIEW ══════════ */}
      <section className="relative py-16 overflow-hidden">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-black tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(167,139,250,0.6)' }}>Interface Tactique</p>
              <h2 className="font-heading font-black text-white leading-tight uppercase tracking-tight" style={{ fontSize: 'clamp(28px, 6vw, 64px)' }}>
                L'EXPÉRIENCE<br /><span style={{ color: '#A78BFA' }}>ULTIME DU GAMING</span>
              </h2>
            </div>
          }
        >
          <div className="relative h-full w-full rounded-2xl overflow-hidden" style={{ background: '#12182B', border: '1px solid rgba(255,255,255,0.07)' }}>
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070"
              className="w-full h-full object-cover opacity-40"
              loading="lazy"
              decoding="async"
              alt="Dashboard Preview"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #12182B 0%, rgba(18,24,43,0.3) 50%, transparent 100%)' }} />
            <div className="absolute bottom-7 left-7 right-7 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-1.5" style={{ color: '#A78BFA' }}>Operational Grid</p>
                <h3 className="font-heading text-xl font-black text-white uppercase tracking-tight">DASHBOARD V4.0</h3>
              </div>
              <div className="flex gap-2.5">
                {[['Status', 'Optimal', '#10B981'], ['Latency', '18ms', 'white']].map(([k, v, c]) => (
                  <div key={k} className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                    <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{k}</p>
                    <p className="text-[11px] font-bold uppercase" style={{ color: c }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative py-28 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 60%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <div
            className="text-center p-12 md:p-20 rounded-3xl relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 40px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Top glow line */}
            <div className="absolute top-0 left-[15%] right-[15%] h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(124,58,237,0.7), rgba(6,182,212,0.5), transparent)' }} />

            <Crown size={36} className="mx-auto mb-6 opacity-80" style={{ color: '#F59E0B' }} />
            <h2 className="font-heading font-black text-white leading-none tracking-tight mb-5" style={{ fontSize: 'clamp(36px, 7vw, 80px)' }}>
              PRÊT À DEVENIR<br />
              <span style={{ color: '#FCD34D' }}>UNE LÉGENDE</span> ?
            </h2>
            <p className="text-base max-w-lg mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Rejoignez 15 000+ joueurs qui ont déjà choisi CipherPool. L'arène vous attend — gratuitement.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              {[
                { icon: CheckCircle2, label: 'Inscription gratuite', color: '#10B981' },
                { icon: Shield, label: 'Anti-triche IA', color: '#A78BFA' },
                { icon: Zap, label: 'Gains instantanés', color: '#F59E0B' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={14} style={{ color }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/register")}
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest text-white transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 48px rgba(124,58,237,0.6)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)'; e.currentTarget.style.transform = ''; }}
              >
                <Swords size={17} />
                ENTRER DANS L'ARÈNE
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                J'ai déjà un compte
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="relative py-14 px-4 md:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-heading font-black text-lg text-white tracking-tight">CIPHER<span style={{ color: '#A78BFA' }}>POOL</span></span>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                La plateforme #1 du gaming compétitif marocain. Tournois, récompenses, communauté.
              </p>
              <div className="flex gap-2">
                {[
                  { Icon: Globe2,        href: '#', color: '#1DA1F2' },
                  { Icon: Camera,        href: '#', color: '#E1306C' },
                  { Icon: Play,          href: '#', color: '#FF0000' },
                  { Icon: MessageSquare, href: '#', color: '#5865F2' },
                ].map(({ Icon, href, color }, i) => (
                  <a key={i} href={href} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}12`; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = ''; }}
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Plateforme</p>
              {['Tournois', 'Classement', 'Clans', 'Teams', 'Store'].map(item => (
                <Link key={item} to={`/${item.toLowerCase()}`} className="block py-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#A78BFA'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  {item}
                </Link>
              ))}
            </div>

            {/* Communauté */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Communauté</p>
              {['Hall of Fame', 'News', 'Support', 'Équipe', 'Bugs'].map(item => (
                <a key={item} href="#" className="block py-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#22D3EE'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Légal</p>
              {["Confidentialité", "Conditions d'utilisation", "Cookies", "RGPD"].map(item => (
                <a key={item} href="#" className="block py-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2026 CipherPool Games. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.7)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>Tous systèmes opérationnels</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
