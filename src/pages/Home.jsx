import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  Menu,
  X,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Trophy,
  Users,
  TrendingUp,
  Crown,
  Gamepad2,
  Flame,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { Button } from "../components/ui/Button";

const navItems = [
  { label: "Tournois", path: "/tournaments" },
  { label: "Arène", path: "/arena" },
  { label: "Clans", path: "/clans" },
  { label: "Classement", path: "/leaderboard" },
];

const stats = [
  { value: "10K+", label: "Joueurs actifs" },
  { value: "500+", label: "Tournois/mois" },
  { value: "99.9%", label: "Anti-triche" },
  { value: "24/7", label: "Support" },
];

const features = [
  {
    icon: Shield,
    title: "Sécurité tactique",
    description: "Matchs vérifiés, modération active et système anti-triche conçu pour protéger l’intégrité compétitive.",
  },
  {
    icon: Zap,
    title: "Récompenses rapides",
    description: "Expérience fluide de participation, résultats, classement et distribution des gains.",
  },
  {
    icon: Globe,
    title: "Communauté MENA",
    description: "Connecte-toi avec des joueurs, clans et organisateurs de la région.",
  },
  {
    icon: Trophy,
    title: "Tournois premium",
    description: "Compétitions quotidiennes, brackets propres et pages tournoi détaillées.",
  },
  {
    icon: Users,
    title: "Clans & squads",
    description: "Crée ton équipe, recrute des joueurs et participe aux rivalités de clans.",
  },
  {
    icon: TrendingUp,
    title: "Progression live",
    description: "Classement, statistiques, historique de matchs et performance visible en temps réel.",
  },
];

const testimonials = [
  {
    quote: "CipherPool donne enfin une vraie ambiance compétitive aux tournois locaux.",
    name: "Yassine B.",
    role: "Joueur Free Fire",
    avatar: "Y",
  },
  {
    quote: "Interface propre, inscription rapide, et tout est clair pour les clans.",
    name: "Laila M.",
    role: "Chef de clan",
    avatar: "L",
  },
  {
    quote: "Le design donne directement une sensation premium et professionnelle.",
    name: "Amine K.",
    role: "Organisateur",
    avatar: "A",
  },
];

