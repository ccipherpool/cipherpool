import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Wallet, Zap, Target, ArrowRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const stats = [
    { label: 'Coins', value: profile?.coins || 0, icon: Wallet, color: 'text-blue-600' },
    { label: 'XP', value: profile?.xp || 0, icon: Zap, color: 'text-orange-500' },
    { label: 'Rang', value: '#12', icon: Trophy, color: 'text-yellow-500' },
    { label: 'Wins', value: '24', icon: Target, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
            <Star size={12} fill="currentColor" /> Saison 1 Active
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Salut, {profile?.full_name?.split(' ')[0] || 'Guerrier'} !
          </h1>
          <p className="text-slate-500 font-medium mb-6">Tes statistiques sont prêtes. Prêt pour le combat ?</p>
          <Link to="/tournaments" className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
            VOIR LES TOURNOIS <ArrowRight size={18} />
          </Link>
        </div>
        
        {/* Progress Circle/Card */}
        <div className="w-full md:w-64 bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Niveau {profile?.level || 1}</span>
            <span className="text-xs font-bold text-slate-600">650 / 1000 XP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity (Simplified) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-black text-sm uppercase tracking-widest text-slate-900">Derniers Matchs</h2>
          <Link to="/history" className="text-[10px] font-bold text-blue-600 uppercase">Voir tout</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Trophy size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Casablanca Cup #{102 + i}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Terminé • +500 CP</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase">Won</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
