import { useState, useEffect, useRef } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import { 
  User, 
  Trophy, 
  BarChart3, 
  Wallet, 
  Settings, 
  Award, 
  History, 
  ShieldCheck, 
  Gamepad2, 
  Sword,
  Target,
  Flame,
  Star,
  ChevronRight,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all text-xs font-black uppercase tracking-widest ${
      active 
        ? 'border-mint text-mint bg-mint/5' 
        : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const KPICard = ({ label, value, icon: Icon, colorClass, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-card p-6 flex flex-col justify-between"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 group-hover:${colorClass} transition-colors`}>
        <Icon size={20} />
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-3xl font-heading font-black text-white">{value}</p>
    </div>
  </motion.div>
);

export default function Profile() {
  const { profile: ap, refreshProfile } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarInputRef = useRef(null);
  const { profile: dp, stats, achievements, recentMatches, loading } = useProfileData(ap?.id);

  const profile = dp || ap;

  const openEdit = () => {
    setEditForm({
      username: profile?.username || "",
      bio: profile?.bio || "",
      free_fire_id: profile?.free_fire_id || "",
      city: profile?.city || "",
      country: profile?.country || "",
    });
    setAvatarPreview(null);
    setAvatarFile(null);
    setShowEdit(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!profile?.id || saving) return;
    setSaving(true);
    let avatarUrl = profile?.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData?.publicUrl + `?t=${Date.now()}`;
      }
    }

    const { error } = await supabase.from("profiles").update({
      username: editForm.username.trim(),
      bio: editForm.bio.trim(),
      free_fire_id: editForm.free_fire_id.trim(),
      city: editForm.city.trim(),
      country: editForm.country.trim(),
      ...(avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
    }).eq("id", profile.id);
    if (!error) {
      await refreshProfile?.();
      setShowEdit(false);
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="relative rounded-[32px] overflow-hidden border border-white/5 bg-obsidian-light p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-mint/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8">
          {/* Avatar */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-mint to-cyber-gold rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative w-32 h-32 md:w-40 md:h-32 rounded-[28px] bg-obsidian border-2 border-white/10 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-heading font-black text-mint">
                  {profile?.username?.[0]?.toUpperCase() || 'P'}
                </div>
              )}
            </div>
            <div className="absolute -bottom-3 -right-3 bg-mint text-obsidian px-3 py-1 rounded-xl border-4 border-obsidian font-black text-sm shadow-neon-mint">
              LVL {profile?.level || 1}
            </div>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-3">
              <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase text-white">
                {profile?.username || profile?.email?.split('@')[0]}
              </h1>
              {profile?.verification_status === 'approved' && (
                <div className="px-3 py-1 rounded-full bg-mint/10 border border-mint/20 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-mint" />
                  <span className="text-[10px] font-black text-mint uppercase tracking-widest">Verified Pro</span>
                </div>
              )}
            </div>
            
            <p className="text-slate-400 font-medium max-w-xl mb-6">
              {profile?.bio || "No tactical bio provided. High-performance gaming unit operational since 2026."}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="space-y-1.5 w-full md:w-64">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">XP Progression</span>
                  <span className="text-white">{(profile?.xp || 0) % 1000} / 1000</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((profile?.xp || 0) % 1000) / 10}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-mint to-mint-dark" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex gap-3">
            <Button variant="outline" size="md" className="gap-2" onClick={openEdit}>
              <Settings size={16} /> Edit Profile
            </Button>
            <Button variant="primary" size="md" className="gap-2">
              <Sparkles size={16} /> Showcase
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-white/5 flex overflow-x-auto scrollbar-hide">
        <TabButton active={activeTab === 'overview'} icon={BarChart3} label="Overview" onClick={() => setActiveTab('overview')} />
        <TabButton active={activeTab === 'matches'} icon={History} label="Match History" onClick={() => setActiveTab('matches')} />
        <TabButton active={activeTab === 'achievements'} icon={Award} label="Achievements" onClick={() => setActiveTab('achievements')} />
        <TabButton active={activeTab === 'wallet'} icon={Wallet} label="Economy" onClick={() => setActiveTab('wallet')} />
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <KPICard label="Total Matches" value={stats?.total_matches || 0} icon={Gamepad2} colorClass="text-mint" delay={0.1} />
                <KPICard label="Win Rate" value={`${stats?.total_matches ? Math.round((stats.wins / stats.total_matches) * 100) : 0}%`} icon={Trophy} colorClass="text-cyber-gold" delay={0.2} />
                <KPICard label="K/D Ratio" value={stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : stats?.kills || 0} icon={Target} colorClass="text-mint" delay={0.3} />
                <KPICard label="Total Kills" value={stats?.kills || 0} icon={Sword} colorClass="text-cyber-gold" delay={0.4} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                  <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                    <History className="text-mint" size={20} /> Latest Activity
                  </h3>
                  <div className="space-y-4">
                    {recentMatches?.slice(0, 5).map((match, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${
                             match.position === 1 ? 'bg-mint text-obsidian' : 'bg-white/5 text-slate-400'
                           }`}>
                             #{match.position}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-white uppercase">{match.matches?.tournaments?.name || 'Tournament Match'}</p>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(match.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-mint">+{match.reward || 0} CP</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.kills} KILLS</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-8">
                  <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                    <Award className="text-cyber-gold" size={20} /> Recent Badges
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {achievements?.slice(0, 4).map((ach, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                         <div className="text-2xl">{ach.achievements?.icon || '🏆'}</div>
                         <div>
                            <p className="text-xs font-black text-white uppercase truncate">{ach.achievements?.name}</p>
                            <p className="text-[10px] font-medium text-slate-500">Unlocked</p>
                         </div>
                      </div>
                    ))}
                    {achievements?.length === 0 && (
                       <div className="col-span-2 py-10 text-center text-slate-600 italic">
                          No achievements unlocked yet. Time to hit the arena!
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Other tabs would follow same pattern... */}
          {activeTab !== 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center glass-card"
            >
               <h3 className="text-xl font-heading font-black text-white uppercase mb-2">Module Offline</h3>
               <p className="text-slate-500 text-sm uppercase tracking-widest font-black">Coming Soon in v2.0</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {showEdit && editForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
              onClick={() => setShowEdit(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[310] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-md rounded-[2rem] border border-white/10 p-8 space-y-5"
                style={{ background: "rgba(7,7,26,0.97)", backdropFilter: "blur(40px)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight">Modifier le Profil</h2>
                  <button onClick={() => setShowEdit(false)} className="p-2 text-slate-500 hover:text-white transition-colors">✕</button>
                </div>

                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="relative w-24 h-24 rounded-[20px] border-2 border-dashed border-white/20 overflow-hidden cursor-pointer hover:border-mint/50 transition-colors group"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {(avatarPreview || profile?.avatar_url) ? (
                      <img
                        src={avatarPreview || profile.avatar_url}
                        className="w-full h-full object-cover"
                        alt="Avatar"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-heading font-black text-mint">
                        {profile?.username?.[0]?.toUpperCase() || 'P'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Changer</span>
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Cliquer pour changer la photo</p>
                </div>

                {[
                  { key: "username",     label: "Nom d'utilisateur", placeholder: "Ex: ShadowKill" },
                  { key: "free_fire_id", label: "ID Free Fire",      placeholder: "Ex: 123456789"  },
                  { key: "city",         label: "Ville",             placeholder: "Ex: Casablanca"  },
                  { key: "country",      label: "Pays",              placeholder: "Ex: Maroc"       },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{label}</label>
                    <input
                      value={editForm[key]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-mint/40 transition-colors"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Décris ton style de jeu..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-mint/40 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowEdit(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-colors">
                    Annuler
                  </button>
                  <button onClick={saveProfile} disabled={saving}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-obsidian disabled:opacity-50 transition-all"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)" }}>
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
