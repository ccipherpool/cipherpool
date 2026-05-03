import { useState } from "react";
import { useNavigate, Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const C = {
  bg:      "#0b0b14",
  card:    "rgba(20,20,34,0.9)",
  border:  "rgba(255,255,255,0.08)",
  accent:  "#00c49a",
  accentD: "#009e7a",
  orange:  "#f0a030",
  purple:  "#7c5cbf",
  text:    "#e8e8f4",
  text2:   "#9898b8",
  text3:   "#5c5c7a",
  danger:  "#ef4444",
};

const ACCENT_PRESETS = [
  "#00c49a","#f0a030","#7c5cbf","#3b82f6","#ef4444","#ec4899","#14b8a6","#8b5cf6",
];

export default function CreateClan() {
  const { profile } = useOutletContext() || {};
  const navigate = useNavigate();

  const [name,        setName]        = useState("");
  const [tag,         setTag]         = useState("");
  const [description, setDescription] = useState("");
  const [rules,       setRules]       = useState("");
  const [isOpen,      setIsOpen]      = useState(true);
  const [accentColor, setAccentColor] = useState(C.accent);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !tag.trim()) {
      setError("Le nom et le tag sont obligatoires.");
      return;
    }
    if (tag.length > 5) {
      setError("Le tag doit faire 5 caractères maximum.");
      return;
    }
    if (!profile?.id) {
      setError("Tu dois être connecté.");
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("clan_members")
        .select("clan_id")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existing) {
        setError("Tu es déjà dans un clan. Quitte-le avant d'en créer un nouveau.");
        setLoading(false);
        return;
      }

      const { data: clan, error: clanErr } = await supabase
        .from("clans")
        .insert({
          name: name.trim(),
          tag: tag.trim().toUpperCase(),
          description: description.trim() || null,
          rules: rules.trim() || null,
          is_open: isOpen,
          accent_color: accentColor,
          leader_id: profile.id,
          points: 0,
          wins: 0,
          losses: 0,
        })
        .select()
        .single();

      if (clanErr) throw clanErr;

      await supabase.from("clan_members").insert({
        clan_id: clan.id,
        user_id: profile.id,
        role: "leader",
      });

      navigate(`/clans/${clan.id}`);
    } catch (err) {
      setError(err.message || "Erreur lors de la création du clan.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
    color: C.text, fontSize: 14, outline: "none",
    fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px 80px", maxWidth: 640, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link to="/clans" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.text3, fontSize: 12, textDecoration: "none", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}
          onMouseEnter={e => e.currentTarget.style.color = C.text2}
          onMouseLeave={e => e.currentTarget.style.color = C.text3}>
          ← Retour aux clans
        </Link>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.text, fontFamily: "'Space Grotesk',sans-serif" }}>
          Créer un <span style={{ color: C.accent }}>Clan</span>
        </h1>
        <p style={{ color: C.text2, fontSize: 13, marginTop: 6 }}>
          Fonde ton propre clan et recrute des joueurs.
        </p>
      </div>

      <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Name + Tag */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
          <div>
            <label style={{ color: C.text2, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 6 }}>
              NOM DU CLAN *
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: CipherElite" maxLength={32}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = `rgba(0,196,154,0.4)`}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
          <div style={{ width: 100 }}>
            <label style={{ color: C.text2, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 6 }}>
              TAG * (5 max)
            </label>
            <input value={tag} onChange={e => setTag(e.target.value.toUpperCase())} placeholder="CLP" maxLength={5}
              style={{ ...inputStyle, textTransform: "uppercase", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}
              onFocus={e => e.target.style.borderColor = `rgba(0,196,154,0.4)`}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ color: C.text2, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 6 }}>
            DESCRIPTION
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décris ton clan en quelques mots..." rows={3} maxLength={200}
            style={{ ...inputStyle, resize: "vertical" }}
            onFocus={e => e.target.style.borderColor = `rgba(0,196,154,0.4)`}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        {/* Rules */}
        <div>
          <label style={{ color: C.text2, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 6 }}>
            RÈGLES DU CLAN
          </label>
          <textarea value={rules} onChange={e => setRules(e.target.value)} placeholder="Ex: Niveau 10+ requis, présence aux tournois..." rows={3} maxLength={500}
            style={{ ...inputStyle, resize: "vertical" }}
            onFocus={e => e.target.style.borderColor = `rgba(0,196,154,0.4)`}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        {/* Accent Color */}
        <div>
          <label style={{ color: C.text2, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 8 }}>
            COULEUR DU CLAN
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {ACCENT_PRESETS.map(color => (
              <button key={color} type="button" onClick={() => setAccentColor(color)}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: color, border: "none", cursor: "pointer",
                  boxShadow: accentColor === color ? `0 0 0 3px rgba(255,255,255,0.2), 0 0 0 1px ${color}` : "none",
                  transition: "box-shadow .2s",
                }} />
            ))}
            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", padding: 2 }} />
          </div>
          {/* Preview */}
          <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 9, background: `${accentColor}15`, border: `1px solid ${accentColor}30`, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ color: accentColor, fontWeight: 700, fontSize: 13 }}>{name || "Mon Clan"}</span>
            <span style={{ color: accentColor, fontWeight: 700, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", opacity: 0.7 }}>[{tag || "TAG"}]</span>
          </div>
        </div>

        {/* Open / Closed */}
        <div>
          <label style={{ color: C.text2, fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", display: "block", marginBottom: 8 }}>
            CANDIDATURES
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ v: true, label: "OUVERT", desc: "Tout le monde peut postuler" }, { v: false, label: "FERMÉ", desc: "Sur invitation uniquement" }].map(opt => (
              <button key={String(opt.v)} type="button" onClick={() => setIsOpen(opt.v)}
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                  background: isOpen === opt.v ? `${C.accent}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isOpen === opt.v ? `${C.accent}40` : C.border}`,
                  color: isOpen === opt.v ? C.accent : C.text3,
                  transition: "all .2s",
                }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>{opt.label}</div>
                <div style={{ fontSize: 11 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: C.danger, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading || !name.trim() || !tag.trim()}
          style={{
            padding: "13px 20px", borderRadius: 11, border: "none", cursor: loading || !name.trim() || !tag.trim() ? "not-allowed" : "pointer",
            background: loading || !name.trim() || !tag.trim()
              ? "rgba(255,255,255,0.05)"
              : `linear-gradient(135deg,${C.accent},${C.accentD})`,
            color: loading || !name.trim() || !tag.trim() ? C.text3 : "#fff",
            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, letterSpacing: 1,
            boxShadow: loading || !name.trim() || !tag.trim() ? "none" : `0 4px 20px rgba(0,196,154,0.3)`,
            transition: "all .2s",
          }}>
          {loading ? "CRÉATION EN COURS..." : "🛡️ CRÉER MON CLAN"}
        </button>
      </motion.form>
    </div>
  );
}
