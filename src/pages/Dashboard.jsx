import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Users, MessageSquare, Store, 
  Wallet, BarChart3, ArrowRight, Zap 
} from 'lucide-react';
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

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: 'Coins', value: profile?.coins || 0, icon: Wallet, color: 'text-yellow-400' },
    { label: 'XP', value: profile?.xp || 0, icon: Zap, color: 'text-brand-primary' },
    { label: 'Rank', value: '#1', icon: Trophy, color: 'text-pink-400' },
    { label: 'Wins', value: '42', icon: BarChart3, color: 'text-blue-400' },
  ];

  const quickLinks = [
    { title: 'Join Tournament', desc: 'Compete for prizes', icon: Trophy, path: '/tournaments', color: 'from-brand-primary to-brand-secondary' },
    { title: 'Global Chat', desc: 'Connect with players', icon: MessageSquare, path: '/chat', color: 'from-blue-500 to-blue-600' },
    { title: 'My Clan', desc: 'Manage your team', icon: Users, path: '/clans', color: 'from-emerald-500 to-emerald-600' },
    { title: 'Store', desc: 'Browse items', icon: Store, path: '/store', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-dark-850 border border-neutral-700 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-brand-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold uppercase tracking-wide">
              <Zap size={14} />
              Season 1 Active
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
              Welcome back, <span className="text-brand-primary">{profile?.full_name?.split(' ')[0] || 'Player'}</span>
            </h1>
            <p className="text-neutral-400 leading-relaxed">
              Your stats are ready. Keep grinding and dominate the leaderboard.
            </p>
            <Link 
              to="/tournaments"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-semibold transition-colors duration-200 w-fit"
            >
              Play Now
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Profile Card */}
          <div className="w-full md:w-80 bg-dark-900 border border-neutral-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Current Level</span>
              <span className="text-2xl font-display font-bold text-brand-primary">12</span>
            </div>
            <div className="space-y-3">
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-gradient-to-r from-brand-primary to-brand-secondary" />
              </div>
              <div className="flex justify-between text-xs text-neutral-400 font-medium">
                <span>650 XP</span>
                <span>1000 XP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{stat.label}</span>
              <stat.icon size={20} className={stat.color} />
            </div>
            <h3 className="text-3xl font-display font-bold">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, i) => (
            <Link 
              key={i}
              to={link.path}
              className="group relative overflow-hidden rounded-xl border border-neutral-700 bg-dark-850 p-6 hover:border-neutral-600 hover:bg-dark-800 transition-all duration-200"
            >
              <div className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l ${link.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-dark-900 border border-neutral-700 flex items-center justify-center mb-4 group-hover:border-neutral-600 transition-colors duration-200">
                  <link.icon size={24} className="text-neutral-300" />
                </div>
                <h4 className="font-semibold text-neutral-100 mb-1">{link.title}</h4>
                <p className="text-sm text-neutral-400">{link.desc}</p>
              </div>

              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ArrowRight size={20} className="text-neutral-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-display font-bold">Recent Tournaments</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="card-interactive flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-dark-900 border border-neutral-700 flex items-center justify-center flex-shrink-0">
                  <Trophy size={20} className="text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-neutral-100 truncate">Free Fire Elite Cup #{102 + i}</h4>
                  <p className="text-xs text-neutral-400">Completed 2 hours ago • 5000 Coins</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex-shrink-0">Won</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">Top Players</h2>
          <div className="card space-y-4">
            {[
              { name: 'Shadow_FF', xp: '12.5k', rank: 1 },
              { name: 'Cipher_King', xp: '11.2k', rank: 2 },
              { name: 'Elite_Gamer', xp: '10.8k', rank: 3 },
            ].map((player, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-dark-900 text-neutral-400'
                }`}>
                  {player.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-neutral-100 truncate">{player.name}</p>
                  <p className="text-xs text-neutral-400">{player.xp} XP</p>
                </div>
              </div>
            ))}
            <button className="w-full py-3 mt-4 border border-neutral-700 hover:bg-dark-800 rounded-lg text-sm font-medium transition-colors duration-200">
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
