import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Trophy, Shield, Zap, ArrowRight, Sparkles, 
  Swords, Flame, Globe, Crown, Menu, X, Star,
  Award, Users, TrendingUp, Gamepad2, Wallet,
  ChevronDown, ArrowUpRight, Coffee, Github
} from "lucide-react";

// ═══════════════════════════════════════════════
// 🎨 TOILE DE FOND - "DIGITAL RAIN MATRIX"
// Inspirée du cyberpunk 2077
// ═══════════════════════════════════════════════
const MatrixRain = () => (
  <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
    {[...Array(10)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute top-0 w-[1px] bg-gradient-to-b from-cyan-400/0 via-cyan-400/50 to-cyan-400/0"
        style={{ left: `${Math.random() * 100}%`, height: `${50 + Math.random() * 100}px` }}
        animate={{ y: ['0vh', '100vh'], opacity: [0, 1, 0] }}
        transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2, ease: "linear" }}
      />
    ))}
  </div>
);

// ═══════════════════════════════════════════════
// ✨ PARTICULES FLOTTANTES DYNAMIQUES
// ═══════════════════════════════════════════════
const FloatingParticles = () => (
  <div className="absolute inset-0 pointer-events-none">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#3b82f6',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -20, 0],
          x: [0, Math.random() * 10 - 5, 0],
          opacity: [0, 0.8, 0],
          scale: [0, 1.5, 0],
        }}
        transition={{
          duration: 2 + Math.random() * 3,
          repeat: Infinity,
          delay: Math.random() * 5,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

// ═══════════════════════════════════════════════
// 🏆 CARTE DE STATISTIQUE AVEC EFFET GLASS
// ═══════════════════════════════════════════════
const StatCard = ({ icon: Icon, value, label, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, type: "spring" }}
    whileHover={{ scale: 1.05, y: -5 }}
    className="relative group"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-center">
      <Icon size={28} className="text-cyan-400 mx-auto mb-3" />
      <div className="text-4xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</div>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════
// 💎 BOUTON PRINCIPAL - EFFET NEON HOLOGRAPHIQUE
// ═══════════════════════════════════════════════
const NeonButton = ({ children, onClick, variant = 'primary', className = "", href }) => {
  const Component = href ? Link : 'button';
  const props = href ? { to: href } : { onClick };
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative group inline-block"
    >
      {/* Glow externe */}
      <div className={`absolute -inset-[2px] rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
        variant === 'primary' 
          ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500' 
          : 'bg-gradient-to-r from-white/10 to-white/5'
      }`} />
      
      <Component
        {...props}
        className={`relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
          variant === 'primary'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50'
            : 'bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1] hover:border-white/[0.2]'
        } ${className}`}
      >
        {children}
      </Component>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════
// 🎯 SECTION HERO PRINCIPALE
// ═══════════════════════════════════════════════
const HeroSection = ({ navigate }) => (
  <section className="relative min-h-screen flex items-center justify-center px-4 md:px-8 overflow-hidden">
    <MatrixRain />
    <FloatingParticles />
    
    <div className="relative z-10 text-center max-w-6xl mx-auto">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-cyan-400"
        />
        <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em]">
          🚀 Le Futur de l'Esport Marocain
        </span>
      </motion.div>

      {/* Titre avec effet de révélation caractère par caractère */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-[1] mb-6"
      >
        <motion.span
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
          className="block"
        >
          ASCENDEZ
        </motion.span>
        <motion.span
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
          className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent"
        >
          VERS LA GLOIRE
        </motion.span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12"
      >
        Plongez dans l'arène ultime du gaming compétitif marocain.
        <br />
        <span className="text-cyan-400 font-semibold">Tournois • Récompenses • Gloire</span>
      </motion.p>

      {/* Boutons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-6"
      >
        <NeonButton onClick={() => navigate("/register")}>
          <Swords size={20} />
          REJOINDRE L'ARÈNE
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </NeonButton>
        
        <NeonButton variant="secondary" onClick={() => navigate("/tournaments")}>
          <Trophy size={20} />
          VOIR LES TOURNOIS
          <ArrowUpRight size={20} />
        </NeonButton>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto"
      >
        <StatCard icon={Users} value="15K+" label="Joueurs Actifs" delay={1.5} />
        <StatCard icon={Trophy} value="800+" label="Tournois/Mois" delay={1.6} />
        <StatCard icon={Shield} value="99.9%" label="Anti-Triche" delay={1.7} />
        <StatCard icon={Zap} value="< 1s" label="Récompenses" delay={1.8} />
      </motion.div>
    </div>

    {/* Indicateur de scroll */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
    >
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown size={24} className="text-cyan-400" />
      </motion.div>
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/50">
        Scroll
      </span>
    </motion.div>
  </section>
);

// ═══════════════════════════════════════════════
// 🛡️ CARTE DE FONCTIONNALITÉ
// ═══════════════════════════════════════════════
const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, rotateX: 10 }}
    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6, type: "spring" }}
    whileHover={{ scale: 1.03, y: -8 }}
    className="group relative"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 rounded-2xl transition-all duration-500 group-hover:from-cyan-500/10 group-hover:to-purple-500/10" />
    <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon size={28} className="text-cyan-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════
