// src/pages/Support.jsx — CipherPool — Redesign matching new style
import { useState, useEffect, useRef } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&family=Share+Tech+Mono&display=swap');
  .sp-wrap { font-family:'Barlow',sans-serif; min-height:100vh; background:#050508; color:#fff; padding:32px clamp(16px,4vw,60px) 60px; }
  .sp-wrap::before { content:''; position:fixed; inset:0; z-index:0; pointer-events:none; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px); }
  .sp-inner { position:relative; z-index:1; max-width:1100px; margin:0 auto; }
  .sp-lbl { font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:4px; color:#dc2626; text-transform:uppercase; display:flex; align-items:center; gap:10px; margin-bottom:16px; }
  .sp-lbl::before { content:''; width:20px; height:2px; background:#dc2626; flex-shrink:0; }
  .sp-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); }
  .sp-card:hover { border-color:rgba(220,38,38,0.25); }
  .sp-input { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:10px 14px; font-family:'Barlow',sans-serif; font-size:14px; outline:none; transition:border .2s; width:100%; }
  .sp-input:focus { border-color:#dc2626; }
  .sp-input::placeholder { color:rgba(255,255,255,0.25); }
  .sp-btn { display:inline-flex; align-items:center; gap:8px; background:#dc2626; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:800; letter-spacing:2px; text-transform:uppercase; padding:11px 24px; border:none; cursor:pointer; clip-path:polygon(0 0,calc(100% - 10px) 0,100% 100%,10px 100%); transition:all .2s; }
  .sp-btn:hover { background:#ef4444; transform:translateY(-1px); }
  .sp-btn:disabled { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.2); cursor:not-allowed; transform:none; }
  .sp-btn-ghost { display:inline-flex; align-items:center; gap:8px; background:transparent; color:rgba(255,255,255,0.4); font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:10px 22px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; clip-path:polygon(0 0,calc(100% - 10px) 0,100% 100%,10px 100%); transition:all .2s; }
  .sp-btn-ghost:hover { color:#fff; border-color:rgba(255,255,255,0.3); }
  .tk-row { display:flex; align-items:flex-start; padding:12px 14px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.04); transition:background .15s; gap:10px; }
  .tk-row:hover { background:rgba(220,38,38,0.05); }
  .tk-row.active { background:rgba(220,38,38,0.08); border-left:2px solid #dc2626; }
  @keyframes sp-fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  select option { background:#0d0d12; }
`;

const STATUS = {
  open:     { label:"OUVERT",   color:"#22c55e", bg:"rgba(34,197,94,0.08)",   border:"rgba(34,197,94,0.25)" },
  pending:  { label:"EN COURS", color:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.25)" },
  answered: { label:"RÉPONDU",  color:"#00e5ff", bg:"rgba(0,229,255,0.08)",   border:"rgba(0,229,255,0.25)" },
  closed:   { label:"FERMÉ",    color:"#6b7280", bg:"rgba(107,114,128,0.08)", border:"rgba(107,114,128,0.2)" },
};
const PRIOR = {
  normal:   { label:"NORMAL",   color:"rgba(255,255,255,0.3)" },
  urgent:   { label:"URGENT",   color:"#fbbf24" },
  critique: { label:"CRITIQUE", color:"#dc2626" },
};
const CAT_ICON = { tournoi:"🎮", coins:"💰", compte:"👤", paiement:"💳", classement:"📊", autre:"❓" };

function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:1.5,
      color, background:bg, border:`1px solid ${border}`, padding:"2px 8px",
      flexShrink:0,
    }}>{label}</span>
  );
}

export default function Support() {
  const { profile } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  const [tickets, setTickets]           = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [newMessage, setNewMessage]     = useState("");
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState("tickets");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ subject:"", category:"autre", priority:"normal", body:"" });
  const [sending, setSending]           = useState(false);
  const bottomRef = useRef(null);

  const isAdmin = ["admin","super_admin","fondateur","founder"].includes(profile?.role);

  // Auto-fill from URL params (profile edit request)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search);
    const type = searchParams.get("type") || raw.get("type");
    if (type === "profile_edit") {
      const g = (k,d="") => searchParams.get(k)||raw.get(k)||d;
      setForm({
        subject: "Demande de modification de profil",
        category: "compte", priority: "normal",
        body: `Nom : ${g("name")}\nEmail : ${g("email")}\nFree Fire ID : ${g("ffId","—")}\n\n[Décrivez ce que vous souhaitez modifier]`,
      });
      setShowForm(true);
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    fetchTickets();
    fetchAdminMessages();
    const ch = supabase.channel("support_"+profile.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_tickets"},p=>{
        if(isAdmin||p.new.user_id===profile.id) setTickets(prev=>[p.new,...prev]);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"support_tickets"},p=>{
        setTickets(prev=>prev.map(t=>t.id===p.new.id?{...t,...p.new}:t));
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_messages"},p=>{
        if(selectedTicket?.id===p.new.ticket_id) fetchMessages(p.new.ticket_id);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const fetchTickets = async () => {
    let q = supabase.from("support_tickets")
      .select("*,user:profiles!support_tickets_user_id_fkey(id,full_name,role),assigned_to:profiles!support_tickets_assigned_to_fkey(id,full_name,role)")
      .order("created_at",{ascending:false});
    if (!isAdmin) q = q.eq("user_id", profile?.id);
    const { data } = await q;
    setTickets(data||[]);
    setLoading(false);
  };

  const fetchAdminMessages = async () => {
    const { data } = await supabase.from("admin_messages").select("*")
      .or(`user_id.eq.${profile?.id},is_global.eq.true`)
      .order("created_at",{ascending:false});
    setAdminMessages(data||[]);
  };

  const fetchMessages = async (id) => {
    const { data } = await supabase.from("support_messages")
      .select("*,sender:profiles!support_messages_sender_id_fkey(id,full_name,role)")
      .eq("ticket_id",id).order("created_at",{ascending:true});
    setMessages(data||[]);
  };

  const createTicket = async () => {
    if (!form.subject.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from("support_tickets")
        .insert([{ user_id:profile?.id, subject:form.subject, category:form.category, priority:form.priority, status:"open" }])
        .select().single();
      if (error || !data) throw error;
      const body = form.body.trim() || form.subject;
      await supabase.from("support_messages").insert([{ ticket_id:data.id, sender_id:profile?.id, message:body }]);
      setTickets(prev=>[data,...prev]);
      setSelectedTicket(data); fetchMessages(data.id);
      setShowForm(false); setForm({subject:"",category:"autre",priority:"normal",body:""}); setTab("tickets");
    } catch(e){ console.error(e); } finally { setSending(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()||!selectedTicket) return;
    const { error } = await supabase.from("support_messages")
      .insert([{ ticket_id:selectedTicket.id, sender_id:profile?.id, message:newMessage.trim() }]);
    if (!error) { setNewMessage(""); fetchMessages(selectedTicket.id); }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    await supabase.from("support_tickets").update({status:"closed"}).eq("id",selectedTicket.id);
    fetchTickets(); setSelectedTicket(null); setMessages([]);
  };

  const assignToMe = async () => {
    if (!selectedTicket||!isAdmin) return;
    await supabase.from("support_tickets").update({assigned_to:profile?.id,status:"pending"}).eq("id",selectedTicket.id);
    fetchTickets(); setSelectedTicket({...selectedTicket,status:"pending"});
  };

  const markAllRead = async () => {
    const ids = adminMessages.filter(m=>!m.read).map(m=>m.id);
    if (!ids.length) return;
    await supabase.from("admin_messages").update({read:true}).in("id",ids);
    fetchAdminMessages();
  };

  const filtered = tickets.filter(t => {
    if (ticketFilter==="open")    return t.status==="open";
    if (ticketFilter==="urgent")  return ["urgent","critique"].includes(t.priority);
    if (ticketFilter==="mine")    return t.assigned_to?.id===profile?.id;
    if (ticketFilter==="closed")  return t.status==="closed";
    return true;
  });

  const unread = adminMessages.filter(m=>!m.read).length;

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#050508",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:"2px solid rgba(220,38,38,0.2)",borderTopColor:"#dc2626",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="sp-wrap">
      <style>{CSS}</style>
      <div className="sp-inner">

        {/* HEADER */}
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}}
          style={{marginBottom:40,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
          <div>
            <div className="sp-lbl">Aide & Support</div>
            <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(32px,5vw,52px)",fontWeight:900,textTransform:"uppercase",lineHeight:.95,letterSpacing:-1}}>
              CENTRE DE <span style={{color:"#dc2626"}}>SUPPORT</span>
            </h1>
            <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.3)",marginTop:8}}>
              {isAdmin ? "GESTION DES TICKETS" : "UN PROBLÈME ? ON EST LÀ"}
            </p>
          </div>
          {!isAdmin && (
            <button className="sp-btn" onClick={()=>setShowForm(true)}>
              + NOUVEAU TICKET
            </button>
          )}
        </motion.div>

        {/* DIVIDER */}
        <div style={{height:1,background:"linear-gradient(90deg,#dc2626,rgba(220,38,38,0.2),transparent)",marginBottom:32}}/>

        {/* ADMIN STATS */}
        {isAdmin && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:32}}>
            {[
              {label:"TOTAL",   value:tickets.length,                                              color:"#fff"},
              {label:"OUVERTS", value:tickets.filter(t=>t.status==="open").length,                 color:"#22c55e"},
              {label:"URGENTS", value:tickets.filter(t=>["urgent","critique"].includes(t.priority)).length, color:"#dc2626"},
              {label:"MES TKT", value:tickets.filter(t=>t.assigned_to?.id===profile?.id).length,  color:"#818cf8"},
            ].map((s,i) => (
              <motion.div key={s.label} className="sp-card"
                initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                style={{padding:"16px 18px",cursor:"pointer"}}
                onClick={()=>setTicketFilter(s.label==="MES TKT"?"mine":s.label==="OUVERTS"?"open":s.label==="URGENTS"?"urgent":"all")}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:36,fontWeight:900,color:s.color,lineHeight:1,marginBottom:4}}>{s.value}</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)"}}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          {[
            {k:"tickets",     label:isAdmin?"GESTION TICKETS":"MES TICKETS", icon:"🎟️"},
            {k:"announcements",label:"ANNONCES", icon:"📢"},
          ].map(({k,label,icon}) => (
            <button key={k} onClick={()=>setTab(k)} style={{
              background:"none",border:"none",cursor:"pointer",padding:"12px 20px",
              fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:800,letterSpacing:2,
              color:tab===k?"#fff":"rgba(255,255,255,0.3)",
              borderBottom:`2px solid ${tab===k?"#dc2626":"transparent"}`,
              transition:"all .2s",position:"relative",
            }}>
              {icon} {label}
              {k==="announcements"&&unread>0&&(
                <span style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:"#dc2626",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>
              )}
            </button>
          ))}
        </div>

        {/* TICKETS TAB */}
        {tab==="tickets" && (
          <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16,minHeight:520}}>

            {/* List */}
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {isAdmin && (
                <select className="sp-input" value={ticketFilter} onChange={e=>setTicketFilter(e.target.value)} style={{marginBottom:10,cursor:"pointer"}}>
                  <option value="all">TOUS LES TICKETS</option>
                  <option value="open">OUVERTS</option>
                  <option value="urgent">URGENTS</option>
                  <option value="mine">MES TICKETS</option>
                  <option value="closed">FERMÉS</option>
                </select>
              )}
              <div className="sp-card" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.25)"}}>
                    {filtered.length} TICKET{filtered.length!==1?"S":""}
                  </span>
                </div>
                {filtered.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 20px"}}>
                    <p style={{fontSize:32,opacity:.2,marginBottom:10}}>🎟️</p>
                    <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:3,color:"rgba(255,255,255,0.2)"}}>AUCUN TICKET</p>
                  </div>
                ) : (
                  <div style={{flex:1,overflowY:"auto",maxHeight:500}}>
                    {filtered.map(t => {
                      const sc = STATUS[t.status]||STATUS.open;
                      const active = selectedTicket?.id===t.id;
                      return (
                        <div key={t.id} className={`tk-row${active?" active":""}`}
                          onClick={()=>{setSelectedTicket(t);fetchMessages(t.id);}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,marginBottom:4}}>
                              <p style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{t.subject}</p>
                              <Badge label={sc.label} color={sc.color} bg={sc.bg} border={sc.border}/>
                            </div>
                            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                              <span style={{fontSize:11}}>{CAT_ICON[t.category]||"❓"}</span>
                              {isAdmin&&t.user&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.35)"}}>{t.user.full_name}</span>}
                              {t.priority!=="normal"&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:PRIOR[t.priority]?.color}}>{PRIOR[t.priority]?.label}</span>}
                              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.2)",marginLeft:"auto"}}>
                                {new Date(t.created_at).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat panel */}
            {selectedTicket ? (
              <div className="sp-card" style={{display:"flex",flexDirection:"column",height:580}}>
                {/* Chat header */}
                <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                    <div>
                      <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:800,marginBottom:6}}>{selectedTicket.subject}</p>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        {(() => { const sc=STATUS[selectedTicket.status]||STATUS.open; return <Badge label={sc.label} color={sc.color} bg={sc.bg} border={sc.border}/>; })()}
                        {selectedTicket.priority!=="normal"&&<Badge label={PRIOR[selectedTicket.priority]?.label} color={PRIOR[selectedTicket.priority]?.color} bg={`${PRIOR[selectedTicket.priority]?.color}15`} border={`${PRIOR[selectedTicket.priority]?.color}30`}/>}
                        {isAdmin&&selectedTicket.user&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.35)"}}>👤 {selectedTicket.user.full_name}</span>}
                        {selectedTicket.assigned_to&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"#818cf8"}}>→ {selectedTicket.assigned_to.full_name}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {isAdmin&&!selectedTicket.assigned_to&&<button className="sp-btn-ghost" style={{padding:"7px 16px",fontSize:10}} onClick={assignToMe}>PRENDRE</button>}
                      {selectedTicket.status!=="closed"&&<button className="sp-btn" style={{padding:"7px 16px",fontSize:10,background:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.4)"}} onClick={closeTicket}>FERMER ✕</button>}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
                  {messages.map((m,i) => {
                    const isMe = m.sender_id===profile?.id;
                    const isAdminSender = ["admin","super_admin","fondateur","founder"].includes(m.sender?.role);
                    return (
                      <motion.div key={m.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.03}}
                        style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                        <div style={{
                          maxWidth:"75%",padding:"10px 14px",
                          background:isMe?"rgba(220,38,38,0.12)":"rgba(255,255,255,0.04)",
                          border:`1px solid ${isMe?"rgba(220,38,38,0.25)":"rgba(255,255,255,0.07)"}`,
                          borderLeft:!isMe&&isAdminSender?"3px solid #818cf8":undefined,
                        }}>
                          {!isMe && (
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:800,color:isAdminSender?"#818cf8":"rgba(255,255,255,0.5)"}}>
                                {m.sender?.full_name||"Utilisateur"}
                              </span>
                              {isAdminSender&&<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:1,color:"#818cf8",background:"rgba(129,140,248,0.1)",border:"1px solid rgba(129,140,248,0.2)",padding:"1px 6px"}}>ADMIN</span>}
                            </div>
                          )}
                          <p style={{fontSize:14,lineHeight:1.6,color:"rgba(255,255,255,0.85)",whiteSpace:"pre-wrap"}}>{m.message}</p>
                          <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.2)",marginTop:6,textAlign:isMe?"right":"left"}}>
                            {new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef}/>
                </div>

                {/* Input */}
                {selectedTicket.status!=="closed" && (
                  <div style={{padding:"12px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0,display:"flex",gap:10}}>
                    <textarea
                      className="sp-input"
                      value={newMessage}
                      onChange={e=>setNewMessage(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                      placeholder="Votre message… (Entrée pour envoyer)"
                      rows={2} style={{resize:"none",flex:1}}
                    />
                    <button className="sp-btn" onClick={sendMessage} disabled={!newMessage.trim()} style={{alignSelf:"flex-end",padding:"11px 20px"}}>
                      ENVOYER
                    </button>
                  </div>
                )}
                {selectedTicket.status==="closed" && (
                  <div style={{padding:"12px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
                    <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.2)"}}>TICKET FERMÉ</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="sp-card" style={{display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:40}}>
                <p style={{fontSize:48,opacity:.1}}>💬</p>
                <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.2)"}}>SÉLECTIONNE UN TICKET</p>
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab==="announcements" && (
          <div>
            {unread>0&&(
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button className="sp-btn-ghost" onClick={markAllRead} style={{fontSize:10}}>TOUT MARQUER LU</button>
              </div>
            )}
            {adminMessages.length===0 ? (
              <div style={{textAlign:"center",padding:"80px 20px"}}>
                <p style={{fontSize:48,opacity:.1,marginBottom:12}}>📢</p>
                <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.2)"}}>AUCUNE ANNONCE</p>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {adminMessages.map((m,i) => (
                  <motion.div key={m.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}
                    className="sp-card" style={{padding:"16px 20px",borderLeft:`3px solid ${m.read?"rgba(255,255,255,0.08)":"#dc2626"}`,position:"relative"}}>
                    {!m.read&&<span style={{position:"absolute",top:14,right:14,width:7,height:7,borderRadius:"50%",background:"#dc2626",animation:"blink 1s infinite"}}/>}
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:18}}>{m.type==="warning"?"⚠️":m.type==="update"?"🔄":"📢"}</span>
                      <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:800}}>{m.title||"Annonce"}</p>
                      <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:1,color:"rgba(255,255,255,0.2)",marginLeft:"auto"}}>
                        {m.is_global?"📢 GÉNÉRAL":"📩 PERSONNEL"}
                      </span>
                    </div>
                    <p style={{fontSize:14,lineHeight:1.6,color:"rgba(255,255,255,0.55)"}}>{m.content}</p>
                    <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.2)",marginTop:10}}>
                      {new Date(m.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW TICKET MODAL */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"fixed",inset:0,background:"rgba(5,5,8,0.9)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}>
            <motion.div initial={{opacity:0,scale:.96,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96}}
              style={{background:"#0a0a12",border:"1px solid rgba(220,38,38,0.2)",padding:"clamp(14px,4vw,28px) clamp(14px,4vw,32px)",maxWidth:540,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                <h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,letterSpacing:1}}>
                  🎟️ NOUVEAU TICKET
                </h2>
                <button onClick={()=>setShowForm(false)} style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.2)",color:"#dc2626",width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div>
                  <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)",marginBottom:7}}>SUJET *</p>
                  <input className="sp-input" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Décrivez votre problème en une ligne…"/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
                  <div>
                    <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)",marginBottom:7}}>CATÉGORIE</p>
                    <select className="sp-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{cursor:"pointer"}}>
                      <option value="tournoi">🎮 Tournoi</option>
                      <option value="coins">💰 Coins</option>
                      <option value="compte">👤 Compte</option>
                      <option value="paiement">💳 Paiement</option>
                      <option value="classement">📊 Classement</option>
                      <option value="autre">❓ Autre</option>
                    </select>
                  </div>
                  <div>
                    <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)",marginBottom:7}}>PRIORITÉ</p>
                    <div style={{display:"flex",gap:6}}>
                      {[["normal","NORMAL","rgba(255,255,255,0.3)"],["urgent","URGENT","#fbbf24"],["critique","🔴 CRIT","#dc2626"]].map(([v,lb,c])=>(
                        <button key={v} onClick={()=>setForm({...form,priority:v})} style={{
                          flex:1,padding:"9px 4px",border:`1px solid ${form.priority===v?c:c+"30"}`,
                          background:form.priority===v?`${c}15`:"transparent",
                          color:form.priority===v?c:"rgba(255,255,255,0.3)",cursor:"pointer",
                          fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:1,transition:"all .18s",
                        }}>{lb}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)",marginBottom:7}}>MESSAGE / DÉTAILS</p>
                  <textarea className="sp-input" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={6} placeholder="Décrivez votre demande en détail…" style={{resize:"vertical",minHeight:120}}/>
                </div>

                <div style={{display:"flex",gap:10,paddingTop:4}}>
                  <button className="sp-btn-ghost" onClick={()=>setShowForm(false)} style={{flex:1,justifyContent:"center"}}>ANNULER</button>
                  <button className="sp-btn" disabled={!form.subject.trim()||sending} onClick={createTicket} style={{flex:2,justifyContent:"center"}}>
                    {sending?"ENVOI…":"ENVOYER LE TICKET"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}