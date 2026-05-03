import { useNavigate } from "react-router-dom";
import { ArrowRight, Trophy, Users, Shield, Zap, Star } from "lucide-react";
import { CircularTestimonials } from "../components/CircularTestimonials";

export default function Home() {
  const navigate = useNavigate();

  const testimonials = [
    {
      name: "Ahmed Pro",
      designation: "Gagnant Elite Cup",
      quote: "CipherPool est la seule plateforme au Maroc qui respecte vraiment les joueurs. Paiements rapides et tournois pro.",
      src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop"
    },
    {
      name: "Yassine Gamer",
      designation: "Chef de Clan",
      quote: "L'interface est super fluide sur mon téléphone. On gère nos matchs sans aucun problème.",
      src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop"
    },
    {
      name: "Sara Esports",
      designation: "Streameuse",
      quote: "Une organisation impeccable. C'est l'avenir de l'esports au Maroc.",
      src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 bg-[#1e293b] rounded-lg flex items-center justify-center font-black text-white text-sm">CP</div>
            <span className="font-black text-lg tracking-tighter">CIPHERPOOL</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/team")} className="text-xs font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Staff</button>
            <button onClick={() => navigate("/login")} className="text-xs font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Login</button>
            <button onClick={() => navigate("/register")} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10">Rejoindre</button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Toornament Style */}
      <section className="pt-32 pb-20 px-6 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
              <Star size={12} fill="currentColor" /> Plateforme n°1 au Maroc
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-8 text-slate-900">
              L'ESPORTS <br/><span className="text-blue-600">PROFESSIONNEL.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium mb-10 max-w-xl leading-relaxed">
              La plateforme ultime pour les compétitions Free Fire. Participe à des tournois organisés, gagne des prix réels et rejoins l'élite du gaming marocain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate("/register")} className="px-8 py-4 bg-[#1e293b] text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3">
                Commencer <ArrowRight size={20} />
              </button>
              <button onClick={() => navigate("/tournaments")} className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                Voir les tournois
              </button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute -inset-4 bg-blue-600/5 rounded-[3rem] blur-3xl" />
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80" 
              alt="Gaming" 
              className="relative rounded-[2.5rem] shadow-2xl border border-slate-200"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
          {[
            { label: "Joueurs", val: "10,000+" },
            { label: "Tournois", val: "500+" },
            { label: "Cashprizes", val: "100k CP" },
            { label: "Clans", val: "150+" },
          ].map((s, i) => (
            <div key={i} className="text-center md:text-left border-l-2 border-blue-600 pl-6">
              <p className="text-3xl font-black text-slate-900 mb-1">{s.val}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials - Using User's Component */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight uppercase italic mb-4">Ils nous font confiance</h2>
          <p className="text-slate-500 font-medium">Découvrez les retours de nos meilleurs joueurs.</p>
        </div>
        <CircularTestimonials testimonials={testimonials} />
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-[#f8fafc] border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: <Trophy className="text-blue-600"/>, title: "Tournois Pro", desc: "Organisation rigoureuse avec des arbitres dédiés pour chaque match." },
              { icon: <Shield className="text-blue-600"/>, title: "Sécurité Totale", desc: "Vérification manuelle des résultats et système anti-cheat performant." },
              { icon: <Zap className="text-blue-600"/>, title: "Paiements Flash", desc: "Retire tes gains instantanément via nos partenaires sécurisés." },
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">{f.icon}</div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-3">{f.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center font-black text-white text-[10px]">CP</div>
            <span className="font-black text-sm tracking-tighter">CIPHERPOOL</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <button className="hover:text-blue-600 transition-colors">Confidentialité</button>
            <button className="hover:text-blue-600 transition-colors">Conditions</button>
            <button className="hover:text-blue-600 transition-colors">Contact</button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 CIPHERPOOL</p>
        </div>
      </footer>
    </div>
  );
}
