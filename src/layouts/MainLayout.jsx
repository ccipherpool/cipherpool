import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationProvider, useNotify } from "../components/NotificationSystem";

/*
 ██████╗██╗██████╗ ██╗  ██╗███████╗██████╗ ██████╗  ██████╗  ██████╗ ██╗
██╔════╝██║██╔══██╗██║  ██║██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗██║
██║     ██║██████╔╝███████║█████╗  ██████╔╝██████╔╝██║   ██║██║   ██║██║
██║     ██║██╔═══╝ ██╔══██║██╔══╝  ██╔══██╗██╔═══╝ ██║   ██║██║   ██║██║
╚██████╗██║██║     ██║  ██║███████╗██║  ██║██║     ╚██████╔╝╚██████╔╝███████╗
 ╚═════╝╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝      ╚═════╝  ╚═════╝ ╚══════╝

 MAIN LAYOUT v3 — Topbar + Sidebar + Content | Gaming Dark Edition
*/

// ═══════════════════════════ PALETTE ════════════════════════════════════════
const C = {
  bg:       "#0b0b0f",
  surface:  "#12121a",
  card:     "#12121a",
  card2:    "#16161f",
  border:   "#1e1e2a",
  borderGlow:"rgba(124,58,237,0.25)",
  primary:  "#7c3aed",
  primaryDim:"rgba(124,58,237,0.12)",
  primaryGlow:"rgba(124,58,237,0.4)",
  secondary:"#22c55e",
  cyan:     "#00d4ff",
  cyanDim:  "rgba(0,212,255,0.1)",
  cyanGlow: "rgba(0,212,255,0.35)",
  danger:   "#ef4444",
  amber:    "#fbbf24",
  text:     "rgba(255,255,255,0.92)",
  textMid:  "rgba(255,255,255,0.5)",
  textLow:  "rgba(255,255,255,0.2)",
};

const ROLE_CFG = {
  super_admin:{ label:"SUPER ADMIN", color:C.cyan,    glow:`0 0 12px ${C.cyanGlow}` },
  admin:      { label:"ADMIN",       color:"#818cf8",  glow:"0 0 12px rgba(129,140,248,0.4)" },
  founder:    { label:"FONDATEUR",   color:C.primary,  glow:`0 0 12px ${C.primaryGlow}` },
  fondateur:  { label:"FONDATEUR",   color:C.primary,  glow:`0 0 12px ${C.primaryGlow}` },
  designer:   { label:"DESIGNER",    color:C.secondary,glow:"0 0 12px rgba(34,197,94,0.4)" },
  user:       { label:"MEMBRE",      color:C.textMid,  glow:"none" },
};

const NAV = [
  { to:"/dashboard",    label:"Tableau de bord", icon:"⚡" },
  { to:"/tournaments",  label:"Tournois",         icon:"🏆" },
  { to:"/leaderboard",  label:"Classement",       icon:"📊" },
  { to:"/teams",        label:"Équipes",          icon:"🛡️" },
  { to:"/clans",        label:"Clans",            icon:"⚔️" },
  { to:"/news",         label:"Actualités",       icon:"📰" },
  { to:"/chat",         label:"Chat global",      icon:"💬", chat:true },
  { to:"/store",        label:"Boutique",         icon:"🛍️" },
  { to:"/wallet",       label:"Portefeuille",     icon:"💎" },
  { to:"/profile",      label:"Mon profil",       icon:"👤" },
  { to:"/support",      label:"Assistance",       icon:"🎧", support:true },
  { to:"/stats",        label:"Mes Stats",        icon:"📈" },
  { to:"/achievements", label:"Achievements",     icon:"🏅" },
  { to:"/daily-rewards",label:"Daily Rewards",    icon:"🎁" },
];

const NAV_ADMIN = [
  { to:"/founder",      label:"Panel Fondateur",  icon:"⚡", roles:["founder","fondateur","super_admin"] },
  { to:"/admin/news",   label:"Actualités",       icon:"📰", roles:["admin","fondateur","founder","super_admin"] },
  { to:"/admin/results",label:"Résultats",        icon:"📋", roles:["admin","fondateur","founder","super_admin"] },
  { to:"/designer",     label:"Designer",         icon:"🎨", roles:["designer","admin","super_admin"] },
  { to:"/admin-store",  label:"Boutique Admin",   icon:"🏪", roles:["admin","super_admin"] },
  { to:"/admin",        label:"Administration",   icon:"🛡️", roles:["admin","super_admin"] },
  { to:"/super-admin",  label:"Super Admin",      icon:"👑", roles:["super_admin"] },
];

