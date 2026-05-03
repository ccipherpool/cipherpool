import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const ROLE_CFG = {
  super_admin: { label: "SUPER ADMIN",  color: "#f97316", icon: "👑", order: 0 },
  founder:     { label: "FONDATEUR",    color: "#f43f5e", icon: "⚡", order: 1 },
  fondateur:   { label: "FONDATEUR",    color: "#f43f5e", icon: "⚡", order: 1 },
  admin:       { label: "ADMIN",        color: "#06b6d4", icon: "🛡️", order: 2 },
  designer:    { label: "DESIGNER",     color: "#818cf8", icon: "🎨", order: 3 },
};

function MemberCard({ member, index }) {
  const [hov, setHov] = useState(false);
  const role = ROLE_CFG[member.role] || { label: member.role?.toUpperCase(), color: "rgba(255,255,255,0.3)", icon: "👤", order: 99 };
  const initials = member.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 180 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(20,20,38,0.95)" : "#0c0c1a",
        border: `1px solid ${hov ? role.color + "35" : "rgba(255,255,255,0.06)"}`,
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
            ? <img src={member.avatar_url} alt={member.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials}
        </div>
        <div style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: "#06b6d4", border: "2px solid #07070f", boxShadow: "0 0 8px rgba(6,182,212,0.6)" }} />
      </div>

      {/* Name */}
      <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 800, margin: "0 0 6px", fontFamily: "inherit" }}>
        {member.full_name || "Membre"}
      </h3>

      {/* Role badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: `${role.color}15`, border: `1px solid ${role.color}30`, marginBottom: 14 }}>
        <span style={{ fontSize: 12 }}>{role.icon}</span>
        <span style={{ color: role.color, fontFamily: "monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>{role.label}</span>
      </div>

      {/* FF ID */}
      {member.free_fire_id && (
        <div style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
          <p style={{ color: "rgba(255,255,255,0.25)", fontFamily: "monospace", fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>FREE FIRE ID</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{member.free_fire_id}</p>
        </div>
      )}

      {/* Level */}
      {member.level > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <div>
            <p style={{ color: role.color, fontSize: 20, fontWeight: 900, fontFamily: "monospace", lineHeight: 1, margin: 0 }}>{member.level}</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontFamily: "monospace", fontSize: 8, letterSpacing: 1 }}>NIV.</p>
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
    { roles: ["super_admin"],           label: "DIRECTION",       color: "#f97316" },
    { roles: ["founder","fondateur"],   label: "FONDATEURS",      color: "#f43f5e" },
    { roles: ["admin"],                 label: "ADMINISTRATION",  color: "#06b6d4" },
    { roles: ["designer"],              label: "DESIGN",          color: "#818cf8" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2 font-mono">👥 L'ÉQUIPE</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-black tracking-tight text-white">
            L'Équipe <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CipherPool</span>
          </h1>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
            <span className="text-cyan-400 font-mono text-[10px] font-bold tracking-widest">EN LIGNE — MAROC 🇲🇦</span>
          </div>
        </div>
        <p className="text-white/40 text-sm mt-2 max-w-lg">Les personnes qui construisent et gèrent la plateforme esports numéro 1 au Maroc.</p>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-4xl mb-3">👥</div>
          <p className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Aucun membre affiché</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => {
            const members = staff.filter(m => group.roles.includes(m.role));
            if (!members.length) return null;
            return (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="font-mono text-[10px] font-black tracking-[0.3em]" style={{ color: group.color }}>{group.label}</span>
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {members.map((m, i) => <MemberCard key={m.id} member={m} index={i} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {!loading && staff.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 pt-4"
        >
          {[
            { val: staff.length, label: "Membres de l'équipe", color: "#06b6d4" },
            { val: "24/7", label: "Support disponible", color: "#f97316" },
            { val: "100%", label: "Dédié à la qualité", color: "#818cf8" },
          ].map(s => (
            <div key={s.label} className="text-center py-5 rounded-2xl" style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-2xl font-black font-mono mb-1" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-white/25 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
