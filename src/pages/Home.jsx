import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Trophy, Shield, Zap, Star, Users, Crown } from "lucide-react";
import { MeshGradient } from "@paper-design/shaders-react";
import { CircularTestimonials } from "../components/ui/CircularTestimonials";
import { Typewriter } from "../components/ui/Typewriter";
import { ContainerScroll } from "../components/ui/ContainerScroll";
import { MovingBorder } from "../components/ui/MovingBorder";
import { GlassButton, GlassPanel } from "../components/ui/GlassEffect";
import { RainbowButton } from "../components/ui/RainbowButton";
import { SearchComponent } from "../components/ui/SearchComponent";
import { WordsPullUp } from "../components/ui/WordsPullUp";

const testimonials = [
  {
    name: "Ahmed Pro",
    designation: "Gagnant Elite Cup",
    quote: "CipherPool est la seule plateforme au Maroc qui respecte vraiment les joueurs. Paiements rapides et tournois ultra-pros.",
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
  },
  {
    name: "Yassine Gamer",
    designation: "Chef de Clan",
    quote: "L'interface est super fluide sur mobile. On gère nos matchs sans le moindre problème. Top niveau.",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  },
  {
    name: "Sara Esports",
    designation: "Streameuse & Compétitrice",
    quote: "Une organisation impeccable. C'est vraiment l'avenir de l'esports au Maroc. Je recommande à 100%.",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  },
];

const STATS = [
  { val: "10,000+", label: "Joueurs" },
  { val: "500+",    label: "Tournois" },
  { val: "100k",    label: "Cash CP" },
  { val: "150+",    label: "Clans" },
];