function GradientText({ children, className = "" }) {
  return (
    <span
      className={`bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
}

function CyberBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 34 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: 3 + Math.random() * 5,
        delay: Math.random() * 3,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(99,102,241,0.20),transparent_30%),linear-gradient(135deg,#070b14,#0a1020_45%,#050816)]" />

      <motion.div
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity }}
        className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.5) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />

      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute h-1 w-1 rounded-full bg-cyan-300/50"
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -36, 0], opacity: [0.15, 0.9, 0.15], scale: [1, 1.8, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function ShowcaseCard() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);

  return (
    <div ref={ref} className="relative mx-auto flex h-[48rem] max-w-6xl items-center justify-center px-4">
      <motion.div
        style={{ rotateX, scale }}
        className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />

        <div className="relative grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Live Arena</p>
                <h3 className="mt-2 text-3xl font-black text-white">Free Fire Crown Cup</h3>
              </div>
              <div className="rounded-full bg-red-500/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-300">
                Live
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Prize Pool", "Teams", "Start"].map((label, i) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {i === 0 ? "5,000 MAD" : i === 1 ? "64" : "21:00"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
              <div className="mb-4 flex items-center gap-2 text-cyan-300">
                <Flame size={18} />
                <span className="text-sm font-bold">Matchmaking intelligent</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "78%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600">
                <Crown className="text-white" />
              </div>
              <div>
                <h4 className="font-black text-white">Top Clans</h4>
                <p className="text-sm text-gray-500">Classement instantané</p>
              </div>
            </div>

            {["Zenith Esports", "Atlas Wolves", "Rabat Titans", "MENA Ghosts"].map((team, i) => (
              <div key={team} className="mb-3 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-white">
                    {i + 1}
                  </span>
                  <span className="font-bold text-gray-200">{team}</span>
                </div>
                <span className="text-sm font-black text-cyan-300">{980 - i * 63}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % testimonials.length), 4500);
    return () => clearInterval(id);
  }, []);

  const item = testimonials[active];

  return (
    <section className="relative px-4 py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-black text-white md:text-6xl">
            VOIX DES <GradientText>GUERRIERS</GradientText>
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
              transition={{ duration: 0.35 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-300 to-blue-600 text-3xl font-black text-white">
                {item.avatar}
              </div>
              <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-200 md:text-2xl">
                “{item.quote}”
              </p>
              <h3 className="mt-8 text-xl font-black text-white">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.role}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex justify-center gap-4">
            <button
              onClick={() => setActive((active - 1 + testimonials.length) % testimonials.length)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setActive((active + 1) % testimonials.length)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <CyberBackground />

      <motion.nav
        initial={{ y: -90 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#050816]/75 px-4 backdrop-blur-xl md:h-20 md:px-8 lg:px-12"
      >
        <Link to="/" className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.08 }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 shadow-lg shadow-cyan-500/25"
          >
            <Sparkles size={21} />
          </motion.div>
          <span className="text-xl font-black tracking-tight md:text-2xl">
            CIPHER<span className="text-cyan-300">POOL</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 rounded-full border border-white/10 bg-white/5 px-8 py-3 backdrop-blur-xl lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 transition hover:text-cyan-300"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="hidden text-xs font-black uppercase tracking-[0.16em] text-gray-400 transition hover:text-white sm:block"
          >
            Connexion
          </button>

          <Button
            onClick={() => navigate("/register")}
            className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            Rejoindre
          </Button>

          <button onClick={() => setMobileMenuOpen((v) => !v)} className="lg:hidden">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="fixed left-0 right-0 top-16 z-40 border-b border-white/10 bg-[#050816]/95 p-5 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-bold text-gray-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        <section className="relative flex min-h-screen items-center justify-center px-4 pt-20">
          <div className="mx-auto max-w-7xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-200"
            >
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.9)]" />
              Le futur de l’esport marocain
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.8 }}
              className="text-5xl font-black leading-[1.02] md:text-7xl lg:text-8xl"
            >
              DOMINEZ L’ARÈNE.
              <br />
              <GradientText>GAGNEZ LA GLOIRE.</GradientText>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mx-auto mt-7 max-w-3xl text-lg leading-relaxed text-gray-400 md:text-xl"
            >
              CipherPool est une plateforme de tournois gaming pensée pour les clans,
              joueurs compétitifs et organisateurs qui veulent une expérience rapide,
              claire et premium.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.8 }}
              className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <button
                onClick={() => navigate("/register")}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-300 to-blue-600 px-9 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-cyan-500/25 transition hover:scale-[1.02]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Initialiser le combat
                  <ArrowRight className="transition group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 translate-y-full bg-white/20 transition group-hover:translate-y-0" />
              </button>

              <button
                onClick={() => navigate("/tournaments")}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-9 py-5 text-sm font-black uppercase tracking-widest text-white backdrop-blur-xl transition hover:bg-white/10"
              >
                <Play size={18} />
                Explorer les tournois
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.8 }}
              className="mx-auto mt-20 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                  <div className="text-3xl font-black md:text-4xl">{stat.value}</div>
                  <div className="mt-2 text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-black md:text-6xl">
                POURQUOI <GradientText>CIPHERPOOL</GradientText> ?
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-gray-400">
                Une interface moderne pour transformer chaque tournoi en vraie expérience compétitive.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ y: -6, scale: 1.015 }}
                    className="group rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
                  >
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300 group-hover:bg-cyan-300/20">
                      <Icon size={28} />
                    </div>
                    <h3 className="text-xl font-black">{feature.title}</h3>
                    <p className="mt-3 leading-relaxed text-gray-400">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Tournament engine</p>
            <h2 className="mt-4 text-4xl font-black md:text-6xl">
              UNE ARÈNE <GradientText>VIVANTE</GradientText>
            </h2>
          </div>
          <ShowcaseCard />
        </section>

        <Testimonials />

        <section className="px-4 py-32">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 via-white/[0.04] to-purple-500/10 p-10 text-center backdrop-blur-xl md:p-16"
          >
            <Gamepad2 className="mx-auto mb-6 text-cyan-300" size={42} />
            <h2 className="text-5xl font-black leading-tight md:text-7xl">
              REJOIGNEZ <GradientText>L’ÉLITE</GradientText>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
              Crée ton compte, trouve ton tournoi, entre dans l’arène et commence à bâtir ton classement.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="mt-10 rounded-2xl bg-gradient-to-r from-cyan-300 to-blue-600 px-12 py-5 text-sm font-black uppercase tracking-widest shadow-2xl shadow-cyan-500/30 transition hover:scale-[1.02]"
            >
              Entrer dans l’arène
            </button>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <Link to="/" className="flex items-center gap-3 font-black">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-300 to-blue-600" />
            CIPHERPOOL
          </Link>

          <div className="flex gap-7 text-sm text-gray-500">
            <Link to="/privacy" className="hover:text-gray-300">Confidentialité</Link>
            <Link to="/terms" className="hover:text-gray-300">Conditions</Link>
            <Link to="/support" className="hover:text-gray-300">Support</Link>
          </div>

          <p className="text-xs text-gray-600">© 2026 CipherPool. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}