import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Users, Gamepad2, Sparkles, Shield, Star, Zap } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Trophy className="w-8 h-8" />,
      title: "Tournois Compétitifs",
      description: "Des tournois quotidiens avec des cashprizes réels et une organisation pro.",
      color: "from-yellow-500/20 to-orange-500/20",
      border: "border-yellow-500/30"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Système Anti-Cheat",
      description: "Une vérification rigoureuse pour garantir l'équité de chaque match.",
      color: "from-blue-500/20 to-indigo-500/20",
      border: "border-blue-500/30"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Clans & Équipes",
      description: "Créez votre clan, recrutez des joueurs et dominez le classement national.",
      color: "from-purple-500/20 to-pink-500/20",
      border: "border-purple-500/30"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Paiements Rapides",
      description: "Récupérez vos gains instantanément via nos méthodes de paiement sécurisées.",
      color: "from-green-500/20 to-emerald-500/20",
      border: "border-green-500/30"
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
              CP
            </div>
            <span className="font-black text-xl tracking-tighter">CIPHERPOOL</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-neutral-400 uppercase tracking-widest">
            <button onClick={() => navigate("/tournaments")} className="hover:text-white transition-colors">Tournois</button>
            <button onClick={() => navigate("/leaderboard")} className="hover:text-white transition-colors">Classement</button>
            <button onClick={() => navigate("/team")} className="hover:text-white transition-colors">Staff</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/login")} className="hidden sm:block text-sm font-bold text-neutral-400 hover:text-white uppercase tracking-widest px-4 py-2 transition-colors">Connexion</button>
            <button 
              onClick={() => navigate("/register")}
              className="bg-white text-black px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-white/5"
            >
              Rejoindre
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-60 md:pb-40 px-6">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-[20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">La Plateforme n°1 au Maroc</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]"
            >
              L'ESPORTS <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500">
                SANS LIMITES.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl leading-relaxed font-medium"
            >
              Rejoins des milliers de joueurs, participe à des tournois exclusifs Free Fire et transforme tes victoires en récompenses réelles. 
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={() => navigate("/register")}
                className="px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-purple-500/20 flex items-center justify-center gap-3 group"
              >
                Commencer l'aventure
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/tournaments")}
                className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center"
              >
                Voir les tournois
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-8 rounded-3xl bg-gradient-to-br ${f.color} border ${f.border} backdrop-blur-xl group hover:-translate-y-2 transition-all duration-500`}
              >
                <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black mb-3 tracking-tight uppercase">{f.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: "Joueurs", val: "10K+" },
            { label: "Tournois", val: "500+" },
            { label: "Gains", val: "1M+" },
            { label: "Clans", val: "120+" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl md:text-6xl font-black mb-2 tracking-tighter">{s.val}</p>
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto p-12 md:p-24 rounded-[3rem] bg-gradient-to-br from-purple-600 to-indigo-700 relative overflow-hidden shadow-2xl shadow-purple-500/20"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-none">PRÊT À DEVENIR <br/>UNE LÉGENDE ?</h2>
            <button 
              onClick={() => navigate("/register")}
              className="bg-white text-black px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-widest hover:scale-105 transition-all active:scale-95"
            >
              Rejoindre CipherPool
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center font-black text-sm">CP</div>
            <span className="font-black tracking-tighter">CIPHERPOOL</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black text-neutral-600 uppercase tracking-widest">
            <span>© 2026 Tous droits réservés</span>
            <button className="hover:text-white transition-colors">Privacy Policy</button>
            <button className="hover:text-white transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