const FEATURES = [
  {
    icon: Trophy,
    title: "Tournois Pro",
    desc: "Organisation rigoureuse avec des arbitres dédiés pour chaque match. Du solo au squad.",
    accent: "#06b6d4",
  },
  {
    icon: Shield,
    title: "Sécurité Totale",
    desc: "Vérification manuelle des résultats et système anti-cheat performant.",
    accent: "#a78bfa",
  },
  {
    icon: Zap,
    title: "Paiements Flash",
    desc: "Retire tes gains instantanément via nos partenaires sécurisés.",
    accent: "#f97316",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">

      {/* ── MESH GRADIENT BACKGROUND ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <MeshGradient
          className="absolute inset-0 w-full h-full"
          colors={["#000000", "#06b6d4", "#0891b2", "#164e63", "#f97316"]}
          speed={0.3}
          backgroundColor="#000000"
        />
        <MeshGradient
          className="absolute inset-0 w-full h-full opacity-30"
          colors={["#000000", "#ffffff", "#06b6d4", "#f97316"]}
          speed={0.2}
          wireframe={true}
          backgroundColor="transparent"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* ── SVG FILTERS ── */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="home-gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="gooey" />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
          <linearGradient id="cp-hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── NAVBAR ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-black"
            style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}
          >
            CP
          </div>
          <span className="font-black text-sm tracking-wider text-white">CIPHERPOOL</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {["Features", "Tournois", "Staff"].map(item => (
            <button
              key={item}
              onClick={() => item === "Staff" ? navigate("/team") : item === "Tournois" ? navigate("/tournaments") : null}
              className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white rounded-full hover:bg-white/5 transition-all"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Login button with gooey effect */}
        <div className="relative flex items-center group" style={{ filter: "url(#home-gooey-filter)" }}>
          <button
            className="absolute right-0 px-2.5 py-2 rounded-full bg-white text-black font-medium text-xs cursor-pointer h-8 flex items-center justify-center -translate-x-10 group-hover:-translate-x-20 z-0 transition-all duration-300"
            onClick={() => navigate("/register")}
          >
            <ArrowRight size={14} />
          </button>
          <button
            className="px-6 py-2 rounded-full bg-white text-black font-bold text-xs cursor-pointer h-8 flex items-center z-10 transition-all duration-300"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-xs text-white/80 font-medium tracking-wide">✨ Plateforme n°1 Esports Maroc</span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-none tracking-tight mb-6">
          <motion.span
            className="block font-light text-white/80 text-3xl md:text-4xl mb-3 tracking-widest uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Typewriter text={["L'ESPORTS MAROCAIN", "LES TOURNOIS PRO", "LA COMPÉTITION"]} speed={60} waitTime={2500} />
          </motion.span>
          <span
            className="block text-white"
            style={{ filter: "drop-shadow(0 0 30px rgba(6,182,212,0.3))" }}
          >
            <WordsPullUp text="COMMENCE" style={{ animationDelay: "0.4s" }} />
          </span>
          <span
            className="block font-light italic"
            style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            <WordsPullUp text="ICI." />
          </span>
        </h1>

        <motion.p
          className="text-lg text-white/50 max-w-xl mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          Participe aux tournois Free Fire organisés, gagne des prix réels et rejoint l'élite du gaming marocain.
        </motion.p>

        {/* Search CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mb-10"
        >
          <SearchComponent placeholder="Chercher un tournoi..." />
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <RainbowButton onClick={() => navigate("/register")} className="px-8 py-3 text-base font-bold">
            Rejoindre — Gratuit <ArrowRight size={18} />
          </RainbowButton>
          <button
            onClick={() => navigate("/tournaments")}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white/70 hover:text-white transition-all hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Voir les tournois
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-white/0 to-white/30" />
          <div className="w-1 h-1 rounded-full bg-white/30" />
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p
                className="text-4xl font-black mb-1"
                style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {s.val}
              </p>
              <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SCROLL 3D PREVIEW ── */}
      <section className="relative z-10">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-4">
              <p className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-3 font-mono">PLATEFORME</p>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Tout ce dont tu as besoin,
                <br />
                <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  dans un seul endroit.
                </span>
              </h2>
            </div>
          }
        >
          <div className="w-full h-full rounded-xl overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80"
              alt="CipherPool Platform"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
              <div className="text-center">
                <p className="text-6xl font-black tracking-tighter mb-2" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CIPHERPOOL</p>
                <p className="text-white/60 font-mono text-sm tracking-widest uppercase">Esports Platform Morocco</p>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-3 font-mono">POURQUOI CIPHERPOOL</p>
            <h2 className="text-4xl font-black text-white tracking-tight">Ce qui nous distingue</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <MovingBorder
                  outerClassName="w-full"
                  className="p-6"
                  colors={[f.accent]}
                  duration={4 + i}
                  borderWidth={1}
                  radius={16}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}20` }}
                  >
                    <f.icon size={22} style={{ color: f.accent }} />
                  </div>
                  <h3 className="text-lg font-black text-white mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </MovingBorder>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black text-orange-400 uppercase tracking-[0.3em] mb-3 font-mono">TÉMOIGNAGES</p>
            <h2 className="text-4xl font-black text-white tracking-tight">
              Ils nous font{" "}
              <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                confiance
              </span>
            </h2>
          </div>
          <div className="flex justify-center">
            <CircularTestimonials
              testimonials={testimonials}
              colors={{
                name: "#ffffff",
                designation: "rgba(255,255,255,0.4)",
                testimony: "rgba(255,255,255,0.65)",
                arrowBackground: "#0c0c1a",
                arrowForeground: "#06b6d4",
                arrowHoverBackground: "#0891b2",
              }}
              fontSizes={{ name: "1.4rem", designation: "0.875rem", quote: "1rem" }}
            />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl p-10 md:p-14"
            style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(6,182,212,0.1), transparent 60%)" }} />
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,#06b6d4,transparent)" }} />
            <Crown size={40} className="mx-auto mb-5 text-orange-400 opacity-80" />
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
              Prêt à{" "}
              <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                dominer
              </span>
              {" "}?
            </h2>
            <p className="text-white/40 text-base mb-8 leading-relaxed max-w-md mx-auto">
              Rejoins des milliers de joueurs marocains et prouve tes skills dans des tournois organisés.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <RainbowButton onClick={() => navigate("/register")} className="px-10 py-4 text-base font-bold">
                Créer un compte — Gratuit
              </RainbowButton>
              <button
                onClick={() => navigate("/login")}
                className="px-10 py-4 rounded-xl text-sm font-bold text-white/60 hover:text-white transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Déjà un compte ? Login
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 py-10 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
            <span className="font-black text-sm tracking-wider text-white">CIPHERPOOL</span>
          </div>
          <div className="flex gap-6 text-[10px] font-bold text-white/25 uppercase tracking-widest">
            {["Confidentialité", "Conditions", "Contact"].map(l => (
              <button key={l} className="hover:text-white/60 transition-colors">{l}</button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">© 2026 CIPHERPOOL</p>
        </div>
      </footer>
    </div>
  );
}
