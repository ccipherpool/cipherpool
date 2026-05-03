import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Trophy, Users, Gamepad2, Sparkles } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Tournois Compétitifs",
      description: "Participez à des tournois passionnants et gagnez des récompenses",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Rejoignez des Équipes",
      description: "Formez ou rejoignez des équipes pour dominer les classements",
    },
    {
      icon: <Gamepad2 className="w-6 h-6" />,
      title: "Gameplay Immersif",
      description: "Expérience de jeu optimisée avec des statistiques en temps réel",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Récompenses Instantanées",
      description: "Gagnez des coins et des XP à chaque victoire",
    },
  ];

  const stats = [
    { number: "10K+", label: "Joueurs Actifs" },
    { number: "500+", label: "Tournois Mensuels" },
    { number: "1M+", label: "Coins Distribués" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-dark-950 text-neutral-100 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center font-bold text-white text-sm font-display">
              CP
            </div>
            <span className="font-bold text-lg font-display tracking-tight">CipherPool</span>
          </div>
          <div className="flex gap-3 items-center">
            <button 
              onClick={() => navigate("/team")}
              className="px-4 py-2 text-neutral-300 hover:text-neutral-100 transition-colors duration-200 font-medium"
            >
              Équipe
            </button>
            <button 
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-neutral-300 hover:text-neutral-100 transition-colors duration-200 font-medium"
            >
              Se connecter
            </button>
            <button 
              onClick={() => navigate("/register")}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors duration-200"
            >
              S'inscrire
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-brand-primary/10 border border-brand-primary/30 rounded-full"
          >
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary">Plateforme de Gaming Premium</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold mb-6 font-display tracking-tight"
          >
            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
              Dominez le Jeu
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            La plateforme ultime pour les joueurs de Free Fire. Participez à des tournois, rejoignez des équipes et gagnez des récompenses.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex gap-4 justify-center flex-wrap"
          >
            <button
              onClick={() => navigate("/register")}
              className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 group"
            >
              Commencer maintenant
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-neutral-100 border border-neutral-700 rounded-lg font-medium transition-colors duration-200"
            >
              Se connecter
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-neutral-800/50">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16 font-display"
          >
            Pourquoi CipherPool?
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group p-6 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-dark-850/50 hover:bg-dark-800/50 transition-all duration-300 cursor-pointer"
              >
                <div className="text-brand-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 font-display">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-dark-900/50 border-y border-neutral-800/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center p-6 rounded-xl border border-neutral-800/50 bg-dark-850/30 hover:bg-dark-800/50 transition-all duration-300"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-5xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent mb-2 font-display">
                  {stat.number}
                </div>
                <p className="text-neutral-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border border-brand-primary/30 rounded-xl p-12 text-center backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4 font-display">Prêt à commencer?</h2>
          <p className="text-neutral-400 mb-8">
            Rejoignez des milliers de joueurs et commencez votre aventure dès maintenant.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2"
          >
            Créer un compte gratuit
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-8 px-6 text-center text-neutral-500 bg-dark-900/50">
        <p>&copy; 2026 CipherPool. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
