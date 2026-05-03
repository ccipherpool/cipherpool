import { useNavigate } from "react-router-dom";
import { ArrowRight, Trophy, Users, Shield, Zap, Star } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-sm">CP</div>
            <span className="font-black text-lg tracking-tighter">CIPHERPOOL</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/login")} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest px-2">Login</button>
            <button onClick={() => navigate("/register")} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10">Rejoindre</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
            <Star size={12} fill="currentColor" /> Plateforme n°1 au Maroc
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-8 text-slate-900">
            DOMINE LA <br/><span className="text-blue-600 text-outline">COMPÉTITION.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            Participe à des tournois Free Fire organisés, gagne des prix et grimpe dans le classement national. Simple, rapide et sécurisé.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate("/register")} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3">
              Commencer <ArrowRight size={20} />
            </button>
            <button onClick={() => navigate("/tournaments")} className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              Voir les tournois
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: <Trophy className="text-blue-600"/>, title: "Tournois Pro", desc: "Organisation rigoureuse et cashprizes garantis pour chaque compétition." },
            { icon: <Shield className="text-blue-600"/>, title: "Sécurité", desc: "Vérification manuelle des résultats et système anti-cheat performant." },
            { icon: <Zap className="text-blue-600"/>, title: "Rapidité", desc: "Inscription en 2 clics et retrait des gains sans attente." },
          ].map((f, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100">{f.icon}</div>
              <h3 className="text-lg font-black uppercase tracking-tight mb-3">{f.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-12 md:gap-24">
          {[
            { label: "Joueurs", val: "10,000+" },
            { label: "Tournois", val: "500+" },
            { label: "Distribués", val: "100k CP" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-black text-slate-900 mb-1">{s.val}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 CIPHERPOOL • TOUS DROITS RÉSERVÉS</p>
      </footer>
    </div>
  );
}
