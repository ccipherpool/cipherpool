import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trophy, Wallet, Zap, Target, ArrowRight, Star, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";
import { BackgroundBeams } from "../components/ui/BackgroundBeams";
import { TextGenerateEffect } from "../components/ui/TextGenerateEffect";

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#f4f7f9]"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const stats = [
    { label: 'Solde CP', value: profile?.coins || 0, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'XP Total', value: profile?.xp || 0, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'Rang', value: profile?.rank || 'Novice', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'Victoires', value: '24', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      <BackgroundBeams className="opacity-20" />
      
      <div className="relative z-10 space-y-10 animate-in fade-in duration-700">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <TextGenerateEffect words={`Bon retour, ${profile?.full_name?.split(' ')[0] || 'Guerrier'} !`} className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic" />
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em] mt-2">Prêt pour ton prochain combat ?</p>
          </div>
          <Link to="/tournaments" className="inline-flex items-center gap-3 px-8 py-4 bg-[#1e293b] hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-black/10 group">
            Voir les tournois <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white p-6 rounded-[2.5rem] border ${s.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
            >
              <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <s.icon size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{s.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" /> Activité Récente
              </h3>
              <Link to="/history" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Voir tout</Link>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-blue-600">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Casablanca Cup #{102 + i}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terminé • +500 CP</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-widest">Gagné</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress & Goals */}
          <div className="space-y-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Award size={18} className="text-blue-600" /> Progression
            </h3>
            <div className="bg-[#1e293b] rounded-[2.5rem] p-8 text-white space-y-8 shadow-xl shadow-blue-900/10">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Niveau {profile?.level || 1}</p>
                    <p className="text-xl font-black tracking-tighter uppercase italic">Vers le rang Gold</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">65%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: "65%" }} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">Continue à participer aux tournois pour débloquer des récompenses exclusives.</p>
              </div>
              
              <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-all shadow-lg">
                Détails du profil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
