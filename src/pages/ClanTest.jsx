// src/pages/ClanTest.jsx — CipherPool Clan Test Application
import { useState, useEffect } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const C = {
  bg:      "#08090d",
  card:    "#0f1117",
  border:  "#1a1d28",
  primary: "#7c3aed",
  cyan:    "#00d4ff",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  text:    "rgba(255,255,255,0.92)",
  muted:   "rgba(255,255,255,0.4)",
  low:     "rgba(255,255,255,0.15)",
};

const ROLES = [
  { key:"rusher",  label:"Rusher",   icon:"⚔️",  desc:"Attaque frontale" },
  { key:"sniper",  label:"Sniper",   icon:"🎯",  desc:"Longue portée" },
  { key:"support", label:"Support",  icon:"🛡️",  desc:"Soin & couverture" },
  { key:"igl",     label:"IGL",      icon:"🧠",  desc:"Stratège / leader" },
];

const SKILLS = [
  { key:"pocher",        label:"Pocher",        icon:"💊" },
  { key:"reviver",       label:"Reviver",       icon:"❤️" },
  { key:"cover",         label:"Cover",         icon:"🛡️" },
  { key:"aim",           label:"Aim précis",    icon:"🎯" },
  { key:"communication", label:"Communication", icon:"🎙️" },
  { key:"gloo_wall",     label:"Gloo Wall",     icon:"🧱" },
];

const EXP = [
  { key:"ranked",   label:"Ranked",     icon:"🔥" },
  { key:"cs",       label:"Clash Squad", icon:"⚡" },
  { key:"tournois", label:"Tournois",   icon:"🏆" },
];

