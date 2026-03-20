// src/pages/Dashboard.jsx — CipherPool eSports — Redesign
import { useOutletContext, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,800;0,900;1,900&family=Barlow:wght@400;500;600&family=Share+Tech+Mono&display=swap');
  .db-wrap { font-family:'Barlow',sans-serif; min-height:100vh; background:#050508; color:#fff; padding:32px clamp(16px,4vw,60px) 60px; position:relative; }
  .db-wrap::before { content:''; position:fixed; inset:0; z-index:0; pointer-events:none; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px); }
  .db-content { position:relative; z-index:1; }
  .stat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); padding:24px 20px; cursor:pointer; transition:border-color .25s,transform .25s,box-shadow .25s; position:relative; overflow:hidden; }
  .stat-card:hover { border-color:rgba(124,58,237,0.4); transform:translateY(-3px); box-shadow:0 12px 40px rgba(124,58,237,0.1); }
  .stat-card::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--accent,#7c3aed); transform:scaleX(0); transform-origin:left; transition:transform .3s; }
  .stat-card:hover::after { transform:scaleX(1); }
  .trn-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); transition:all .25s; cursor:pointer; overflow:hidden; }
  .trn-card:hover { border-color:rgba(124,58,237,0.35); box-shadow:0 8px 32px rgba(124,58,237,0.08); }
  .db-lbl { font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:4px; color:#7c3aed; text-transform:uppercase; display:flex; align-items:center; gap:10px; margin-bottom:20px; }
  .db-lbl::before { content:''; width:20px; height:2px; background:#7c3aed; flex-shrink:0; }
  .ql { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); cursor:pointer; transition:all .2s; }
  .ql:hover { background:rgba(124,58,237,0.06); border-color:rgba(124,58,237,0.25); transform:translateX(4px); }
  .db-btn { display:inline-flex; align-items:center; gap:8px; background:#7c3aed; color:#fff; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:800; letter-spacing:2px; text-transform:uppercase; padding:11px 24px; border:none; cursor:pointer; clip-path:polygon(0 0,calc(100% - 10px) 0,100% 100%,10px 100%); transition:all .2s; }
  .db-btn:hover { background:#06b6d4; transform:translateY(-2px); }
  .db-btn-ghost { display:inline-flex; align-items:center; gap:8px; background:transparent; color:rgba(255,255,255,0.5); font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:10px 22px; border:1px solid rgba(255,255,255,0.12); cursor:pointer; clip-path:polygon(0 0,calc(100% - 10px) 0,100% 100%,10px 100%); transition:all .2s; }
  .db-btn-ghost:hover { color:#fff; border-color:rgba(255,255,255,0.3); }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
`;

const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n ?? 0);

function StatCard({ icon, label, value, suffix="", accent, delay=0, onClick }) {
  return (
    <motion.div className="stat-card" style={{"--accent":accent}}
      initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay,duration:.4}} onClick={onClick}>
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:accent,opacity:.07,filter:"blur(24px)",pointerEvents:"none"}}/>
      <div style={{fontSize:20,marginBottom:14,width:42,height:42,background:`${accent}15`,border:`1px solid ${accent}30`,display:"flex",alignItems:"center",justifyContent:"center"}}>{icon}</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(32px,4vw,48px)",fontWeight:900,lineHeight:1,color:"#fff",marginBottom:6}}>
        {fmt(value)}<span style={{fontSize:"50%",color:accent,marginLeft:2}}>{suffix}</span>
      </div>
      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)"}}>{label}</div>
    </motion.div>
  );
}

function TrnCard({ t, index }) {
  const nav = useNavigate();
  const pct = t.max_players > 0 ? Math.round((t.current_players/t.max_players)*100) : 0;
  return (
    <motion.div className="trn-card" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:index*.08,duration:.3}} onClick={() => nav(`/tournaments/${t.id}`)}>
      <div style={{display:"flex",height:72}}>
        <div style={{width:3,flexShrink:0,background:t.status==="in_progress"?"#7c3aed":"#22c55e"}}/>
        <div style={{width:72,flexShrink:0,overflow:"hidden",background:"#0d0d12"}}>
          {t.banner_url ? <img src={t.banner_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.6}}/> : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:24,opacity:.15}}>🎮</span></div>}
        </div>
        <div style={{flex:1,padding:"10px 14px",display:"flex",flexDirection:"column",justifyContent:"space-between",minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</p>
            {t.status==="in_progress" && <span style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,fontFamily:"'Share Tech Mono',monospace",fontSize:8,letterSpacing:2,color:"#7c3aed"}}><span style={{width:5,height:5,borderRadius:"50%",background:"#7c3aed",animation:"blink 1s infinite"}}/> LIVE</span>}
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:1}}>{t.current_players??0}/{t.max_players} JOUEURS</span>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:pct>=80?"#7c3aed":"rgba(255,255,255,0.25)",letterSpacing:1}}>{pct}%</span>
            </div>
            <div style={{height:2,background:"rgba(255,255,255,0.06)"}}>
              <div style={{height:"100%",width:`${pct}%`,background:pct>=80?"#7c3aed":"#22c55e",transition:"width .5s"}}/>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const QUICK_LINKS = [
  {icon:"🏆",label:"Tournois",    sub:"Voir les compétitions",  path:"/tournaments"},
  {icon:"📊",label:"Classement",  sub:"Ton rang global",        path:"/leaderboard"},
  {icon:"📈",label:"Mes Stats",   sub:"Kills · Wins · K/D",     path:"/stats"},
  {icon:"🎁",label:"Récompenses", sub:"Coins & bonus quotidiens",path:"/daily-rewards"},
  {icon:"🏅",label:"Achievements",sub:"Succès débloqués",       path:"/achievements"},
  {icon:"🛍️",label:"Boutique",    sub:"Items exclusifs",        path:"/store"},
];

export default function Dashboard() {
  const nav = useNavigate();
  const { profile, balance, notify } = useOutletContext() || {};
  const [tournaments, setTournaments] = useState([]);
  const [messages,    setMessages]    = useState([]);
  const [stats,       setStats]       = useState({played:0,wins:0,kills:0,winRate:0,rank:null});
  const [loading,     setLoading]     = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] ?? "JOUEUR";
  const coins     = balance ?? profile?.coins ?? 0;
  const timeStr   = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

  useEffect(() => {
    if (!profile?.id) return;
    fetchData();

    // ✅ Real-time: tournaments + player stats
    const channel = supabase
      .channel(`dashboard-${profile.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "tournaments"
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTournaments(prev => {
            const t = payload.new;
            if (!["open","in_progress"].includes(t.status)) return prev;
            return [t, ...prev].slice(0, 5);
          });
        } else if (payload.eventType === "UPDATE") {
          setTournaments(prev =>
            prev.map(t => t.id === payload.new.id ? payload.new : t)
                .filter(t => ["open","in_progress"].includes(t.status))
          );
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "player_stats",
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const st = payload.new;
        setStats({
          played: st.tournaments_played ?? 0,
          wins: st.wins ?? 0,
          kills: st.kills ?? 0,
          winRate: st.wins > 0 && st.tournaments_played > 0
            ? Math.round((st.wins / st.tournaments_played) * 100) : 0,
          rank: st.rank ?? null
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const [{data:msgs},{data:all},{data:st}] = await Promise.all([
        supabase.from("admin_messages").select("*").order("created_at",{ascending:false}).limit(3),
        supabase.from("tournaments").select("id,name,status,max_players,current_players").in("status",["open","in_progress"]).order("created_at",{ascending:false}).limit(5),
        supabase.from("player_stats").select("*").eq("user_id",profile.id).maybeSingle(),
      ]);
      setMessages(msgs??[]);
      setTournaments(all??[]);
      if(st) setStats({played:st.tournaments_played??0,wins:st.wins??0,kills:st.kills??0,winRate:st.wins>0&&st.tournaments_played>0?Math.round((st.wins/st.tournaments_played)*100):0,rank:st.rank??null});
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#050508",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:"2px solid rgba(124,58,237,0.2)",borderTopColor:"#7c3aed",borderRadius:"50%",margin:"0 auto 16px",animation:"spin 1s linear infinite"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:4,color:"rgba(124,58,237,0.6)"}}>CHARGEMENT</p>
      </div>
    </div>
  );

  return (
    <div className="db-wrap">
      <style>{CSS}</style>
      <div className="db-content">

        {/* HEADER */}
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} style={{marginBottom:40,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
          <div>
            <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.3)",marginBottom:6,textTransform:"uppercase"}}>BONJOUR · {timeStr}</p>
            <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(36px,6vw,64px)",fontWeight:900,lineHeight:.95,textTransform:"uppercase",letterSpacing:-1}}>
              BIENVENUE, <span style={{color:"#7c3aed"}}>{firstName.toUpperCase()}</span>
            </h1>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            {profile?.verification_status==="approved" && (
              <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:2,color:"#22c55e",padding:"6px 14px",background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.2)"}}>✓ VÉRIFIÉ</div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:800,padding:"8px 16px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>
              <span style={{color:"#fbbf24"}}>💎</span>{coins.toLocaleString()}<span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>CP</span>
            </div>
            <button className="db-btn" onClick={() => nav("/tournaments")}>🏆 TOURNOIS</button>
          </div>
        </motion.div>

        {/* DIVIDER */}
        <div style={{height:1,background:"linear-gradient(90deg,#7c3aed,rgba(124,58,237,0.2),transparent)",marginBottom:40}}/>

        {/* GRID */}
        <div style={{display:"grid",gridTemplateColumns:"1fr minmax(260px,300px)",gap:32,alignItems:"start"}}>

          {/* LEFT */}
          <div style={{display:"flex",flexDirection:"column",gap:40}}>

            {/* Stats */}
            <div>
              <div className="db-lbl">Mes Performances</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                <StatCard icon="🎮" label="TOURNOIS JOUÉS"  value={stats.played}  accent="#00e5ff" delay={0}    onClick={() => nav("/stats")}/>
                <StatCard icon="🏆" label="VICTOIRES"        value={stats.wins}    accent="#fbbf24" delay={.08}  onClick={() => nav("/stats")}/>
                <StatCard icon="🎯" label="KILLS TOTAUX"     value={stats.kills}   accent="#7c3aed" delay={.16}  onClick={() => nav("/stats")}/>
                <StatCard icon="📈" label="WIN RATE"         value={stats.winRate} accent="#22c55e" delay={.24}  suffix="%" onClick={() => nav("/stats")}/>
              </div>
            </div>

            {/* Tournaments */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div className="db-lbl" style={{marginBottom:0}}>Tournois Actifs</div>
                <button className="db-btn-ghost" style={{fontSize:10}} onClick={() => nav("/tournaments")}>VOIR TOUT →</button>
              </div>
              {tournaments.length === 0 ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{textAlign:"center",padding:"60px 20px",border:"1px solid rgba(255,255,255,0.04)",background:"rgba(255,255,255,0.01)"}}>
                  <p style={{fontSize:36,marginBottom:12,opacity:.3}}>🏟️</p>
                  <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:800,color:"rgba(255,255,255,0.2)",letterSpacing:2,marginBottom:16}}>ARÈNE EN VEILLE</p>
                  <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.2)",letterSpacing:1,marginBottom:24}}>Aucun tournoi actif pour le moment</p>
                  <button className="db-btn" onClick={() => nav("/tournaments")}>PARCOURIR →</button>
                </motion.div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {tournaments.map((t,i) => <TrnCard key={t.id} t={t} index={i}/>)}
                </div>
              )}
            </div>

            {/* Announcements */}
            {messages.length > 0 && (
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.5}}>
                <div className="db-lbl">Annonces</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {messages.map(m => (
                    <div key={m.id} style={{padding:"14px 16px",background:"rgba(124,58,237,0.04)",border:"1px solid rgba(124,58,237,0.15)",borderLeft:"3px solid #7c3aed"}}>
                      <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,marginBottom:4}}>{m.title??"ANNONCE"}</p>
                      <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{m.content??m.message??"—"}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{display:"flex",flexDirection:"column",gap:24}}>

            {/* Rank block */}
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.35}} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",padding:"24px 20px"}}>
              <div className="db-lbl">Mon Classement</div>
              <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:20}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:64,fontWeight:900,lineHeight:1,color:stats.rank?"#fff":"rgba(255,255,255,0.08)"}}>
                  {stats.rank?`#${stats.rank}`:"—"}
                </span>
                <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,letterSpacing:2,color:stats.rank?"#7c3aed":"rgba(255,255,255,0.2)"}}>GLOBAL</span>
              </div>
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.3)"}}>WIN RATE</span>
                  <span style={{fontFamily:"'Barlow Condensed',monospace",fontSize:14,fontWeight:800,color:"#22c55e"}}>{stats.winRate}%</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <motion.div initial={{width:0}} animate={{width:`${stats.winRate}%`}} transition={{delay:.8,duration:1,ease:"easeOut"}} style={{height:"100%",background:"linear-gradient(90deg,#22c55e,#16a34a)"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.15)"}}>0%</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.15)"}}>100%</span>
                </div>
              </div>
              {(() => {
                const roles = {super_admin:{label:"SUPER ADMIN",color:"#00e5ff"},admin:{label:"ADMIN",color:"#818cf8"},founder:{label:"FONDATEUR",color:"#7c3aed"},fondateur:{label:"FONDATEUR",color:"#7c3aed"},user:{label:"JOUEUR",color:"rgba(255,255,255,0.35)"}};
                const r = roles[profile?.role]??roles.user;
                return (
                  <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${r.color}10`,border:`1px solid ${r.color}30`,padding:"6px 14px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:800,letterSpacing:2,color:r.color}}>
                    {r.label}
                  </div>
                );
              })()}
            </motion.div>

            {/* Quick links */}
            <div>
              <div className="db-lbl">Navigation Rapide</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {QUICK_LINKS.map((l,i) => (
                  <motion.div key={l.label} className="ql" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} transition={{delay:i*.06,duration:.3}} onClick={() => nav(l.path)}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:18}}>{l.icon}</span>
                      <div>
                        <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:800,letterSpacing:.5}}>{l.label}</p>
                        <p style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>{l.sub}</p>
                      </div>
                    </div>
                    <span style={{color:"rgba(124,58,237,0.5)",fontSize:16}}>›</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}