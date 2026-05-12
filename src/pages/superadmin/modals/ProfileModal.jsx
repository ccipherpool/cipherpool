import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

export default function ProfileModal({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: profile?.username || "",
    bio: profile?.bio || "",
    free_fire_id: profile?.free_fire_id || "",
    city: profile?.city || "",
    country: profile?.country || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarMode, setAvatarMode] = useState("photo");
  const [storeAvatars, setStoreAvatars] = useState([]);
  const [selectedStoreAvatar, setSelectedStoreAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const fetchStoreAvatars = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_items")
      .select("*, item:store_items(*)")
      .eq("user_id", userId);
    const avatars = (data || []).filter(row => row.item?.type === "avatar" && row.item?.image_url);
    setStoreAvatars(avatars);
  }, []);

  useEffect(() => {
    fetchStoreAvatars(profile?.id);
  }, [profile?.id, fetchStoreAvatars]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setSelectedStoreAvatar(null);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!profile?.id || saving) return;
    setSaving(true);
    setError("");

    let avatarUrl = profile?.avatar_url;

    if (selectedStoreAvatar) {
      avatarUrl = selectedStoreAvatar.item.image_url;
    } else if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (upErr) {
        setError("Erreur upload avatar: " + upErr.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData?.publicUrl + `?t=${Date.now()}`;
    }

    const { error: updateErr } = await supabase.from("profiles").update({
      username: form.username.trim(),
      bio: form.bio.trim(),
      free_fire_id: form.free_fire_id.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      ...(avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
    }).eq("id", profile.id);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      onSaved?.({ ...profile, ...form, avatar_url: avatarUrl });
      onClose();
    }
    setSaving(false);
  };

  const currentAvatarSrc = avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url;
  const initials = (form.username || profile?.email || "?")[0]?.toUpperCase();

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff", fontSize: 14, fontFamily: "Rajdhani,sans-serif",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: "#0a0a1a",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 20,
            padding: 28,
            width: "100%",
            maxWidth: 500,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(124,58,237,0.25)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              ✏️
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "Orbitron,sans-serif", letterSpacing: 1 }}>
                MON PROFIL
              </h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
                Modifier mes informations
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ marginLeft: "auto", background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Avatar section */}
          <div style={{ marginBottom: 20 }}>
            {/* Current avatar preview */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 16,
                border: "2px solid rgba(124,58,237,0.5)",
                overflow: "hidden", background: "#1a1a2e",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {currentAvatarSrc ? (
                  <img src={currentAvatarSrc} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 30, fontWeight: 900, color: "#a855f7", fontFamily: "Orbitron,sans-serif" }}>
                    {initials}
                  </span>
                )}
              </div>
            </div>

            {/* Mode tabs */}
            <div style={{
              display: "flex", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              padding: 4, gap: 4, marginBottom: 12,
            }}>
              {[
                { id: "photo", label: "📷 Photo" },
                { id: "store", label: `🎭 Avatars${storeAvatars.length > 0 ? ` (${storeAvatars.length})` : ""}` },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setAvatarMode(m.id)}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: "none", cursor: "pointer", fontSize: 11,
                    fontWeight: 700, letterSpacing: 1, fontFamily: "Orbitron,sans-serif",
                    transition: "all 0.2s",
                    background: avatarMode === m.id ? "linear-gradient(135deg,#7c3aed,#06b6d4)" : "transparent",
                    color: avatarMode === m.id ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Photo upload */}
            {avatarMode === "photo" && (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  borderRadius: 12, border: "2px dashed rgba(255,255,255,0.1)",
                  padding: "16px", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6, cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
              >
                <span style={{ fontSize: 22 }}>📷</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: "Orbitron,sans-serif", letterSpacing: 1 }}>
                  {avatarFile ? avatarFile.name : "CHOISIR UNE PHOTO"}
                </span>
                {!avatarFile && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>JPG, PNG, WEBP</span>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />

            {/* Store avatars */}
            {avatarMode === "store" && (
              storeAvatars.length === 0 ? (
                <div style={{
                  borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
                  padding: "20px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 24, margin: "0 0 8px" }}>🎭</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", fontFamily: "Orbitron,sans-serif", letterSpacing: 1, margin: 0 }}>
                    AUCUN AVATAR ACHETÉ
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
                    Achetez des avatars dans la Boutique
                  </p>
                </div>
              ) : (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8, maxHeight: 160, overflowY: "auto",
                }}>
                  {storeAvatars.map(row => (
                    <button
                      key={row.id}
                      onClick={() => { setSelectedStoreAvatar(row); setAvatarFile(null); setAvatarPreview(null); }}
                      style={{
                        position: "relative", aspectRatio: "1",
                        borderRadius: 10, overflow: "hidden", cursor: "pointer",
                        border: selectedStoreAvatar?.id === row.id
                          ? "2px solid #06b6d4"
                          : "2px solid rgba(255,255,255,0.1)",
                        boxShadow: selectedStoreAvatar?.id === row.id
                          ? "0 0 12px rgba(6,182,212,0.4)"
                          : "none",
                        transition: "all 0.2s", background: "transparent",
                        padding: 0,
                      }}
                    >
                      <img src={row.item.image_url} alt={row.item.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {selectedStoreAvatar?.id === row.id && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(6,182,212,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {[
              { key: "username", label: "USERNAME", placeholder: "Ton pseudo...", icon: "👤" },
              { key: "free_fire_id", label: "FREE FIRE ID", placeholder: "ID de jeu...", icon: "🎮" },
              { key: "city", label: "VILLE", placeholder: "Casablanca...", icon: "🏙️" },
              { key: "country", label: "PAYS", placeholder: "Maroc...", icon: "🌍" },
            ].map(({ key, label, placeholder, icon }) => (
              <div key={key}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontFamily: "Orbitron,sans-serif", display: "block", marginBottom: 6 }}>
                  {icon} {label}
                </label>
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={inp}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontFamily: "Orbitron,sans-serif", display: "block", marginBottom: 6 }}>
                ✍️ BIO
              </label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Parle de toi..."
                rows={3}
                style={{ ...inp, resize: "vertical" }}
                onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 12, color: "#ef4444" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, fontFamily: "Rajdhani,sans-serif" }}
            >
              ANNULER
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: "12px", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer",
                background: saving ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#06b6d4)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 1,
                fontFamily: "Orbitron,sans-serif", boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "SAUVEGARDE..." : "✓ SAUVEGARDER"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
