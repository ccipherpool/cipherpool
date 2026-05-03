import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Users, MessageSquare, Store, 
  Wallet, BarChart3, ArrowRight, Zap, Star, Shield, Target, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

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

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: 'Cipher Coins', value: profile?.coins || 0, icon: Wallet, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Total XP', value: profile?.xp || 0, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Classement', value: '#12', icon: Trophy, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Victoires', value: '24', icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Welcome Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#14141f] to-[#0a0a0f] border border-white/5 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <Star size={12} fill="currentColor" />
              Saison 1: L'Éveil des Titans
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
              BON RETOUR, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                {profile?.full_name?.split(' ')[0] || 'GUERRIER'}
              </span>
            </h1>
            <p className="text-neutral-400 font-medium text-lg max-w-sm">
              Prêt pour le prochain combat ? Tes stats sont à jour.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/tournaments"
                className="flex items-center gap-3 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95"
              >
                Jouer maintenant
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Level Progress Card */}
          <div className="w-full md:w-96 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-inner">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-1">Niveau Actuel</p>
                <h3 className="text-4xl font-black tracking-tighter">LVL {profile?.level || 1}</h3>
              </div>
              <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <Shield className="text-purple-400" size={32} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                <span>650 XP</span>
                <span>1000 XP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="bg-[#0f0f1a] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group transition-all"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <TrendingUp size={16} className="text-neutral-700" />
            </div>
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-1 relative z-10">{stat.label}</p>
            <h3 className="text-3xl font-black tracking-tighter relative z-10">{stat.value.toLocaleString()}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tighter uppercase italic">Dernières Activités</h2>
            <Link to="/history" className="text-[10px] font-black text-purple-500 uppercase tracking-widest hover:text-purple-400">Voir tout</Link>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="group flex items-center gap-4 p-5 rounded-[1.5rem] bg-[#0f0f1a] border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600/10 group-hover:border-purple-500/20 transition-all">
                  <Trophy size={24} className="text-neutral-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-neutral-200 truncate group-hover:text-white transition-colors">Free Fire Casablanca Cup #{102 + i}</h4>
                  <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Terminé il y a 2h • +500 Coins</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  Victoire
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Leaderboard Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tighter uppercase italic">Top Joueurs</h2>
            <BarChart3 size={20} className="text-neutral-700" />
          </div>
          <div className="bg-[#0f0f1a] border border-white/5 rounded-[2rem] p-6 space-y-6">
            {[
              { name: 'Shadow_FF', xp: '12.5k', rank: 1, color: 'text-yellow-400' },
              { name: 'Cipher_King', xp: '11.2k', rank: 2, color: 'text-neutral-400' },
              { name: 'Elite_Gamer', xp: '10.8k', rank: 3, color: 'text-orange-400' },
            ].map((player, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 bg-white/5 border border-white/5 ${player.color}`}>
                  #{player.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-neutral-200 truncate">{player.name}</p>
                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{player.xp} XP</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            ))}
            <button className="w-full py-4 mt-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
              Classement Complet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
