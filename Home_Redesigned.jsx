import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Trophy, Shield, Zap, Star, Users, Crown, Flame, Target, Sparkles, ChevronDown } from "lucide-react";

// Animated gradient text
function GradientText({ text, className = "" }) {
  return (
    <span className={`bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent ${className}`}>
      {text}
    </span>
  );
}

// Feature Card
function FeatureCard({ icon: Icon, title, description, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className="group rounded-2xl p-8 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all hover:scale-105"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
      }}
    >
      <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all w-fit">
        <Icon className="w-6 h-6 text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// Testimonial Card
function TestimonialCard({ name, role, quote, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className="rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
      }}
    >
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-white/80 text-sm mb-4 italic">"{quote}"</p>
      <div>
        <p className="text-white font-bold text-sm">{name}</p>
        <p className="text-white/50 text-xs">{role}</p>
      </div>
    </motion.div>
  );
}

// Stat Box
function StatBox({ value, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className="text-center"
    >
      <p className="text-4xl md:text-5xl font-black mb-2">
        <GradientText text={value} />
      </p>
      <p className="text-white/60 text-sm font-medium">{label}</p>
    </motion.div>
  );
}

export default function Home_Redesigned() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 backdrop-blur-xl border-b border-white/10 z-40"
          style={{ background: "rgba(15,23,42,0.8)" }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white">
                CP
              </div>
              <span className="font-black text-xl tracking-wider">CIPHERPOOL</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/60 hover:text-white transition-colors text-sm font-medium">
                Fonctionnalités
              </a>
              <a href="#tournaments" className="text-white/60 hover:text-white transition-colors text-sm font-medium">
                Tournois
              </a>
              <a href="#community" className="text-white/60 hover:text-white transition-colors text-sm font-medium">
                Communauté
              </a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all text-sm font-medium"
              >
                Connexion
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all text-sm font-bold"
              >
                S'inscrire
              </button>
            </div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)"
              }}
            >
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Plateforme n°1 Esports Maroc</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-7xl lg:text-8xl font-black leading-tight mb-6"
            >
              <span className="block mb-2">Dominez le jeu.</span>
              <GradientText text="Rejoignez l'élite." className="text-6xl md:text-7xl lg:text-8xl" />
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Participez aux tournois Free Fire les plus compétitifs du Maroc, gagnez des prix réels et devenez une légende du gaming.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <button
                onClick={() => navigate("/register")}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-lg transition-all flex items-center gap-2 group"
              >
                Commencer maintenant
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/tournaments")}
                className="px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 text-white font-bold text-lg transition-all"
              >
                Voir les tournois
              </button>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex justify-center"
            >
              <ChevronDown size={24} className="text-white/40" />
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatBox value="1K+" label="Joueurs actifs" delay={0} />
              <StatBox value="50+" label="Tournois" delay={0.1} />
              <StatBox value="10K" label="CP distribués" delay={0.2} />
              <StatBox value="20+" label="Clans" delay={0.3} />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Pourquoi choisir <GradientText text="CipherPool" />
              </h2>
              <p className="text-white/60 text-lg max-w-2xl">
                Une plateforme complète pour les joueurs sérieux qui veulent compétitionner et gagner.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={Trophy}
                title="Tournois Pro"
                description="Organisation rigoureuse avec arbitres dédiés pour chaque match. Du solo au squad."
                delay={0}
              />
              <FeatureCard
                icon={Shield}
                title="Sécurité Totale"
                description="Vérification manuelle des résultats et système anti-cheat performant."
                delay={0.1}
              />
              <FeatureCard
                icon={Zap}
                title="Paiements Flash"
                description="Retirez vos gains instantanément via nos partenaires sécurisés."
                delay={0.2}
              />
              <FeatureCard
                icon={Users}
                title="Communauté Active"
                description="Rejoignez une communauté de 10,000+ joueurs passionnés."
                delay={0.3}
              />
              <FeatureCard
                icon={Crown}
                title="Système de Classement"
                description="Montez les rangs et débloquez des récompenses exclusives."
                delay={0.4}
              />
              <FeatureCard
                icon={Flame}
                title="Événements Spéciaux"
                description="Participez à des événements exclusifs avec des prix énormes."
                delay={0.5}
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="community" className="py-20 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Ce que disent nos <GradientText text="joueurs" />
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TestimonialCard
                name="Ahmed Pro"
                role="Gagnant Elite Cup"
                quote="CipherPool est la seule plateforme au Maroc qui respecte vraiment les joueurs. Paiements rapides et tournois ultra-pros."
                delay={0}
              />
              <TestimonialCard
                name="Yassine Gamer"
                role="Chef de Clan"
                quote="L'interface est super fluide sur mobile. On gère nos matchs sans le moindre problème. Top niveau."
                delay={0.1}
              />
              <TestimonialCard
                name="Sara Esports"
                role="Streameuse & Compétitrice"
                quote="Une organisation impeccable. C'est vraiment l'avenir de l'esports au Maroc. Je recommande à 100%."
                delay={0.2}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                Prêt à <GradientText text="dominer" /> ?
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
                Rejoignez des milliers de joueurs qui gagnent déjà sur CipherPool.
              </p>
              <button
                onClick={() => navigate("/register")}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-lg transition-all flex items-center gap-2 group mx-auto"
              >
                S'inscrire gratuitement
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-sm">© 2026 CipherPool. Tous droits réservés.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-white/60 hover:text-white transition-colors text-sm">
                Conditions
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors text-sm">
                Confidentialité
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors text-sm">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