// 🏠 COMPOSANT PRINCIPAL HOME
// ═══════════════════════════════════════════════
export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Shield,
      title: "Sécurité Maximale",
      description: "Système anti-triche alimenté par IA. Chaque match est audité en temps réel. Intégrité garantie."
    },
    {
      icon: Zap,
      title: "Récompenses Flash",
      description: "Wallet crypto intégré. Recevez vos gains instantanément après chaque victoire. Sans délai."
    },
    {
      icon: Globe,
      title: "Réseau Puissant",
      description: "Rejoignez 15,000+ joueurs marocains. Clans, teams, et une communauté solide."
    },
    {
      icon: Trophy,
      title: "Tournois Premium",
      description: "Compétitions quotidiennes avec des prize pools attractifs. Du casual au pro."
    },
    {
      icon: Users,
      title: "Guerre de Clans",
      description: "Affrontez d'autres clans dans des batailles épiques. Grimpez dans le classement."
    },
    {
      icon: TrendingUp,
      title: "Statistiques Live",
      description: "Suivez vos performances en temps réel. K/D, win rate, et bien plus."
    }
  ];

  const testimonials = [
    {
      quote: "CipherPool a révolutionné ma façon de jouer. Les récompenses sont instantanées, c'est incroyable !",
      name: "Yassine B.",
      role: "Pro Player",
      color: "from-cyan-400 to-blue-500"
    },
    {
      quote: "La meilleure plateforme de tournois au Maroc. L'anti-triche est vraiment efficace.",
      name: "Laila M.",
      role: "Chef de Clan",
      color: "from-purple-400 to-pink-500"
    },
    {
      quote: "Une communauté incroyable et des tournois bien organisés. Je recommande à 100% !",
      name: "Amine K.",
      role: "Streamer",
      color: "from-blue-400 to-cyan-500"
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#06090f] text-white">
      {/* Fond animé global */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
        <MatrixRain />
        <FloatingParticles />
      </div>

      {/* ═══════════ NAVIGATION ═══════════ */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'h-16 bg-[#06090f]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-cyan-500/5' 
            : 'h-20 bg-transparent'
        }`}
      >
        <div className="h-full max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-110">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="font-black text-xl md:text-2xl tracking-tight">
              CIPHER<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">POOL</span>
            </span>
          </Link>

          {/* Liens Desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {['Tournois', 'Arène', 'Clans', 'Classement'].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="relative px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors group"
              >
                {item}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/login")}
              className="hidden sm:block text-xs font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors"
            >
              Connexion
            </button>
            <NeonButton onClick={() => navigate("/register")} className="!px-6 !py-2.5 !text-sm !rounded-xl">
              Rejoindre
            </NeonButton>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/80 hover:text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Menu Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#06090f]/95 backdrop-blur-xl border-b border-white/[0.08] lg:hidden"
          >
            <div className="p-6 flex flex-col gap-4">
              {['Tournois', 'Arène', 'Clans', 'Classement'].map((item) => (
                <Link
                  key={item}
                  to={`/${item.toLowerCase()}`}
                  className="text-lg font-bold text-gray-400 hover:text-cyan-400 transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ HERO ═══════════ */}
      <HeroSection navigate={navigate} />

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="relative py-32 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-7xl font-black text-white mb-6">
              POURQUOI{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                CIPHERPOOL
              </span>
              ?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="relative py-32 px-4 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-purple-500/[0.02]" />
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4">
              PAROLE DE{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                GUERRIERS
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ scale: 1.02 }}
                className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-8 leading-relaxed italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-bold">{t.name}</div>
                    <div className="text-gray-500 text-sm">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="relative py-32 px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-[1]">
            PRÊT À DEVENIR
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              UNE LÉGENDE
            </span>
            ?
          </h2>
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-xl mx-auto">
            L'arène vous attend. Rejoignez l'élite du gaming marocain dès maintenant.
          </p>
          <NeonButton onClick={() => navigate("/register")} className="!px-16 !py-8 !text-2xl !rounded-3xl">
            <Swords size={28} />
            ENTRER DANS L'ARÈNE
            <ArrowRight size={28} />
          </NeonButton>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative py-16 px-4 md:px-8 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-black text-xl">CIPHERPOOL</span>
            </div>
            <div className="flex gap-8">
              {['Confidentialité', 'Conditions', 'Support', 'Discord'].map((item) => (
                <Link key={item} to="/" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors">
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex gap-4">
              {[Coffee, Github].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
          <div className="text-center pt-8 border-t border-white/[0.03]">
            <p className="text-xs text-gray-600">
              © 2026 CipherPool Games. Tous droits réservés. Fait avec ❤️ pour la communauté marocaine.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}