// ═══════════════════════════ BG EFFECTS ═════════════════════════════════════
function OrbCanvas() {
  const ref = useRef(null);
  // ← désactivé sur mobile : trop lourd sur batterie/CPU
  const isMobileDevice = typeof window !== "undefined" && window.innerWidth < 768;
  useEffect(() => {
    if (isMobileDevice) return; // skip entirely
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const W = () => canvas.width, H = () => canvas.height;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const N = 50;
    const pts = Array.from({length:N}, () => ({
      x: Math.random(), y: Math.random(),
      vx:(Math.random()-.5)*.00016, vy:(Math.random()-.5)*.00016,
      r: Math.random()*1.3+.4,
      col:[[124,58,237],[0,212,255],[34,197,94],[79,70,229]][Math.floor(Math.random()*4)],
      a: Math.random()*.45+.18,
    }));
    const orbs = [
      {cx:.15,cy:.2, r:.36,vx:.00055,vy:.00042,rgb:[124,58,237],a:.07,p:0},
      {cx:.82,cy:.72,r:.28,vx:-.00048,vy:.00058,rgb:[0,212,255],a:.05,p:1.3},
      {cx:.55,cy:.5, r:.22,vx:.00040,vy:-.00050,rgb:[34,197,94],a:.032,p:2.6},
      {cx:.88,cy:.15,r:.18,vx:-.00050,vy:-.00042,rgb:[124,58,237],a:.025,p:.8},
    ];
    const draw = () => {
      t++;
      ctx.clearRect(0,0,W(),H());
      orbs.forEach(o=>{
        o.cx+=o.vx*Math.sin(t*.006+o.p); o.cy+=o.vy*Math.cos(t*.004+o.p);
        if(o.cx<-.1||o.cx>1.1)o.vx*=-1; if(o.cy<-.1||o.cy>1.1)o.vy*=-1;
        const x=o.cx*W(),y=o.cy*H();
        const r=o.r*Math.max(W(),H())*(1+.05*Math.sin(t*.01+o.p));
        const a=o.a*(1+.12*Math.sin(t*.016+o.p));
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        const[R,G,B]=o.rgb;
        g.addColorStop(0,`rgba(${R},${G},${B},${a})`);
        g.addColorStop(.4,`rgba(${R},${G},${B},${a*.45})`);
        g.addColorStop(1,`rgba(${R},${G},${B},0)`);
        ctx.fillStyle=g; ctx.fillRect(0,0,W(),H());
      });
      pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0;});
      const DIST=0.13;
      for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<DIST){
          const alpha=(1-dist/DIST)*.16;
          const[R,G,B]=pts[i].col;
          ctx.beginPath(); ctx.strokeStyle=`rgba(${R},${G},${B},${alpha})`; ctx.lineWidth=.5;
          ctx.moveTo(pts[i].x*W(),pts[i].y*H()); ctx.lineTo(pts[j].x*W(),pts[j].y*H()); ctx.stroke();
        }
      }
      pts.forEach(p=>{
        const px=p.x*W(),py=p.y*H();
        const[R,G,B]=p.col; const a=p.a*(1+.2*Math.sin(t*.02+px));
        ctx.beginPath(); ctx.arc(px,py,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${R},${G},${B},${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(px,py,p.r*2.5,0,Math.PI*2);
        ctx.fillStyle=`rgba(${R},${G},${B},${a*.1})`; ctx.fill();
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  if (isMobileDevice) return null;
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

const GridBg = () => (
  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
    backgroundImage:`linear-gradient(rgba(124,58,237,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.03) 1px,transparent 1px)`,
    backgroundSize:"48px 48px"}}/>
);

// ═══════════════════════════ TOPBAR ═════════════════════════════════════════
function Topbar({ profile, balance, equippedItems, chatUnread, unread, urgent, onMenuClick }) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const initials = profile?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
  const totalNotifs = unread + urgent;

  return (
    <header style={{
      height:64, flexShrink:0, position:"sticky", top:0, zIndex:40,
      background:"rgba(11,11,15,0.85)",
      backdropFilter:"blur(20px) saturate(1.8)",
      borderBottom:`1px solid ${C.border}`,
      boxShadow:`0 1px 0 rgba(124,58,237,0.1), 0 4px 30px rgba(0,0,0,0.5)`,
      display:"flex", alignItems:"center", gap:16, padding:"0 20px",
    }}>
      {/* Mobile menu button */}
      <button onClick={onMenuClick}
        style={{display:"none",width:38,height:38,borderRadius:10,background:C.primaryDim,border:`1px solid ${C.border}`,cursor:"pointer",alignItems:"center",justifyContent:"center",flexShrink:0}}
        className="cp-mobile-menu">
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {[0,1,2].map(i=><span key={i} style={{display:"block",width:16,height:1.5,background:C.primary,borderRadius:2}}/>)}
        </div>
      </button>

      {/* Logo — desktop */}
      <Link to="/dashboard" style={{textDecoration:"none",flexShrink:0,display:"flex",alignItems:"center",gap:10}} className="cp-logo-top">
        <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.primary},#4f46e5)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${C.primaryGlow}`,flexShrink:0}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"#fff",letterSpacing:.5}}>CP</span>
        </div>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:"#fff"}}>
          CIPHER<span style={{color:C.primary,textShadow:`0 0 18px ${C.primaryGlow}`}}>POOL</span>
        </span>
      </Link>

      {/* ── Search ── */}
      <div style={{flex:1,maxWidth:380,position:"relative"}} className="cp-search">
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:13,opacity:.4}}>🔍</span>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher tournois, joueurs..."
            style={{
              width:"100%", padding:"9px 14px 9px 36px", borderRadius:10,
              background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`,
              color:C.text, fontFamily:"'Space Grotesk',sans-serif", fontSize:13,
              outline:"none", boxSizing:"border-box", transition:"all .2s",
            }}
            onFocus={e=>{e.target.style.borderColor=`rgba(124,58,237,0.4)`;e.target.style.background="rgba(124,58,237,0.06)";e.target.style.boxShadow=`0 0 0 3px rgba(124,58,237,0.1)`;}}
            onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.background="rgba(255,255,255,0.04)";e.target.style.boxShadow="none";}}
          />
        </div>
      </div>

      <div style={{flex:1}}/>

      {/* ── Wallet ── */}
      <Link to="/wallet" style={{
        display:"flex",alignItems:"center",gap:9,padding:"8px 14px",
        borderRadius:10,background:`linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.1))`,
        border:`1px solid rgba(124,58,237,0.25)`,textDecoration:"none",flexShrink:0,
        boxShadow:`0 2px 14px rgba(124,58,237,0.12)`,transition:"all .25s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.5)";e.currentTarget.style.boxShadow=`0 4px 20px rgba(124,58,237,0.25)`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.25)";e.currentTarget.style.boxShadow=`0 2px 14px rgba(124,58,237,0.12)`;}}
        className="cp-wallet-btn">
        <span style={{fontSize:14}}>💎</span>
        <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:"#fff"}}>
          {balance.toLocaleString("fr-FR")}
        </span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,.35)",letterSpacing:1}}>pts</span>
      </Link>

      {/* ── Notifications ── */}
      <div style={{position:"relative"}}>
        <Link to="/support" style={{
          width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.04)",
          border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",
          textDecoration:"none",fontSize:17,transition:"all .2s",flexShrink:0,
        }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.primaryDim;e.currentTarget.style.borderColor=C.borderGlow;}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor=C.border;}}>
          🔔
        </Link>
        {totalNotifs > 0 && (
          <motion.span animate={{scale:[1,1.2,1]}} transition={{duration:1.8,repeat:Infinity}}
            style={{position:"absolute",top:-4,right:-4,minWidth:18,height:18,borderRadius:7,background:C.danger,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:700,color:"#fff",padding:"0 4px",boxShadow:`0 2px 10px rgba(239,68,68,0.6)`}}>
            {totalNotifs>99?"99+":totalNotifs}
          </motion.span>
        )}
      </div>

      {/* ── Chat ── */}
      <div style={{position:"relative"}}>
        <Link to="/chat" style={{
          width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.04)",
          border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",
          textDecoration:"none",fontSize:17,transition:"all .2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.cyanDim;e.currentTarget.style.borderColor="rgba(0,212,255,0.3)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor=C.border;}}>
          💬
        </Link>
        {chatUnread > 0 && (
          <motion.span animate={{scale:[1,1.2,1]}} transition={{duration:2,repeat:Infinity}}
            style={{position:"absolute",top:-4,right:-4,minWidth:18,height:18,borderRadius:7,background:C.cyan,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:700,color:"#0b0b0f",padding:"0 4px",boxShadow:`0 2px 10px ${C.cyanGlow}`}}>
            {chatUnread>99?"99+":chatUnread}
          </motion.span>
        )}
      </div>

      {/* ── Avatar ── */}
      <Link to="/profile" style={{
        width:38,height:38,borderRadius:10,border:`1.5px solid rgba(124,58,237,0.35)`,
        display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",
        background:C.primaryDim,textDecoration:"none",flexShrink:0,
        boxShadow:`0 0 16px rgba(124,58,237,0.2)`,transition:"all .2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.7)";e.currentTarget.style.boxShadow=`0 0 24px rgba(124,58,237,0.4)`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.35)";e.currentTarget.style.boxShadow=`0 0 16px rgba(124,58,237,0.2)`;}}>
        {(equippedItems?.avatar?.image_url||profile?.avatar_url)
          ? <img src={equippedItems?.avatar?.image_url||profile?.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,fontSize:13,color:C.primary}}>{initials}</span>}
      </Link>

      <style>{`
        @media(max-width:1023px){ .cp-logo-top{display:none!important} .cp-search{display:none!important} .cp-wallet-btn{display:none!important} .cp-mobile-menu{display:flex!important} }
        @media(min-width:1024px){ .cp-mobile-menu{display:none!important} }
      `}</style>
    </header>
  );
}

// ═══════════════════════════ SIDEBAR ════════════════════════════════════════
function Sidebar({ profile, balance, equippedItems, chatUnread, unread, urgent, collapsed, setCollapsed, onLogout }) {
  const location = useLocation();
  const role       = profile?.role||"user";
  const roleConf   = ROLE_CFG[role]||ROLE_CFG.user;
  const isAdmin    = ["admin","super_admin"].includes(role);
  const isFounder  = ["founder","fondateur","super_admin"].includes(role);
  const initials   = profile?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
  const isVerified = profile?.verification_status==="approved";
  const adminLinks = NAV_ADMIN.filter(l=>l.roles.includes(role));

  const NavItem = ({ item }) => {
    const active = item.to==="/dashboard" ? location.pathname===item.to : location.pathname.startsWith(item.to);
    const badge  = item.chat ? chatUnread : item.support ? (unread+(isAdmin?urgent:0)) : 0;
    return (
      <NavLink to={item.to} title={collapsed?item.label:undefined}
        style={{
          display:"flex",alignItems:"center",
          gap:collapsed?0:10,justifyContent:collapsed?"center":"flex-start",
          padding:collapsed?"11px 0":"9px 12px",borderRadius:10,
          textDecoration:"none",position:"relative",transition:"all .2s",
          color:     active?"#fff":"rgba(255,255,255,0.38)",
          background:active?`linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.08))`:"transparent",
          border:    active?`1px solid rgba(124,58,237,0.28)`:"1px solid transparent",
          boxShadow: active?`0 4px 20px rgba(124,58,237,0.1),inset 0 1px 0 rgba(255,255,255,0.05)`:"none",
          fontSize:13,fontWeight:500,fontFamily:"'Space Grotesk',sans-serif",
        }}
        onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="rgba(255,255,255,0.75)";e.currentTarget.style.transform="translateX(4px)";e.currentTarget.style.border="1px solid rgba(124,58,237,0.12)";}}}
        onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.38)";e.currentTarget.style.transform="translateX(0)";e.currentTarget.style.border="1px solid transparent";}}}
      >
        {active && <div style={{position:"absolute",left:0,top:"15%",height:"70%",width:3,borderRadius:"0 3px 3px 0",background:`linear-gradient(180deg,${C.primary},${C.primary}44)`,boxShadow:`2px 0 10px ${C.primaryGlow}`}}/>}
        <span style={{fontSize:collapsed?17:14,flexShrink:0}}>{item.icon}</span>
        {!collapsed && <>
          <span style={{flex:1}}>{item.label}</span>
          {badge>0 && <span style={{minWidth:19,height:19,borderRadius:6,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",background:item.chat?C.cyan:C.danger,color:item.chat?"#0b0b0f":"#fff",fontFamily:"'JetBrains Mono',monospace",boxShadow:`0 2px 8px ${item.chat?C.cyanGlow:"rgba(239,68,68,0.5)"}`,flexShrink:0}}>
            {badge>99?"99+":badge}
          </span>}
        </>}
        {collapsed && badge>0 && <span style={{position:"absolute",top:5,right:5,width:7,height:7,borderRadius:"50%",background:item.chat?C.cyan:C.danger,boxShadow:`0 0 6px ${item.chat?C.cyan:C.danger}`}}/>}
      </NavLink>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

      {/* Logo */}
      <div style={{padding:collapsed?"16px 0":"18px 16px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between"}}>
        {collapsed ? (
          <button onClick={()=>setCollapsed(false)} style={{background:"none",border:"none",cursor:"pointer"}}>
            <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.primary},#4f46e5)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${C.primaryGlow}`}}>
              <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"#fff",letterSpacing:.5}}>CP</span>
            </div>
          </button>
        ) : (
          <>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.primary},#4f46e5)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${C.primaryGlow}`,flexShrink:0}}>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"#fff",letterSpacing:.5}}>CP</span>
              </div>
              <div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,lineHeight:1,color:"#fff"}}>
                  CIPHER<span style={{color:C.primary,textShadow:`0 0 18px ${C.primaryGlow}`}}>POOL</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                  <motion.div animate={{opacity:[1,.3,1]}} transition={{duration:2.5,repeat:Infinity}}
                    style={{width:5,height:5,borderRadius:"50%",background:C.secondary,boxShadow:`0 0 8px ${C.secondary}`}}/>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.textLow,letterSpacing:2}}>EN LIGNE</span>
                </div>
              </div>
            </div>
            <button onClick={()=>setCollapsed(true)}
              style={{width:24,height:24,borderRadius:7,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,cursor:"pointer",color:C.textMid,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.primaryDim;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color=C.textMid;}}>‹</button>
          </>
        )}
      </div>

      {/* Profile mini */}
      {!collapsed && (
        <div style={{padding:"13px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:40,height:40,borderRadius:11,background:C.primaryDim,border:`1.5px solid rgba(124,58,237,0.35)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:`0 0 16px rgba(124,58,237,0.15)`}}>
                {(equippedItems?.avatar?.image_url||profile?.avatar_url)
                  ? <img src={equippedItems?.avatar?.image_url||profile?.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,fontSize:14,color:C.primary}}>{initials}</span>}
              </div>
              <motion.div animate={{scale:[1,1.4,1],opacity:[1,.5,1]}} transition={{duration:2.5,repeat:Infinity}}
                style={{position:"absolute",bottom:-1,right:-1,width:9,height:9,borderRadius:"50%",background:C.secondary,border:`2px solid ${C.bg}`,boxShadow:`0 0 8px ${C.secondary}`}}/>
            </div>
            <div style={{minWidth:0}}>
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",margin:0}}>{profile?.full_name||"—"}</p>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:1.5,color:roleConf.color,textShadow:roleConf.glow}}>{roleConf.label}</span>
                {!isVerified && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.amber,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",padding:"2px 5px",borderRadius:5}}>ATTENTE</span>}
              </div>
            </div>
          </div>
          {/* Balance mini bar */}
          <div style={{padding:"8px 12px",borderRadius:9,background:`linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.06))`,border:`1px solid rgba(124,58,237,0.2)`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13}}>💎</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1.5,color:C.textLow}}>PIÈCES</span>
            </div>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:800,color:"#fff",textShadow:`0 0 16px rgba(124,58,237,0.4)`}}>{balance.toLocaleString("fr-FR")}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{flex:1,overflowY:"auto",padding:collapsed?"10px 5px":"10px 8px",display:"flex",flexDirection:"column",gap:1}}>
        {!collapsed && <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:3,color:C.textLow,padding:"2px 12px 7px",margin:0}}>NAVIGATION</p>}
        {NAV.map(item=><NavItem key={item.to} item={item}/>)}

        {adminLinks.length>0 && (<>
          <div style={{height:1,margin:"8px 4px",background:`linear-gradient(90deg,transparent,rgba(124,58,237,0.25),transparent)`}}/>
          {!collapsed && <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:3,color:C.textLow,padding:"2px 12px 7px",margin:0}}>GESTION</p>}
          {adminLinks.map(item=><NavItem key={item.to} item={item}/>)}
        </>)}

        {isFounder && (<>
          <div style={{height:1,margin:"8px 4px",background:`linear-gradient(90deg,transparent,rgba(124,58,237,0.15),transparent)`}}/>
          <NavLink to="/create-tournament"
            style={{display:"flex",alignItems:"center",gap:collapsed?0:10,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"11px 0":"9px 12px",borderRadius:10,textDecoration:"none",fontSize:13,color:`rgba(124,58,237,0.6)`,border:`1px dashed rgba(124,58,237,0.22)`,transition:"all .2s",fontFamily:"'Space Grotesk',sans-serif"}}
            onMouseEnter={e=>{e.currentTarget.style.color=C.primary;e.currentTarget.style.background=C.primaryDim;e.currentTarget.style.borderStyle="solid";e.currentTarget.style.boxShadow=`0 0 16px rgba(124,58,237,0.12)`;}}
            onMouseLeave={e=>{e.currentTarget.style.color="rgba(124,58,237,0.6)";e.currentTarget.style.background="transparent";e.currentTarget.style.borderStyle="dashed";e.currentTarget.style.boxShadow="none";}}>
            <span style={{fontSize:collapsed?17:14,flexShrink:0}}>➕</span>
            {!collapsed && <span>Créer un tournoi</span>}
          </NavLink>
        </>)}
      </nav>

      {/* Logout */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:collapsed?"10px 5px":"10px 8px",flexShrink:0}}>
        <button onClick={onLogout}
          style={{display:"flex",alignItems:"center",gap:collapsed?0:10,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"11px 0":"9px 12px",borderRadius:10,fontSize:13,color:"rgba(255,255,255,0.25)",background:"transparent",border:"1px solid transparent",width:"100%",cursor:"pointer",transition:"all .2s",fontFamily:"'Space Grotesk',sans-serif"}}
          onMouseEnter={e=>{e.currentTarget.style.color=C.danger;e.currentTarget.style.background="rgba(239,68,68,0.07)";e.currentTarget.style.borderColor="rgba(239,68,68,0.18)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.25)";e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
          <span style={{fontSize:collapsed?17:15,flexShrink:0}}>🚪</span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
        {!collapsed && <p style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(124,58,237,0.2)",letterSpacing:3,marginTop:9}}>v3.0 · CIPHERPOOL</p>}
      </div>

      <style>{`nav::-webkit-scrollbar{width:0}`}</style>
    </div>
  );
}

// ═══════════════════════════ BOTTOM NAV (Mobile) ═══════════════════════════
// 5 onglets fixés en bas sur mobile — remplace la sidebar
const BOTTOM_NAV = [
  { to:"/dashboard",   icon:"⚡", label:"Home"      },
  { to:"/tournaments", icon:"🏆", label:"Tournois"  },
  { to:"/chat",        icon:"💬", label:"Chat"      },
  { to:"/store",       icon:"🛍️", label:"Store"     },
  { to:"/profile",     icon:"👤", label:"Profil"    },
];

function BottomNav({ chatUnread }) {
  const location = useLocation();
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:50,
      background:"rgba(10,10,15,0.97)", backdropFilter:"blur(24px) saturate(1.5)",
      borderTop:"1px solid rgba(124,58,237,0.15)",
      display:"flex", alignItems:"stretch",
      boxShadow:"0 -8px 32px rgba(0,0,0,0.6)",
      paddingBottom:"env(safe-area-inset-bottom,0px)", // iPhone notch
    }}>
      {BOTTOM_NAV.map(item => {
        const active = location.pathname === item.to || location.pathname.startsWith(item.to+"/");
        const isChat = item.to === "/chat";
        return (
          <NavLink key={item.to} to={item.to}
            style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              padding:"10px 4px 8px", textDecoration:"none", position:"relative",
              background: active ? "rgba(139,61,255,0.08)" : "transparent",
              transition:"background .2s",
            }}
            onTouchStart={e => { if(!active) e.currentTarget.style.background="rgba(139,61,255,0.06)"; }}
            onTouchEnd={e => { if(!active) e.currentTarget.style.background="transparent"; }}>
            {/* Active glow top bar */}
            {active && (
              <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:"linear-gradient(90deg,transparent,#8b3dff,transparent)",borderRadius:"0 0 4px 4px"}}/>
            )}
            {/* Chat badge */}
            {isChat && chatUnread > 0 && (
              <div style={{position:"absolute",top:8,left:"55%",minWidth:15,height:15,borderRadius:99,background:"#ff4757",border:"2px solid rgba(10,10,15,0.97)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#fff",fontWeight:700,padding:"0 3px"}}>
                {chatUnread > 9 ? "9+" : chatUnread}
              </div>
            )}
            <span style={{fontSize:20, lineHeight:1, filter: active ? "drop-shadow(0 0 6px #8b3dff)" : "none", transition:"filter .2s"}}>{item.icon}</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:.5,marginTop:4,color:active?"#8b3dff":"rgba(255,255,255,0.28)",transition:"color .2s",fontWeight:active?700:400}}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