export default function ClanTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useOutletContext();
  const teamId   = searchParams.get("team");
  const teamName = searchParams.get("name") || "CipherPool";

  const [team, setTeam]       = useState(null);
  const [step, setStep]       = useState(1); // 1=form, 2=success
  const [saving, setSaving]   = useState(false);
  const [existing, setExisting] = useState(null); // already applied?

  const [form, setForm] = useState({
    pseudo:        profile?.full_name || "",
    ff_id:         profile?.free_fire_id || "",
    role:          "",
    skills:        [],
    experience:    [],
    hours_per_day: "",
    has_mic:       null,
    schedule_ok:   null,
    message:       "",
  });

  useEffect(() => {
    if (teamId) loadTeam();
    checkExisting();
  }, [teamId, profile?.id]);

  const loadTeam = async () => {
    const { data } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
    if (data) setTeam(data);
  };

  const checkExisting = async () => {
    if (!profile?.id) return;
    const q = supabase.from("clan_applications").select("id,status,created_at")
      .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(1);
    if (teamId) q.eq("team_id", teamId);
    const { data } = await q.maybeSingle();
    if (data) setExisting(data);
  };

  const toggleSkill = (key) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(key) ? f.skills.filter(s => s !== key) : [...f.skills, key]
    }));
  };

  const toggleExp = (key) => {
    setForm(f => ({
      ...f,
      experience: f.experience.includes(key) ? f.experience.filter(e => e !== key) : [...f.experience, key]
    }));
  };

  const handleSubmit = async () => {
    if (!form.pseudo || !form.ff_id || !form.role) return;
    setSaving(true);
    try {
      const payload = {
        user_id:       profile.id,
        team_id:       teamId || null,
        pseudo:        form.pseudo.trim(),
        ff_id:         form.ff_id.trim(),
        role:          form.role,
        skills:        form.skills,
        experience:    form.experience,
        hours_per_day: form.hours_per_day ? parseInt(form.hours_per_day) : null,
        has_mic:       form.has_mic,
        schedule_ok:   form.schedule_ok,
        message:       form.message.trim() || null,
        status:        "pending",
      };
      const { error } = await supabase.from("clan_applications").insert([payload]);
      if (error) throw error;

      // Notification admin_messages → founder
      try {
        await supabase.from("admin_messages").insert([{
          user_id: profile.id,
          content: `🎮 Nouvelle candidature clan de ${form.pseudo} (${form.role}) — ${teamName}`,
          type:    "clan_test",
          is_global: false,
          read: false,
        }]);
      } catch (_) {}

      setStep(2);
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.pseudo && form.ff_id && form.role;

  // Already applied
  if (existing) {
    const statusColor = existing.status === "accepted" ? C.green : existing.status === "rejected" ? C.red : C.amber;
    const statusLabel = existing.status === "accepted" ? "✅ Accepté" : existing.status === "rejected" ? "❌ Refusé" : "⏳ En attente";
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}}
          style={{ maxWidth:440, width:"100%", background:C.card, border:`1px solid ${C.border}`,
            borderRadius:20, padding:40, textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:16 }}>📋</div>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:2, color:"#fff", margin:"0 0 8px" }}>
            CANDIDATURE EXISTANTE
          </h2>
          <p style={{ color:C.muted, fontSize:13, marginBottom:24 }}>Tu as déjà postulé pour ce clan.</p>
          <div style={{ background:`${statusColor}18`, border:`1px solid ${statusColor}40`, borderRadius:12,
            padding:"14px 20px", marginBottom:24 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:statusColor }}>
              {statusLabel}
            </span>
            <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>
              {new Date(existing.created_at).toLocaleDateString("fr-FR")}
            </div>
          </div>
          <button onClick={() => navigate(-1)}
            style={{ padding:"11px 28px", borderRadius:10, background:C.primary, border:"none",
              color:"#fff", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, cursor:"pointer" }}>
            ← Retour
          </button>
        </motion.div>
      </div>
    );
  }

  // Success screen
  if (step === 2) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <motion.div initial={{opacity:0,scale:.85,y:20}} animate={{opacity:1,scale:1,y:0}}
          transition={{type:"spring",stiffness:260,damping:22}}
          style={{ maxWidth:440, width:"100%", background:C.card, border:`1px solid ${C.green}30`,
            borderRadius:20, padding:40, textAlign:"center",
            boxShadow:`0 0 40px ${C.green}15` }}>
          <motion.div animate={{scale:[1,1.2,1]}} transition={{duration:.6,delay:.2}}
            style={{ fontSize:64, marginBottom:16 }}>🎮</motion.div>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, letterSpacing:2, color:C.green, margin:"0 0 8px" }}>
            CANDIDATURE ENVOYÉE !
          </h2>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6, marginBottom:28 }}>
            Ta demande de test clan a été soumise. Le fondateur va la réviser et te contacter pour fixer un rendez-vous.
          </p>
          <div style={{ background:`${C.primary}12`, border:`1px solid ${C.primary}25`, borderRadius:12,
            padding:"14px 20px", marginBottom:28, textAlign:"left" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.primary, letterSpacing:2, marginBottom:8 }}>RÉSUMÉ</div>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:13 }}>
              <div>🎮 Pseudo: <strong style={{color:"#fff"}}>{form.pseudo}</strong></div>
              <div>🆔 FF ID: <strong style={{color:"#fff"}}>{form.ff_id}</strong></div>
              <div>⚔️ Rôle: <strong style={{color:"#fff"}}>{ROLES.find(r=>r.key===form.role)?.label}</strong></div>
            </div>
          </div>
          <button onClick={() => navigate("/teams")}
            style={{ padding:"13px 32px", borderRadius:10, background:`linear-gradient(135deg,${C.primary},${C.cyan}80)`,
              border:"none", color:"#fff", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, cursor:"pointer",
              fontSize:14, letterSpacing:.5 }}>
            Voir les équipes →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"24px 16px 80px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>

        {/* Header */}
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            {team?.logo_url && (
              <img src={team.logo_url} style={{ width:40, height:40, borderRadius:10, objectFit:"cover" }} />
            )}
            <div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:2, color:"#fff", lineHeight:1 }}>
                TEST CLAN — {team?.name?.toUpperCase() || teamName.toUpperCase()}
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.primary, letterSpacing:2 }}>
                CANDIDATURE OFFICIELLE
              </div>
            </div>
          </div>
          <div style={{ height:1, background:`linear-gradient(90deg,${C.primary}60,transparent)` }}/>
        </motion.div>

        {/* Form */}
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

          {/* Infos de base */}
          <Section title="INFORMATIONS DE BASE" icon="🎮">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Pseudo Free Fire *">
                <input value={form.pseudo} onChange={e=>setForm(f=>({...f,pseudo:e.target.value}))}
                  placeholder="Ton pseudo FF..."
                  style={inputStyle} />
              </Field>
              <Field label="FF ID *">
                <input value={form.ff_id} onChange={e=>setForm(f=>({...f,ff_id:e.target.value}))}
                  placeholder="123456789"
                  style={inputStyle} />
              </Field>
            </div>
          </Section>

          {/* Rôle */}
          <Section title="TON RÔLE" icon="⚔️">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {ROLES.map(r => (
                <RoleCard key={r.key} role={r}
                  selected={form.role === r.key}
                  onClick={() => setForm(f => ({...f, role: r.key}))} />
              ))}
            </div>
          </Section>

          {/* Skills */}
          <Section title="TES SKILLS" icon="💪">
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {SKILLS.map(s => (
                <ToggleChip key={s.key} item={s}
                  active={form.skills.includes(s.key)}
                  onClick={() => toggleSkill(s.key)} />
              ))}
            </div>
          </Section>

          {/* Expérience */}
          <Section title="EXPÉRIENCE" icon="🏆">
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {EXP.map(e => (
                <ToggleChip key={e.key} item={e}
                  active={form.experience.includes(e.key)}
                  onClick={() => toggleExp(e.key)} />
              ))}
            </div>
          </Section>

          {/* Questions */}
          <Section title="QUELQUES QUESTIONS" icon="❓">
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              <Field label="Heures de jeu par jour">
                <select value={form.hours_per_day}
                  onChange={e => setForm(f=>({...f,hours_per_day:e.target.value}))}
                  style={{...inputStyle, appearance:"none"}}>
                  <option value="">Sélectionner...</option>
                  {["1","2","3","4","5","6+"].map(h => (
                    <option key={h} value={h}>{h} heure{h==="1"?"":"s"}</option>
                  ))}
                </select>
              </Field>

              <div>
                <div style={labelStyle}>Tu as un micro ? *</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[{v:true,l:"✅ Oui"},{v:false,l:"❌ Non"}].map(({v,l}) => (
                    <button key={String(v)} onClick={() => setForm(f=>({...f,has_mic:v}))}
                      style={{
                        flex:1, padding:"10px", borderRadius:9, cursor:"pointer",
                        fontFamily:"'Space Grotesk',sans-serif", fontSize:13, fontWeight:600,
                        background: form.has_mic === v ? `${C.primary}25` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.has_mic === v ? C.primary : C.border}`,
                        color: form.has_mic === v ? "#fff" : C.muted,
                        transition:"all .15s",
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={labelStyle}>Disponible pour un schedule fixe ?</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[{v:true,l:"✅ Oui"},{v:false,l:"❌ Non"}].map(({v,l}) => (
                    <button key={String(v)} onClick={() => setForm(f=>({...f,schedule_ok:v}))}
                      style={{
                        flex:1, padding:"10px", borderRadius:9, cursor:"pointer",
                        fontFamily:"'Space Grotesk',sans-serif", fontSize:13, fontWeight:600,
                        background: form.schedule_ok === v ? `${C.green}20` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.schedule_ok === v ? C.green : C.border}`,
                        color: form.schedule_ok === v ? "#fff" : C.muted,
                        transition:"all .15s",
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Message pour le fondateur (optionnel)">
                <textarea value={form.message}
                  onChange={e => setForm(f=>({...f,message:e.target.value}))}
                  placeholder="Pourquoi veux-tu rejoindre ce clan ? Qu'est-ce qui te distingue ?"
                  rows={3}
                  style={{...inputStyle, resize:"vertical", minHeight:80}} />
              </Field>
            </div>
          </Section>

          {/* Submit */}
          <motion.button
            whileHover={canSubmit ? {scale:1.02} : {}}
            whileTap={canSubmit ? {scale:0.98} : {}}
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              width:"100%", padding:"16px", borderRadius:12, cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit
                ? `linear-gradient(135deg,${C.primary},${C.cyan}80)`
                : "rgba(255,255,255,0.05)",
              border:"none", color: canSubmit ? "#fff" : C.low,
              fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:3,
              boxShadow: canSubmit ? `0 8px 28px ${C.primary}40` : "none",
              transition:"all .2s",
            }}>
            {saving ? "⏳ ENVOI..." : "🎮 ENVOYER MA CANDIDATURE"}
          </motion.button>

          {!canSubmit && (
            <p style={{ textAlign:"center", color:C.muted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", letterSpacing:1 }}>
              * Pseudo + FF ID + Rôle requis
            </p>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        select option { background: #0f1117; color: #fff; }
        textarea { font-size: 16px !important; }
        input { font-size: 16px !important; }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:2, color:C.primary, fontWeight:700 }}>
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function RoleCard({ role, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"12px 14px", borderRadius:10, cursor:"pointer", textAlign:"left",
      background: selected ? `${C.primary}20` : "rgba(255,255,255,0.03)",
      border: `1px solid ${selected ? C.primary : C.border}`,
      transition:"all .15s", width:"100%",
    }}>
      <div style={{ fontSize:20, marginBottom:4 }}>{role.icon}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13,
        color: selected ? "#fff" : C.muted }}>{role.label}</div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color: selected ? C.primary : C.low, letterSpacing:1 }}>
        {role.desc}
      </div>
    </button>
  );
}

function ToggleChip({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"7px 14px", borderRadius:20, cursor:"pointer",
      background: active ? `${C.cyan}18` : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? C.cyan : C.border}`,
      color: active ? C.cyan : C.muted,
      fontFamily:"'Space Grotesk',sans-serif", fontSize:12, fontWeight:600,
      display:"flex", alignItems:"center", gap:5, transition:"all .15s",
    }}>
      <span>{item.icon}</span> {item.label}
    </button>
  );
}

const inputStyle = {
  width:"100%", padding:"10px 14px", borderRadius:9,
  background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`,
  color:"rgba(255,255,255,.9)", fontFamily:"'Space Grotesk',sans-serif",
  fontSize:13, outline:"none", boxSizing:"border-box",
};

const labelStyle = {
  fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:1.5,
  color:C.muted, fontWeight:600, marginBottom:7, textTransform:"uppercase",
};