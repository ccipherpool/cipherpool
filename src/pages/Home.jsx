import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Shield, Zap, ArrowRight, Sparkles, Target, 
  Medal, Flame, Globe, Crown, Sword, Play, Menu, X,
  Award, Users, Gamepad2, Wallet, TrendingUp
} from "lucide-react";
import { Button } from "../components/ui/Button";

// Composant pour le fond animé avec particules
const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#0a1020]" />
      {/* Particules animées */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
      {/* Grille décorative */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="h-full w-full" style={{
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(56, 189, 248, 0.3) 25%, rgba(56, 189, 248, 0.3) 26%, transparent 27%, transparent 74%, rgba(56, 189, 248, 0.3) 75%, rgba(56, 189, 248, 0.3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(56, 189, 248, 0.3) 25%, rgba(56, 189, 248, 0.3) 26%, transparent 27%, transparent 74%, rgba(56, 189, 248, 0.3) 75%, rgba(56, 189, 248, 0.3) 76%, transparent 77%, transparent)`,
          backgroundSize: '50px 50px'
        }} />
      </div>
    </div>
  );
};

// Composant pour le texte animé avec dégradé
const GradientText = ({ children, className = "" }) => (
  <span className={`bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-gradient ${className}`}>
    {children}
  </span>
);

// Données des témoignages
const testimonials = [
  {
    quote: "CipherPool a complètement changé ma vision du gaming compétitif au Maroc. Le système de récompenses est parfait et instantané.",
    name: "Yassine 'Sniper' B.",
    designation: "Joueur Pro Free Fire",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=yassine"
  },
  {
    quote: "L'interface la plus propre que j'ai jamais vue sur une plateforme de tournois. De l'inscription à la soumission des résultats, tout est fluide.",
    name: "Laila M.",
    designation: "Chef de Clan - Zenith Esports",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=laila"
  },
  {
    quote: "Enfin une plateforme qui prend l'anti-triche au sérieux. L'intégrité compétitive est au cœur de CipherPool.",
    name: "Amine K.",
    designation: "Organisateur de tournois",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amine"
  }
];

// Composant principal Home
export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);

  return (
    <div className="relative min-h-screen bg-[#0a0f1a] overflow-hidden">
      {/* Fond animé */}
      <ParticleBackground />
      
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 flex items-center px-4 md:px-8 lg:px-12 justify-between backdrop-blur-xl bg-[#0a0f1a]/80 border-b border-white/5"
      >
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.6 }}
            className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20"
          >
            <Sparkles size={20} className="text-white" />
          </motion.div>
          <span className="font-black text-xl md:text-2xl tracking-tight text-white">
            CIPHER<span className="text-cyan-400">POOL</span>
          </span>
        </div>

        {/* Navigation Desktop */}
        <div className="hidden lg:flex items-center gap-8 bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-2.5 rounded-full">
          {[
            { label: 'Tournois', path: '/tournaments' },
            { label: 'Arène', path: '/arena' },
            { label: 'Clans', path: '/clans' },
            { label: 'Classement', path: '/leaderboard' }
          ].map((item) => (
            <Link 
              key={item.label}
              to={item.path}
              className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-cyan-400 transition-all duration-300"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => navigate("/login")}
            className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors"
          >
            Connexion
          </button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => navigate("/register")}
            className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl h-9 text-xs font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
          >
            Rejoindre
          </Button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white/80 hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Menu Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#0a0f1a]/95 backdrop-blur-xl border-b border-white/10 p-4 lg:hidden"
          >
            <div className="flex flex-col gap-3">
              {['Tournois', 'Arène', 'Clans', 'Classement'].map((item) => (
                <Link
                  key={item}
                  to={`/${item.toLowerCase()}`}
                  className="text-sm font-bold text-gray-400 hover:text-cyan-400 transition-colors py-2"
                >
                  {item}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 md:px-8">
        <div className="text-center max-w-6xl mx-auto">
          {/* Badge animé */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Le Futur de l'Esport Marocain
          </motion.div>

          {/* Titre principal */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] mb-6"
          >
            ASCENDEZ VERS LA{' '}
            <GradientText>GLOIRE DIGITALE</GradientText>
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            La plateforme de tournois la plus avancée de la région MENA.
            Synchronisation en temps réel, protocoles anti-triche et récompenses instantanées.
          </motion.p>

          {/* Boutons CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Button 
              variant="primary" 
              size="xl" 
              onClick={() => navigate("/register")}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white px-12 py-6 rounded-2xl text-lg font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                INITIALISER LE COMBAT
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </Button>
            
            <Button 
              variant="outline" 
              size="xl" 
              onClick={() => navigate("/tournaments")}
              className="border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 text-white px-10 py-6 rounded-2xl text-lg"
            >
              EXPLORER LES TOURNOIS
            </Button>
          </motion.div>

          {/* Stats rapides */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto"
          >
            {[
              { value: '10K+', label: 'Joueurs Actifs' },
              { value: '500+', label: 'Tournois/Mois' },
              { value: '99.9%', label: 'Anti-Triche' },
              { value: '24/7', label: 'Support' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-xs md:text-sm text-gray-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Indicateur de scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.3 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-[1px] h-16 bg-gradient-to-b from-cyan-400 to-transparent" 
          />
          <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-cyan-400">
            Scroller pour synchroniser
          </span>
        </motion.div>
      </section>

      {/* Section Features */}
      <section className="relative py-32 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Titre de section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
              POURQUOI <GradientText>CIPHERPOOL</GradientText> ?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Une expérience de jeu compétitive sans précédent, conçue pour les vrais guerriers du gaming.
            </p>
          </motion.div>

          {/* Grille de features */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield size={32} className="text-cyan-400" />,
                title: "Sécurité Tactique",
                description: "Chaque match est audité par IA et arbitres professionnels. Efficacité anti-triche de 99.9%."
              },
              {
                icon: <Zap size={32} className="text-cyan-400" />,
                title: "Récompenses Instantanées",
                description: "Système de wallet intégré pour une distribution des gains en temps réel."
              },
              {
                icon: <Globe size={32} className="text-cyan-400" />,
                title: "Réseau Mondial",
                description: "Connectez-vous avec plus de 10,000 guerriers marocains vérifiés."
              },
              {
                icon: <Trophy size={32} className="text-cyan-400" />,
                title: "Tournois Premium",
                description: "Des compétitions quotidiennes avec des prize pools attractifs."
              },
              {
                icon: <Users size={32} className="text-cyan-400" />,
                title: "Système de Clans",
                description: "Créez ou rejoignez des clans, participez à des guerres de clans épiques."
              },
              {
                icon: <TrendingUp size={32} className="text-cyan-400" />,
                title: "Classement Live",
                description: "Suivez votre progression en temps réel avec des statistiques détaillées."
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Témoignages */}
      <section className="relative py-32 px-4 md:px-8 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
              CE QUE DISENT NOS <GradientText>GUERRIERS</GradientText>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{testimonial.name}</div>
                    <div className="text-gray-500 text-xs">{testimonial.designation}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative py-32 px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-[1.1]">
            REJOIGNEZ <GradientText>L'ÉLITE</GradientText>
          </h2>
          <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
            Ne restez pas spectateur. Devenez une légende. L'arène vous attend.
          </p>
          <Button 
            variant="primary" 
            size="xl" 
            onClick={() => navigate("/register")}
            className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white px-16 py-8 rounded-2xl text-xl font-bold shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300"
          >
            ENTRER DANS L'ARÈNE
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 md:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg" />
              <span className="font-black text-white">CIPHERPOOL</span>
            </div>
            <div className="flex gap-8">
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Confidentialité</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Conditions</Link>
              <Link to="/support" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Support</Link>
            </div>
            <p className="text-xs text-gray-600">
              © 2026 CipherPool Protocols. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Styles globaux */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s linear infinite;
        }
      `}</style>
    </div>
  );
}