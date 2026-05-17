import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import {
  User, Trophy, BarChart3, Wallet, Settings, Award, History,
  ShieldCheck, Gamepad2, Sword, Target, Flame, Star, X, Upload,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── XP RING ─────────────────────────────────────────────────────────────────
const XpRing = ({ progress, size = 120, children }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none"
          stroke="#6366f1" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

// ─── KPI CARD ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className="cp-card p-5 group overflow-hidden relative"
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}0d, transparent)` }}
    />
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
      style={{ background: `${accent}1a`, border: `1px solid ${accent}33` }}
    >
      <Icon size={16} style={{ color: accent }} />
    </div>
    <p className="text-[8px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.25em] mb-1">{label}</p>
    <p className="text-[1.8rem] font-heading font-black text-white leading-none tracking-tighter">{value}</p>
  </motion.div>
);

// ─── TAB BUTTON ──────────────────────────────────────────────────────────────
const TabBtn = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-[220ms] flex-shrink-0 ${
      active
        ? "text-white"
        : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)]"
    }`}
  >
    <Icon size={13} />
    <span>{label}</span>
    {active && (
      <motion.div
        layoutId="profile-tab-indicator"
        className="absolute bottom-0 left-0 right-0 h-px bg-cp-indigo"
        style={{ boxShadow: "0 0 8px rgba(99,102,241,0.6)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
  </button>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { profile: ap, refreshProfile, refreshCurrentUser } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMode, setAvatarMode] = useState("photo");
  const [storeAvatars, setStoreAvatars] = useState([]);
  const [selectedStoreAvatar, setSelectedStoreAvatar] = useState(null);
  const avatarInputRef = useRef(null);
  const { profile: dp, stats, achievements, recentMatches, loading } = useProfileData(ap?.id);
  const profile = ap || dp;

  const xpProgress = Math.min((((profile?.xp || 0) % 1000) / 1000) * 100, 100);
  const winRate = stats?.total_matches
    ? Math.round((stats.wins / stats.total_matches) * 100)
    : 0;

  const fetchStoreAvatars = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_items")
      .select("*, item:store_items(*)")
      .eq("user_id", userId);
    setStoreAvatars((data || []).filter(r => r.item?.type === "avatar" && r.item?.image_url));
  }, []);

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
    setSelectedStoreAvatar(null);
    setAvatarMode("photo");
    fetchStoreAvatars(profile?.id);
    setShowEdit(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setSelectedStoreAvatar(null);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!profile?.id || saving) return;
    setSaving(true);
    let avatarUrl = profile?.avatar_url;
    if (selectedStoreAvatar) {
      avatarUrl = selectedStoreAvatar.item.image_url;
    } else if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
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
      await Promise.all([refreshProfile?.(), refreshCurrentUser?.()]);
      setShowEdit(false);
    }
    setSaving(false);
  };

  if (loading && !profile) return null;

  return (
    <div className="space-y-5">

      {/* ── PROFILE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="cp-card overflow-hidden"
      >
        {/* Banner gradient */}
        <div
          className="h-28 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(16,185,129,0.08) 50%, rgba(167,139,250,0.1) 100%)" }}
        >
          <div className="absolute inset-0 cp-noise opacity-30" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0d1220] to-transparent" />
        </div>

        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Avatar with XP ring */}
            <XpRing progress={xpProgress} size={96}>
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#0d1220] flex items-center justify-center font-black text-2xl"
                style={{ background: "linear-gradient(135deg, #6366f1, #10b981)" }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white">{profile?.username?.[0]?.toUpperCase() || "P"}</span>
                )}
              </div>
            </XpRing>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-[1.5rem] md:text-[2rem] font-heading font-black text-white uppercase tracking-tighter leading-none">
                  {profile?.username || profile?.email?.split("@")[0] || "Operative"}
                </h1>
                {profile?.verification_status === "approved" && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
                    <ShieldCheck size={10} className="text-[#10b981]" />
                    <span className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">Verified</span>
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.2)]">
                  <span className="text-[8px] font-black text-[#818cf8] uppercase tracking-widest">
                    Level {profile?.level || 1}
                  </span>
                </span>
              </div>

              <p className="text-[11px] text-[rgba(255,255,255,0.4)] max-w-md mb-3">
                {profile?.bio || "No bio yet."}
              </p>

              {/* XP bar */}
              <div className="max-w-xs">
                <div className="flex justify-between text-[8px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest mb-1">
                  <span>XP</span>
                  <span>{(profile?.xp || 0) % 1000} / 1000</span>
                </div>
                <div className="cp-progress">
                  <motion.div
                    className="cp-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {profile?.free_fire_id && (
                <div className="px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hidden md:block">
                  <p className="text-[7px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest mb-0.5">FF ID</p>
                  <p className="text-[10px] font-black text-[rgba(255,255,255,0.6)]">{profile.free_fire_id}</p>
                </div>
              )}
              <button
                onClick={openEdit}
                className="cp-btn cp-btn-ghost gap-2 text-[9px]"
              >
                <Settings size={12} /> Edit
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Matches"  value={stats?.total_matches || 0} icon={Gamepad2} accent="#6366f1" delay={0}    />
        <KpiCard label="Win Rate" value={`${winRate}%`}             icon={Trophy}   accent="#f59e0b" delay={0.06} />
        <KpiCard label="Kills"    value={stats?.kills || 0}         icon={Sword}    accent="#10b981" delay={0.12} />
        <KpiCard label="K/D"      value={stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : (stats?.kills || 0)} icon={Target} accent="#a78bfa" delay={0.18} />
      </div>

      {/* ── TABS ── */}
      <div className="cp-card overflow-hidden">
        <div className="flex items-center border-b border-[rgba(255,255,255,0.05)] overflow-x-auto scrollbar-hide">
          <TabBtn active={activeTab === "overview"}      icon={BarChart3} label="Overview"     onClick={() => setActiveTab("overview")}      />
          <TabBtn active={activeTab === "matches"}       icon={History}   label="Matches"      onClick={() => setActiveTab("matches")}       />
          <TabBtn active={activeTab === "achievements"}  icon={Award}     label="Achievements" onClick={() => setActiveTab("achievements")}  />
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="ov"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Recent matches */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History size={13} className="text-cp-indigo" />
                    <span className="text-[10px] font-black text-[rgba(255,255,255,0.5)] uppercase tracking-[0.15em]">Recent Activity</span>
                  </div>
                  <div className="space-y-2">
                    {recentMatches?.slice(0, 5).map((match, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-[220ms]">
                        <div
                          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black"
                          style={{
                            background: match.position === 1 ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                            color: match.position === 1 ? "#6366f1" : "rgba(255,255,255,0.4)",
                            border: `1px solid ${match.position === 1 ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
                          }}
                        >
                          #{match.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white truncate">
                            {match.matches?.tournaments?.name || "Match"}
                          </p>
                          <p className="text-[8px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest">
                            {new Date(match.created_at).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] font-black text-[#10b981]">+{match.reward || 0} CP</p>
                          <p className="text-[8px] font-black text-[rgba(255,255,255,0.3)] uppercase">{match.kills} kills</p>
                        </div>
                      </div>
                    ))}
                    {(!recentMatches || recentMatches.length === 0) && (
                      <div className="py-8 text-center">
                        <p className="text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-[0.2em]">No matches yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award size={13} className="text-[#f59e0b]" />
                    <span className="text-[10px] font-black text-[rgba(255,255,255,0.5)] uppercase tracking-[0.15em]">Badges</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {achievements?.slice(0, 6).map((ach, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.05)]">
                        <span className="text-xl flex-shrink-0">{ach.achievements?.icon || "🏆"}</span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-white truncate">{ach.achievements?.name}</p>
                          <p className="text-[7px] text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Unlocked</p>
                        </div>
                      </div>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div className="col-span-2 py-8 text-center">
                        <p className="text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-[0.2em]">No badges yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === "matches" || activeTab === "achievements") && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <p className="text-[10px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-[0.2em]">
                  Coming Soon
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      <AnimatePresence>
        {showEdit && editForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-[300]"
              onClick={() => setShowEdit(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[310] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div
                className="w-full max-w-md rounded-[20px] border border-[rgba(255,255,255,0.08)] overflow-hidden"
                style={{ background: "rgba(7,9,26,0.98)", backdropFilter: "blur(40px)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                  <h2 className="text-[12px] font-black text-white uppercase tracking-[0.15em]">Edit Profile</h2>
                  <button onClick={() => setShowEdit(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-[220ms]">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
                  {/* Avatar picker */}
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div
                        className="w-16 h-16 rounded-2xl border-2 border-[rgba(99,102,241,0.3)] overflow-hidden flex items-center justify-center font-black text-xl"
                        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.1))" }}
                      >
                        {(avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url) ? (
                          <img src={avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white">{profile?.username?.[0]?.toUpperCase() || "P"}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex p-1 gap-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
                      {[{ id: "photo", label: "📷 Photo" }, { id: "store", label: `🎭 Store${storeAvatars.length > 0 ? ` (${storeAvatars.length})` : ""}` }].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setAvatarMode(m.id)}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-[220ms] ${
                            avatarMode === m.id
                              ? "bg-[rgba(99,102,241,0.2)] text-[#818cf8] border border-[rgba(99,102,241,0.3)]"
                              : "text-[rgba(255,255,255,0.3)] hover:text-white"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {avatarMode === "photo" && (
                      <div
                        className="rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(99,102,241,0.4)] transition-colors cursor-pointer p-4 flex flex-col items-center gap-2 group"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <Upload size={20} className="text-[rgba(255,255,255,0.2)] group-hover:text-cp-indigo transition-colors duration-[220ms]" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.3)] group-hover:text-white transition-colors duration-[220ms]">
                          {avatarFile ? avatarFile.name : "Choose image"}
                        </p>
                      </div>
                    )}
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                    {avatarMode === "store" && (
                      storeAvatars.length === 0 ? (
                        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] p-5 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.25)]">No avatars owned</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                          {storeAvatars.map(row => (
                            <button
                              key={row.id}
                              onClick={() => { setSelectedStoreAvatar(row); setAvatarFile(null); setAvatarPreview(null); }}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                                selectedStoreAvatar?.id === row.id
                                  ? "border-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                                  : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)]"
                              }`}
                            >
                              <img src={row.item.image_url} alt={row.item.name} className="w-full h-full object-cover" />
                              {selectedStoreAvatar?.id === row.id && (
                                <div className="absolute inset-0 bg-cp-indigo/20 flex items-center justify-center">
                                  <span className="text-white text-sm font-black">✓</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>

                  {/* Fields */}
                  {[
                    { key: "username",     label: "Username",    placeholder: "ShadowKill" },
                    { key: "free_fire_id", label: "Free Fire ID", placeholder: "123456789"  },
                    { key: "city",         label: "City",         placeholder: "Casablanca"  },
                    { key: "country",      label: "Country",      placeholder: "Morocco"     },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-[8px] font-black uppercase tracking-[0.25em] text-[rgba(255,255,255,0.3)] mb-1.5 block">
                        {label}
                      </label>
                      <input
                        value={editForm[key]}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="cp-input w-full"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-[8px] font-black uppercase tracking-[0.25em] text-[rgba(255,255,255,0.3)] mb-1.5 block">Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Your playstyle..."
                      rows={3}
                      className="cp-input w-full resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowEdit(false)}
                      className="cp-btn cp-btn-ghost flex-1 justify-center text-[9px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="cp-btn cp-btn-indigo flex-1 justify-center text-[9px] disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
