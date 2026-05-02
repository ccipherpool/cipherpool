import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import { ArrowRight, Zap, Trophy, Users, Gamepad2 } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Trophy className="w-8 h-8" />,
      title: "Tournois Compétitifs",
      description: "Participez à des tournois passionnants et gagnez des récompenses",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Rejoignez des Équipes",
      description: "Formez ou rejoignez des équipes pour dominer les classements",
    },
    {
      icon: <Gamepad2 className="w-8 h-8" />,
      title: "Gameplay Immersif",
      description: "Expérience de jeu optimisée avec des statistiques en temps réel",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Récompenses Instantanées",
      description: "Gagnez des coins et des XP à chaque victoire",
    },
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
    <div className="min-h-screen bg-bg-base text-text-primary overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-surface/80 backdrop-blur-md border-b border-primary-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-white text-sm">
              CP
            </div>
            <span className="font-bold text-lg">CIPHERPOOL</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
            <Button variant="primary" onClick={() => navigate("/register")}>
              S'inscrire
            </Button>
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
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold mb-6 gradient-text-primary"
          >
            Bienvenue à CipherPool
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto"
          >
            La plateforme ultime pour les joueurs de Free Fire. Participez à des tournois,
            rejoignez des équipes et gagnez des récompenses épiques.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex gap-4 justify-center flex-wrap"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/register")}
              className="gap-2"
            >
              Commencer maintenant
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/login")}
            >
              Se connecter
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-primary-900/10">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-16"
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
                className="bg-bg-card border border-primary-900/30 rounded-xl p-6 hover:border-primary-500/50 transition-all group"
              >
                <div className="text-primary-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {[
              { number: "10K+", label: "Joueurs Actifs" },
              { number: "500+", label: "Tournois Mensuels" },
              { number: "1M+", label: "Coins Distribués" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-5xl font-bold text-primary-400 mb-2">
                  {stat.number}
                </div>
                <p className="text-text-secondary">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto bg-gradient-to-r from-primary-600/20 to-secondary-600/20 border border-primary-500/30 rounded-2xl p-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4">Prêt à commencer?</h2>
          <p className="text-text-secondary mb-8">
            Rejoignez des milliers de joueurs et commencez votre aventure dès maintenant.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/register")}
          >
            Créer un compte gratuit
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary-900/30 py-8 px-6 text-center text-text-secondary">
        <p>&copy; 2026 CipherPool. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
