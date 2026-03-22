// src/pages/FounderClanTests.jsx — CipherPool Clan Test Manager
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
  pink:    "#ec4899",
  text:    "rgba(255,255,255,0.92)",
  muted:   "rgba(255,255,255,0.4)",
  low:     "rgba(255,255,255,0.12)",
};

const STATUS_CFG = {
  pending:   { label:"En attente", color:C.amber,   bg:`${C.amber}18`   },
  accepted:  { label:"Accepté",    color:C.green,   bg:`${C.green}18`   },
  rejected:  { label:"Refusé",     color:C.red,     bg:`${C.red}18`     },
  scheduled: { label:"Planifié",   color:C.cyan,    bg:`${C.cyan}18`    },
};

const ROLES_ICON = { rusher:"⚔️", sniper:"🎯", support:"🛡️", igl:"🧠" };
const MODES = ["Clash Squad","Ranked","Custom Room","Battle Royale"];

export default function FounderClanTests() {
  const navigate = useNavigate();
  const { profile } = useOutletContext();

  const [apps,       setApps]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("pending");
  const [selected,   setSelected]   = useState(null);
  const [showModal,  setShowModal]  = useState(false); // schedule modal
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState(null);

  // Schedule form
  const [sched, setSched] = useState({
    date:          "",
    time:          "20:00",
    mode:          "Clash Squad",
    room_id:       "",
    room_password: "",
    notes:         "",
  });

  const isAllowed = ["founder","fondateur","super_admin","admin"].includes(profile?.role?.toLowerCase?.() || "");

  useEffect(() => {
    if (!isAllowed) { navigate("/dashboard"); return; }
    loadApps();
  }, []);

  const loadApps = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clan_applications")
      .select(`
        *,
        user:profiles!clan_applications_user_id_fkey(id, full_name, avatar_url, free_fire_id),
        team:teams(id, name, logo_url),
        clan_test:clan_tests(*)
      `)
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  }, []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const updateStatus = async (appId, status) => {
    const { error } = await supabase
      .from("clan_applications")
      .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq("id", appId);
    if (error) { showMsg("error", error.message); return; }

    // Notify user
    const app = apps.find(a => a.id === appId);
    if (app) {
      const msgText = status === "accepted"
        ? `✅ Ta candidature clan a été acceptée ! Attends le rendez-vous de test.`
        : `❌ Ta candidature clan a été refusée. N'abandonne pas, continue à t'améliorer !`;
      await supabase.from("admin_messages").insert([{
        user_id: app.user_id, content: msgText, type: "clan_test", is_global: false, read: false,
      }]).catch(() => {});
    }

    showMsg("success", `Statut mis à jour → ${STATUS_CFG[status]?.label}`);
    loadApps();
  };

  const handleSchedule = async () => {
    if (!selected || !sched.date || !sched.time) return;
    setSaving(true);
    try {
      // Create test record
      const { error: testErr } = await supabase.from("clan_tests").insert([{
        application_id: selected.id,
        user_id:        selected.user_id,
        team_id:        selected.team_id,
        date:           sched.date,
        time:           sched.time,
        mode:           sched.mode,
        room_id:        sched.room_id.trim() || null,
        room_password:  sched.room_password.trim() || null,
        notes:          sched.notes.trim() || null,
        created_by:     profile.id,
        status:         "scheduled",
      }]);
      if (testErr) throw testErr;

      // Update application status
      await supabase.from("clan_applications")
        .update({ status:"scheduled", reviewed_by:profile.id })
        .eq("id", selected.id);

      // Notify user
      const dateStr = new Date(`${sched.date}T${sched.time}`).toLocaleString("fr-FR", {
        day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
      });
      await supabase.from("admin_messages").insert([{
        user_id:   selected.user_id,
        content:   `🎮 Test clan planifié ! Date: ${dateStr} — Mode: ${sched.mode}${sched.room_id ? ` — Room: ${sched.room_id}` : ""}${sched.room_password ? ` / Pass: ${sched.room_password}` : ""}`,
        type:      "clan_test_scheduled",
        is_global: false,
        read:      false,
      }]).catch(() => {});

      showMsg("success", "✅ Test planifié ! Le joueur a été notifié.");
      setShowModal(false);
      setSched({ date:"", time:"20:00", mode:"Clash Squad", room_id:"", room_password:"", notes:"" });
      loadApps();
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = apps.filter(a => filter === "all" || a.status === filter);
  const counts = {
    pending:   apps.filter(a=>a.status==="pending").length,
    accepted:  apps.filter(a=>a.status==="accepted").length,
    scheduled: apps.filter(a=>a.status==="scheduled").length,
    rejected:  apps.filter(a=>a.status==="rejected").length,
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"24px 16px 80px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, letterSpacing:3, color:"#fff", margin:"0 0 4px" }}>
            🎮 TESTS CLAN
          </h1>
          <p style={{ color:C.muted, fontSize:13, fontFamily:"'Space Grotesk',sans-serif" }}>
            Gérer les candidatures de test clan
          </p>
        </div>

        {/* Notification */}
        <AnimatePresence>
          {msg && (
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{ padding:"12px 18px", borderRadius:10, marginBottom:16,
                background: msg.type==="error" ? `${C.red}18` : `${C.green}18`,
                border:`1px solid ${msg.type==="error" ? C.red : C.green}40`,
                color: msg.type==="error" ? C.red : C.green,
                fontFamily:"'Space Grotesk',sans-serif", fontSize:13 }}>
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
          {[
            { key:"pending",   label:"En attente", color:C.amber },
            { key:"accepted",  label:"Acceptés",   color:C.green },
            { key:"scheduled", label:"Planifiés",  color:C.cyan  },
            { key:"rejected",  label:"Refusés",    color:C.red   },
          ].map(s => (
            <div key={s.key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
              padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:s.color }}>{counts[s.key]}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, letterSpacing:1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          {["all","pending","accepted","scheduled","rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:"7px 16px", borderRadius:20, cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:1, fontWeight:700,
              background: filter===f ? C.primary : "rgba(255,255,255,0.04)",
              border:`1px solid ${filter===f ? C.primary : C.border}`,
              color: filter===f ? "#fff" : C.muted, transition:"all .15s",
            }}>
              {f==="all"?"TOUT":STATUS_CFG[f]?.label?.toUpperCase()||f.toUpperCase()}
              {f!=="all" && counts[f]>0 && ` (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:C.muted, fontFamily:"'JetBrains Mono',monospace" }}>
            CHARGEMENT...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:C.muted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Aucune candidature {filter !== "all" ? `"${STATUS_CFG[filter]?.label}"` : ""}</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtered.map(app => <AppCard key={app.id} app={app}
              onAccept={() => updateStatus(app.id, "accepted")}
              onReject={() => updateStatus(app.id, "rejected")}
              onSchedule={() => { setSelected(app); setShowModal(true); }} />)}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showModal && selected && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(12px)",
              zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
            <motion.div initial={{scale:.88,y:24}} animate={{scale:1,y:0}} exit={{scale:.88,opacity:0}}
              transition={{type:"spring",stiffness:280,damping:24}}
              style={{ background:"#0f1117",border:`1px solid ${C.cyan}30`,borderRadius:20,
                padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",
                boxShadow:`0 0 40px ${C.cyan}12` }}>

              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
                <div>
                  <h3 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2,color:"#fff",margin:0 }}>
                    📅 PLANIFIER LE TEST
                  </h3>
                  <p style={{ color:C.muted,fontSize:12,margin:"4px 0 0",fontFamily:"'Space Grotesk',sans-serif" }}>
                    {selected.pseudo} — {ROLES_ICON[selected.role]} {selected.role}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  style={{ width:32,height:32,borderRadius:8,background:C.low,border:`1px solid ${C.border}`,
                    color:C.muted,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  ×
                </button>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <ModalField label="Date *">
                    <input type="date" value={sched.date}
                      onChange={e => setSched(s=>({...s,date:e.target.value}))}
                      style={inputStyle} min={new Date().toISOString().split("T")[0]} />
                  </ModalField>
                  <ModalField label="Heure *">
                    <input type="time" value={sched.time}
                      onChange={e => setSched(s=>({...s,time:e.target.value}))}
                      style={inputStyle} />
                  </ModalField>
                </div>

                <ModalField label="Mode de jeu">
                  <select value={sched.mode} onChange={e => setSched(s=>({...s,mode:e.target.value}))}
                    style={{...inputStyle, appearance:"none"}}>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </ModalField>

                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <ModalField label="Room ID">
                    <input value={sched.room_id} onChange={e=>setSched(s=>({...s,room_id:e.target.value}))}
                      placeholder="123456" style={inputStyle} />
                  </ModalField>
                  <ModalField label="Mot de passe">
                    <input value={sched.room_password} onChange={e=>setSched(s=>({...s,room_password:e.target.value}))}
                      placeholder="ABCD" style={inputStyle} />
                  </ModalField>
                </div>

                <ModalField label="Notes (optionnel)">
                  <textarea value={sched.notes} onChange={e=>setSched(s=>({...s,notes:e.target.value}))}
                    placeholder="Instructions pour le joueur..."
                    rows={2} style={{...inputStyle,resize:"vertical"}} />
                </ModalField>

                <div style={{ display:"flex",gap:10,marginTop:4 }}>
                  <button onClick={() => setShowModal(false)}
                    style={{ flex:1,padding:"11px",borderRadius:9,background:"rgba(255,255,255,0.04)",
                      border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:13 }}>
                    Annuler
                  </button>
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                    onClick={handleSchedule} disabled={!sched.date || saving}
                    style={{ flex:2,padding:"11px",borderRadius:9,cursor:sched.date?"pointer":"not-allowed",
                      background:sched.date?`linear-gradient(135deg,${C.cyan}cc,${C.primary})`:"rgba(255,255,255,0.04)",
                      border:"none",color:sched.date?"#fff":C.muted,
                      fontFamily:"'Bebas Neue',cursive",fontSize:16,letterSpacing:2 }}>
                    {saving ? "ENVOI..." : "📅 CONFIRMER"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        select option { background: #0f1117; color: #fff; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
    </div>
  );
}

function AppCard({ app, onAccept, onReject, onSchedule }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_CFG[app.status] || STATUS_CFG.pending;
  const user = app.user || {};
  const ini = user.full_name?.slice(0,2).toUpperCase() || "?";
  const test = app.clan_test;

  return (
    <motion.div layout style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
      {/* Row */}
      <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
        onClick={() => setOpen(o => !o)}>

        {/* Avatar */}
        <div style={{ width:40,height:40,borderRadius:10,background:`${C.primary}20`,
          display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0 }}>
          {user.avatar_url
            ? <img src={user.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,color:C.primary,fontSize:13}}>{ini}</span>}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:"#fff" }}>
              {app.pseudo}
            </span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.muted }}>
              {ROLES_ICON[app.role]} {app.role}
            </span>
            {app.team && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.primary,
                background:`${C.primary}15`, padding:"2px 8px", borderRadius:10 }}>
                {app.team.name}
              </span>
            )}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.muted, marginTop:2 }}>
            {user.free_fire_id || app.ff_id} · {new Date(app.created_at).toLocaleDateString("fr-FR")}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ padding:"4px 10px", borderRadius:20, fontSize:10, fontWeight:700,
            fontFamily:"'JetBrains Mono',monospace", background:st.bg, color:st.color }}>
            {st.label}
          </span>
          <span style={{ color:C.muted, fontSize:12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}} style={{ overflow:"hidden" }}>
            <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${C.border}` }}>

              {/* Skills + experience */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
                {(app.skills||[]).map(s => (
                  <span key={s} style={{ padding:"3px 10px", borderRadius:12, fontSize:10,
                    background:`${C.cyan}12`, color:C.cyan, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>
                    {s}
                  </span>
                ))}
                {(app.experience||[]).map(e => (
                  <span key={e} style={{ padding:"3px 10px", borderRadius:12, fontSize:10,
                    background:`${C.amber}12`, color:C.amber, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>
                    {e}
                  </span>
                ))}
              </div>

              {/* Info chips */}
              <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
                {app.hours_per_day && <Chip icon="⏰" label={`${app.hours_per_day}h/jour`}/>}
                {app.has_mic !== null && <Chip icon="🎙️" label={app.has_mic ? "Micro ✅" : "Sans micro"}/>}
                {app.schedule_ok !== null && <Chip icon="📅" label={app.schedule_ok ? "Schedule OK" : "Pas de schedule fixe"}/>}
              </div>

              {app.message && (
                <div style={{ marginTop:10, padding:"10px 14px", borderRadius:9,
                  background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`,
                  color:"rgba(255,255,255,.6)", fontSize:12, fontFamily:"'Space Grotesk',sans-serif",
                  fontStyle:"italic" }}>
                  "{app.message}"
                </div>
              )}

              {/* Test info if scheduled */}
              {test && (
                <div style={{ marginTop:10, padding:"10px 14px", borderRadius:9,
                  background:`${C.cyan}08`, border:`1px solid ${C.cyan}25` }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.cyan, letterSpacing:2, marginBottom:6 }}>
                    TEST PLANIFIÉ
                  </div>
                  <div style={{ color:"rgba(255,255,255,.75)", fontSize:12, fontFamily:"'Space Grotesk',sans-serif" }}>
                    📅 {test.date} à {test.time} · 🎮 {test.mode}
                    {test.room_id && ` · Room: ${test.room_id}`}
                    {test.room_password && ` / ${test.room_password}`}
                  </div>
                </div>
              )}

              {/* Actions */}
              {app.status === "pending" && (
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button onClick={onAccept}
                    style={{ flex:1,padding:"9px",borderRadius:9,cursor:"pointer",
                      background:`${C.green}18`,border:`1px solid ${C.green}40`,color:C.green,
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12 }}>
                    ✅ Accepter
                  </button>
                  <button onClick={onSchedule}
                    style={{ flex:1,padding:"9px",borderRadius:9,cursor:"pointer",
                      background:`${C.cyan}15`,border:`1px solid ${C.cyan}35`,color:C.cyan,
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12 }}>
                    📅 Planifier test
                  </button>
                  <button onClick={onReject}
                    style={{ flex:1,padding:"9px",borderRadius:9,cursor:"pointer",
                      background:`${C.red}12`,border:`1px solid ${C.red}30`,color:C.red,
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12 }}>
                    ❌ Refuser
                  </button>
                </div>
              )}
              {app.status === "accepted" && !test && (
                <div style={{ marginTop:12 }}>
                  <button onClick={onSchedule}
                    style={{ width:"100%",padding:"10px",borderRadius:9,cursor:"pointer",
                      background:`${C.cyan}18`,border:`1px solid ${C.cyan}40`,color:C.cyan,
                      fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13 }}>
                    📅 Planifier le rendez-vous
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Chip({ icon, label }) {
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",
      borderRadius:12,background:C.low,color:C.muted,
      fontFamily:"'JetBrains Mono',monospace",fontSize:9 }}>
      {icon} {label}
    </span>
  );
}

function ModalField({ label, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1.5,
        color:C.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%",padding:"10px 14px",borderRadius:9,
  background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,
  color:"rgba(255,255,255,.9)",fontFamily:"'Space Grotesk',sans-serif",
  fontSize:13,outline:"none",boxSizing:"border-box",
};