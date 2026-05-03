import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const T = {
  bg:     "#0b0b14",
  card:   "rgba(14,14,28,0.9)",
  card2:  "rgba(20,20,38,0.95)",
  border: "rgba(255,255,255,0.07)",
  teal:   "#00c49a",
  tealD:  "#009e7a",
  amber:  "#f0a030",
  indigo: "#818cf8",
  rose:   "#f43f5e",
  text:   "#e8e8f4",
  text2:  "#9898b8",
  text3:  "#5c5c7a",
};

const ROLE_CFG = {
  super_admin: { label: "SUPER ADMIN",  color: T.amber,  icon: "👑", order: 0 },
  founder:     { label: "FONDATEUR",    color: "#ff6b6b", icon: "⚡", order: 1 },
  fondateur:   { label: "FONDATEUR",    color: "#ff6b6b", icon: "⚡", order: 1 },
  admin:       { label: "ADMIN",        color: T.teal,   icon: "🛡️", order: 2 },
  designer:    { label: "DESIGNER",     color: T.indigo, icon: "🎨", order: 3 },
};

function MemberCard({ member, index }) {
  const [hov, setHov] = useState(false);
  const role = ROLE_CFG[member.role] || { label: member.role?.toUpperCase(), color: T.text3, icon: "👤", order: 99 };
  const initials = member.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 180 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.card2 : T.card,
        border: `1px solid ${hov ? role.color + "35" : T.border}`,
        borderRadius: 16, padding: "28px 24px", textAlign: "center",
        transition: "all 0.25s",
        transform: hov ? "translateY(-6px)" : "none",
        boxShadow: hov ? `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${role.color}20` : "none",
        position: "relative", overflow: "hidden",
      }}>
      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${role.color},transparent)`, opacity: hov ? 1 : 0.4, transition: "opacity .25s" }} />

      {/* Avatar */}
      <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: member.avatar_url ? "transparent" : `linear-gradient(135deg,${role.color}40,${role.color}20)`,
          border: `3px solid ${role.color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 700, color: role.color,
          overflow: "hidden", margin: "0 auto",
          boxShadow: hov ? `0 0 24px ${role.color}30` : "none",
          transition: "box-shadow .25s",
        }}>
          {member.avatar_url
            ? <img src={member.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials}
        </div>
        {/* Online dot */}
        <div style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: T.teal, border: "2px solid #0b0b14", boxShadow: `0 0 8px ${T.teal}60` }} />
      </div>

      {/* Name */}
      <h3 style={{ color: T.text, fontSize: 16, fontWeight: 800, margin: "0 0 6px", fontFamily: "'Space Grotesk',sans-serif" }}>
        {member.full_name || "Membre"}
      </h3>

      {/* Role badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: `${role.color}15`, border: `1px solid ${role.color}30`, marginBottom: 14 }}>
        <span style={{ fontSize: 12 }}>{role.icon}</span>
        <span style={{ color: role.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>{role.label}</span>
      </div>

      {/* FF ID */}
      {member.free_fire_id && (
        <div style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, marginBottom: 12 }}>
          <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>FREE FIRE ID</p>
          <p style={{ color: T.text2, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700 }}>{member.free_fire_id}</p>
        </div>
      )}

      {/* Level */}
      {member.level > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <div>
            <p style={{ color: role.color, fontFamily: "'Bebas Neue',cursive", fontSize: 20, lineHeight: 1, margin: 0 }}>{member.level}</p>
            <p style={{ color: T.text3, fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 1 }}>NIV.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Team() {
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,role,level,free_fire_id")
        .in("role", ["super_admin","founder","fondateur","admin","designer"])
        .order("created_at");
      setStaff(
        (data || []).sort((a, b) => {
          const ao = ROLE_CFG[a.role]?.order ?? 99;
          const bo = ROLE_CFG[b.role]?.order ?? 99;
          return ao - bo;
        })
      );
      setLoading(false);
    };
    fetchStaff();
  }, []);

  const groups = [
    { roles: ["super_admin"], label: "DIRECTION",       color: T.amber },
    { roles: ["founder","fondateur"], label: "FONDATEURS",  color: "#ff6b6b" },
    { roles: ["admin"],       label: "ADMINISTRATION",  color: T.teal },
    { roles: ["designer"],    label: "DESIGN",          color: T.indigo },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: T.text, padding: "32px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40, textAlign: "center" }}>
          <p style={{ color: T.teal, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>👥 L'ÉQUIPE</p>
          <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "clamp(38px,6vw,64px)", letterSpacing: 3, margin: "0 0 12px", color: T.text }}>
            L'ÉQUIPE <span style={{ color: T.teal }}>CIPHERPOOL</span>
          </h1>
          <p style={{ color: T.text2, fontSize: 15, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Les personnes qui construisent et gèrent la plateforme esports numéro 1 au Maroc.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "8px 20px", borderRadius: 99, background: "rgba(0,196,154,0.08)", border: "1px solid rgba(0,196,154,0.2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal, animation: "pulse 1.5s infinite", display: "inline-block" }} />
            <span style={{ color: T.teal, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>EN LIGNE — MAROC 🇲🇦</span>
          </div>
        </motion.div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid rgba(0,196,154,0.15)`, borderTopColor: T.teal }} />
          </div>
        ) : (
          groups.map(group => {
            const members = staff.filter(m => group.roles.includes(m.role));
            if (!members.length) return null;
            return (
              <div key={group.label} style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                  <span style={{ color: group.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 3 }}>{group.label}</span>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
                  {members.map((m, i) => <MemberCard key={m.id} member={m} index={i} />)}
                </div>
              </div>
            );
          })
        )}

        {!loading && staff.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.text3 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 3 }}>AUCUN MEMBRE AFFICHÉ</p>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </>
  );
}
