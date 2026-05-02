import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Trophy, Users, MessageSquare, 
  Wallet, Star, TrendingUp, Award, 
  ChevronRight, Play, Clock, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    tournaments: 0,
    wins: 0,
    rank: 'Bronze',
    nextRankXp: 1000
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const quickActions = [
    { title: 'Rejoindre un Tournoi', desc: 'Gagnez des prix réels', icon: Trophy, color: 'from-cp-primary to-purple-600', path: '/tournaments' },
    { title: 'Chat Global', desc: 'Discutez avec la communauté', icon: MessageSquare, color: 'from-blue-500 to-cp-secondary', path: '/chat' },
    { title: 'Mon Clan', desc: 'Gérez votre équipe', icon: Users, color: 'from-cp-accent to-emerald-600', path: '/clans' },
    { title: 'Boutique', desc: 'Échangez vos coins', icon: Wallet, color: 'from-orange-500 to-yellow-500', path: '/store' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-cp-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pb-20"
    >
      {/* Hero Welcome Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cp-primary/20 via-[#0d0d14] to-cp-secondary/10 border border-white/5 p-8 lg:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.2)_0%,_transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cp-primary/10 border border-cp-primary/20 text-cp-primary text-xs font-bold uppercase tracking-widest">
              <Zap size={14} className="fill-cp-primary" />
              Saison 1 en cours
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-4xl lg:text-6xl font-black tracking-tighter">
              BIENVENUE, <span className="text-cp-primary uppercase">{profile?.full_name?.split(' ')[0] || 'JOUEUR'}</span> !
            </motion.h1>
            <motion.p variants={itemVariants} className="text-white/50 max-w-md text-lg font-medium leading-relaxed">
              Prêt pour la victoire ? Vos statistiques sont à jour. Dominez le classement aujourd'hui.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
              <Link to="/tournaments" className="px-8 py-4 bg-cp-primary hover:bg-cp-primary/80 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-2 group">
                <Play size={18} className="fill-white" />
                JOUER MAINTENANT
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* User Quick Stats Card */}
          <motion.div variants={itemVariants} className="bg-[#0d0d14]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 w-full lg:w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Niveau Actuel</span>
              <Shield size={20} className="text-cp-primary" />
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-black leading-none">12</span>
              <span className="text-cp-primary font-bold mb-1">PRO</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-cp-primary to-cp-secondary" 
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-tighter">
              <span>650 XP</span>
              <span>1000 XP</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: 'Coins', value: profile?.coins || 0, icon: Wallet, color: 'text-yellow-400' },
          { label: 'XP Total', value: profile?.xp || 0, icon: Star, color: 'text-cp-primary' },
          { label: 'Victoires', value: stats.wins, icon: Trophy, color: 'text-cp-accent' },
          { label: 'Tendance', value: '+12%', icon: TrendingUp, color: 'text-cp-secondary' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl lg:text-3xl font-black tracking-tighter">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions Hub */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase">Accès Rapide</h2>
          <Link to="/dashboard" className="text-cp-primary text-xs font-bold hover:underline tracking-widest">VOIR TOUT</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Link 
                to={action.path}
                className="group relative block h-48 overflow-hidden rounded-[2rem] border border-white/5 bg-white/5 hover:border-white/20 transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="absolute top-6 left-6 p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                  <action.icon size={24} className="text-white" />
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h4 className="text-xl font-black tracking-tighter uppercase mb-1">{action.title}</h4>
                  <p className="text-white/40 text-xs font-medium">{action.desc}</p>
                </div>
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <ChevronRight size={20} className="text-white" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Activity & Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Derniers Tournois</h2>
            <Clock size={20} className="text-white/20" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer">
                <div className="w-16 h-16 rounded-xl bg-[#050508] border border-white/10 flex items-center justify-center">
                  <Trophy size={24} className="text-cp-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg tracking-tight">Free Fire Elite Cup #{i+102}</h4>
                  <p className="text-white/40 text-xs font-medium">Terminé il y a 2 heures • 5000 Coins</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-cp-accent/10 text-cp-accent text-[10px] font-black uppercase tracking-widest">Gagné</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Top Joueurs</h2>
            <Award size={20} className="text-yellow-400" />
          </div>
          <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-6">
            {[
              { name: 'Shadow_FF', xp: '12.5k', rank: 1 },
              { name: 'Cipher_King', xp: '11.2k', rank: 2 },
              { name: 'Elite_Gamer', xp: '10.8k', rank: 3 },
            ].map((player, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white/40'}`}>
                  {player.rank}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{player.name}</p>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{player.xp} XP</p>
                </div>
                <ChevronRight size={16} className="text-white/10" />
              </div>
            ))}
            <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">
              Voir le classement complet
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