// ═══════════════════════════ MAIN LAYOUT ════════════════════════════════════
// ── NotifyInjector — accède au context notify et le passe à Outlet ──
function NotifyInjector({ profile, setProfile, balance, setBalance, equippedItems, refreshProfile }) {
  const notify = useNotify();
  return <Outlet context={{ profile, setProfile, balance, setBalance, equippedItems, refreshProfile, notify }}/>;
}

export default function MainLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [balance,       setBalance]       = useState(0);
  const [equippedItems, setEquippedItems] = useState({});
  const [unread,        setUnread]        = useState(0);
  const [urgent,        setUrgent]        = useState(0);
  const [chatUnread,    setChatUnread]    = useState(0);
  const [collapsed,     setCollapsed]     = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const pRef = useRef(null);

  useEffect(()=>{ loadProfile(); },[]);

  useEffect(()=>{
    if(!profile) return;
    pRef.current=profile;
    fetchBalance(); fetchEquipped(); fetchUnread(); fetchUrgent(); fetchChatUnread();
    const ch=supabase.channel("ml_v3")
      .on("postgres_changes",{event:"*",schema:"public",table:"wallets",filter:`user_id=eq.${profile.id}`},p=>{if(p.new?.balance!==undefined)setBalance(p.new.balance);})
      .on("postgres_changes",{event:"*",schema:"public",table:"user_items",filter:`user_id=eq.${profile.id}`},()=>fetchEquipped())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${profile.id}`},p=>{if(p.new)setProfile(p.new);})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"admin_messages"},fetchUnread)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"support_tickets"},()=>{if(["admin","super_admin"].includes(pRef.current?.role))fetchUrgent();})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},()=>{if(location.pathname!=="/chat")fetchChatUnread();})
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[profile?.id]);

  useEffect(()=>{
    if(location.pathname==="/chat"){localStorage.setItem("chat_last_seen",new Date().toISOString());setChatUnread(0);}
    setMobileOpen(false);
  },[location.pathname]);

  const fetchBalance   = async()=>{ try{ const{data}=await supabase.from("wallets").select("balance").eq("user_id",pRef.current?.id).maybeSingle(); setBalance(data?.balance??0); }catch(_){} };
  const fetchEquipped  = async()=>{ try{ const{data}=await supabase.from("user_items").select("item_id,equipped,store_items(id,name,type,rarity,image_url)").eq("user_id",pRef.current?.id).eq("equipped",true); if(data){ const m={}; data.forEach(u=>{if(u.store_items)m[u.store_items.type]=u.store_items;}); setEquippedItems(m); } }catch(_){} };
  const fetchUnread    = async()=>{ try{ const p=pRef.current; if(!p)return; const{count}=await supabase.from("admin_messages").select("*",{count:"exact",head:true}).or(`user_id.eq.${p.id},is_global.eq.true`).eq("read",false); setUnread(count||0); }catch(_){} };
  const fetchUrgent    = async()=>{ try{ const{count}=await supabase.from("support_tickets").select("*",{count:"exact",head:true}).in("priority",["urgent","critique"]).eq("status","open"); setUrgent(count||0); }catch(_){} };
  const fetchChatUnread= async()=>{ try{ const p=pRef.current; if(!p)return; const last=localStorage.getItem("chat_last_seen")||"2020-01-01"; const{count}=await supabase.from("chat_messages").select("*",{count:"exact",head:true}).gt("created_at",last).neq("sender_id",p.id); setChatUnread(count||0); }catch(_){} };
  const refreshProfile = async()=>{ const p=pRef.current; if(!p?.id)return; const{data}=await supabase.from("profiles").select("*").eq("id",p.id).single(); if(data)setProfile(data); await fetchBalance(); await fetchEquipped(); };
  const loadProfile    = async()=>{ const{data:{user}}=await supabase.auth.getUser(); if(!user){navigate("/login");return;} const{data,error}=await supabase.from("profiles").select("*").eq("id",user.id).single(); if(error){navigate("/login");return;} setProfile(data); setLoading(false); };
  const handleLogout   = async()=>{ await supabase.auth.signOut(); navigate("/login"); };

  if(loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <OrbCanvas/><GridBg/>
      <div style={{textAlign:"center",position:"relative",zIndex:2}}>
        <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
          style={{width:44,height:44,border:`2px solid rgba(124,58,237,0.2)`,borderTopColor:C.primary,borderRadius:"50%",margin:"0 auto 20px"}}/>
        <motion.p animate={{opacity:[.4,1,.4]}} transition={{duration:1.8,repeat:Infinity}}
          style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:5,color:C.primary}}>CHARGEMENT</motion.p>
      </div>
    </div>
  );

  const SIDEBAR_W = collapsed ? 64 : 224;

  return (
    <NotificationProvider profile={profile}>
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,display:"flex",flexDirection:"column",position:"relative"}}>
      <OrbCanvas/><GridBg/>

      {/* ══ TOPBAR ══ */}
      <div style={{position:"relative",zIndex:41}}>
        <Topbar
          profile={profile} balance={balance} equippedItems={equippedItems}
          chatUnread={chatUnread} unread={unread} urgent={urgent}
          onMenuClick={()=>setMobileOpen(o=>!o)}
        />
      </div>

      {/* ══ BODY: Sidebar + Content ══ */}
      <div style={{flex:1,display:"flex",position:"relative",zIndex:1,overflow:"hidden"}}>

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setMobileOpen(false)}
              style={{position:"fixed",inset:0,background:"rgba(11,11,15,0.85)",backdropFilter:"blur(10px)",zIndex:48}}/>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <motion.aside animate={{width:SIDEBAR_W}} transition={{duration:.25,ease:[.4,0,.2,1]}}
          style={{flexShrink:0,height:"calc(100vh - 64px)",position:"sticky",top:64,overflowY:"auto",overflowX:"hidden",
            background:"rgba(11,11,15,0.92)",backdropFilter:"blur(24px) saturate(1.6)",
            borderRight:`1px solid ${C.border}`,boxShadow:`2px 0 40px rgba(0,0,0,0.5),1px 0 0 rgba(124,58,237,0.06)`,zIndex:30}}
          className="cp-sidebar-desktop">
          <Sidebar
            profile={profile} balance={balance} equippedItems={equippedItems}
            chatUnread={chatUnread} unread={unread} urgent={urgent}
            collapsed={collapsed} setCollapsed={setCollapsed} onLogout={handleLogout}
          />
        </motion.aside>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside initial={{x:-224}} animate={{x:0}} exit={{x:-224}} transition={{type:"spring",stiffness:320,damping:32}}
              style={{position:"fixed",top:64,left:0,zIndex:49,width:224,height:"calc(100vh - 64px)",overflowY:"auto",
                background:"rgba(11,11,15,0.97)",backdropFilter:"blur(28px)",borderRight:`1px solid ${C.border}`}}>
              <Sidebar
                profile={profile} balance={balance} equippedItems={equippedItems}
                chatUnread={chatUnread} unread={unread} urgent={urgent}
                collapsed={false} setCollapsed={()=>{}} onLogout={handleLogout}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ══ MAIN CONTENT ══ */}
        <main style={{flex:1,overflowY:"auto",minWidth:0,paddingBottom:"var(--bottom-nav-h,0px)"}}>
          <NotifyInjector profile={profile} setProfile={setProfile} balance={balance} setBalance={setBalance} equippedItems={equippedItems} refreshProfile={refreshProfile}/>
        </main>
      </div>

      {/* ══ BOTTOM NAV — mobile only ══ */}
      <div className="cp-bottom-nav">
        <BottomNav chatUnread={chatUnread}/>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        /* ── Reset & Global ── */
        *, *::before, *::after { box-sizing:border-box; }
        html { -webkit-text-size-adjust:100%; }
        body { margin:0; overflow-x:hidden; background:#0a0a0f; }
        img  { max-width:100%; height:auto; }
        a    { -webkit-tap-highlight-color:transparent; }
        button { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.3);border-radius:4px;}

        /* ── Sidebar desktop ── */
        @media(max-width:1023px){ .cp-sidebar-desktop{display:none!important} }

        /* ── TopBar elements hide on mobile ── */
        @media(max-width:767px){
          .cp-logo-top{display:none!important}
          .cp-search{display:none!important}
          .cp-wallet-btn{display:none!important}
          .cp-mobile-menu{display:flex!important}
        }
        @media(min-width:1024px){ .cp-mobile-menu{display:none!important} }

        /* ── Bottom nav — visible only on mobile ── */
        .cp-bottom-nav { display:none; }
        @media(max-width:1023px){
          .cp-bottom-nav { display:block; }
          :root { --bottom-nav-h: 64px; }
        }
        @media(min-width:1024px){
          :root { --bottom-nav-h: 0px; }
        }

        /* ── Responsive text utilities ── */
        .cp-hide-mobile { display:block; }
        @media(max-width:767px){ .cp-hide-mobile { display:none!important; } }

        /* ── Touch-friendly min sizes ── */
        @media(max-width:767px){
          button, a[role="button"], .cp-btn { min-height:44px; }
          input, select, textarea { font-size:16px!important; } /* empêche zoom iOS */
        }
      `}</style>
    </div>
    </NotificationProvider>
  );
}