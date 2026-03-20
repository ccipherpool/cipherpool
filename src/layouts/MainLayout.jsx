import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationProvider, NotificationBellConnected, useNotify } from "../components/NotificationSystem";

const C = {
  bg:         "#0b0b0f",
  border:     "#1e1e2a",
  borderGlow: "rgba(124,58,237,0.25)",
  primary:    "#7c3aed",
  primaryDim: "rgba(124,58,237,0.12)",
  primaryGlow:"rgba(124,58,237,0.4)",
  cyan:       "#00d4ff",
  cyanDim:    "rgba(0,212,255,0.1)",
  cyanGlow:   "rgba(0,212,255,0.35)",
  danger:     "#ef4444",
  secondary:  "#22c55e",
  amber:      "#fbbf24",
  text:       "rgba(255,255,255,0.92)",
  textMid:    "rgba(255,255,255,0.5)",
  textLow:    "rgba(255,255,255,0.2)",
};

const ROLE_CFG = {
  super_admin:{ label:"SUPER ADMIN", color:C.cyan },
  admin:      { label:"ADMIN",       color:"#818cf8" },
  founder:    { label:"FONDATEUR",   color:C.primary },
  fondateur:  { label:"FONDATEUR",   color:C.primary },
  designer:   { label:"DESIGNER",    color:C.secondary },
  user:       { label:"MEMBRE",      color:C.textMid },
};

const NAV_LINKS = [
  { to:"/dashboard",   label:"ACCUEIL"    },
  { to:"/tournaments", label:"TOURNOIS"   },
  { to:"/teams",       label:"ÉQUIPES"    },
  { to:"/leaderboard", label:"CLASSEMENT" },
  { to:"/store",       label:"BOUTIQUE"   },
  { to:"/news",        label:"ACTUALITÉS" },
];

const BOTTOM_NAV = [
  { to:"/dashboard",   icon:"🏠", label:"Accueil"  },
  { to:"/tournaments", icon:"🏆", label:"Tournois" },
  { to:"/chat",        icon:"💬", label:"Chat"     },
  { to:"/store",       icon:"🛍️", label:"Store"    },
  { to:"/profile",     icon:"👤", label:"Profil"   },
];

// ═══════════════════════════ BG EFFECTS ════════════════════════════════════
function OrbCanvas() {
  const ref = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  useEffect(() => {
    if (isMobile) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const W = () => canvas.width, H = () => canvas.height;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const orbs = [
      {cx:.15,cy:.2, r:.36,vx:.00055,vy:.00042,rgb:[124,58,237],a:.07,p:0},
      {cx:.82,cy:.72,r:.28,vx:-.00048,vy:.00058,rgb:[0,212,255],a:.05,p:1.3},
      {cx:.55,cy:.5, r:.22,vx:.00040,vy:-.00050,rgb:[34,197,94],a:.032,p:2.6},
    ];
    const draw = () => {
      t++;
      ctx.clearRect(0,0,W(),H());
      orbs.forEach(o=>{
        o.cx+=o.vx*Math.sin(t*.006+o.p); o.cy+=o.vy*Math.cos(t*.004+o.p);
        if(o.cx<-.1||o.cx>1.1)o.vx*=-1; if(o.cy<-.1||o.cy>1.1)o.vy*=-1;
        const x=o.cx*W(),y=o.cy*H();
        const r=o.r*Math.max(W(),H());
        const a=o.a*(1+.12*Math.sin(t*.016+o.p));
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        const[R,G,B]=o.rgb;
        g.addColorStop(0,`rgba(${R},${G},${B},${a})`);
        g.addColorStop(1,`rgba(${R},${G},${B},0)`);
        ctx.fillStyle=g; ctx.fillRect(0,0,W(),H());
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  if (isMobile) return null;
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

const GridBg = () => (
  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
    backgroundImage:`linear-gradient(rgba(124,58,237,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.03) 1px,transparent 1px)`,
    backgroundSize:"48px 48px"}}/>
);

// ═══════════════════════════ TOPBAR ════════════════════════════════════════
function Topbar({ profile, balance, equippedItems, chatUnread, unread, urgent, onlineUsers=[], onMenuClick, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const role = profile?.role ?? "user";
  const isAdmin = ["admin","super_admin","founder","fondateur"].includes(role);
  const initials = profile?.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";

  return (
    <header style={{
      height:64, flexShrink:0, position:"sticky", top:0, zIndex:40,
      background:"rgba(11,11,15,0.92)",
      backdropFilter:"blur(24px) saturate(1.8)",
      borderBottom:`1px solid ${C.border}`,
      boxShadow:`0 1px 0 rgba(124,58,237,0.1), 0 4px 30px rgba(0,0,0,0.5)`,
      display:"flex", alignItems:"center", gap:0, padding:"0 24px",
    }}>

      {/* Mobile hamburger */}
      <button onClick={onMenuClick}
        className="cp-mobile-menu"
        style={{display:"none",width:38,height:38,borderRadius:10,background:C.primaryDim,
          border:`1px solid ${C.border}`,cursor:"pointer",alignItems:"center",justifyContent:"center",
          flexShrink:0,marginRight:12}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {[0,1,2].map(i=><span key={i} style={{display:"block",width:16,height:1.5,background:C.primary,borderRadius:2}}/>)}
        </div>
      </button>

      {/* LOGO */}
      <Link to="/dashboard" style={{textDecoration:"none",flexShrink:0,display:"flex",alignItems:"center",gap:10,marginRight:40}}>
        <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.primary},#4f46e5)`,
          display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${C.primaryGlow}`,flexShrink:0}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"#fff",letterSpacing:.5}}>CP</span>
        </div>
        <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:"#fff"}} className="cp-logo-text">
          CIPHER<span style={{color:C.primary,textShadow:`0 0 18px ${C.primaryGlow}`}}>POOL</span>
        </span>
      </Link>

      {/* NAV LINKS desktop */}
      <nav className="cp-topnav" style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
        {NAV_LINKS.map(l => {
          const active = l.to === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(l.to);
          return (
            <NavLink key={l.to} to={l.to} style={{
              textDecoration:"none",
              padding:"6px 14px",
              borderRadius:6,
              fontSize:12,
              fontWeight:700,
              letterSpacing:1.5,
              fontFamily:"'Space Grotesk',sans-serif",
              color: active ? "#fff" : "rgba(255,255,255,0.42)",
              background: active ? "rgba(124,58,237,0.15)" : "transparent",
              borderBottom: active ? `2px solid ${C.primary}` : "2px solid transparent",
              transition:"all .15s",
            }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.color="rgba(255,255,255,0.8)";e.currentTarget.style.background="rgba(255,255,255,0.04)";}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.color="rgba(255,255,255,0.42)";e.currentTarget.style.background="transparent";}}}
            >{l.label}</NavLink>
          );
        })}

        {/* Admin dropdown */}
        {isAdmin && (
          <div style={{position:"relative"}}>
            <button
              onClick={() => setMenuOpen(o=>!o)}
              style={{
                background: menuOpen ? "rgba(124,58,237,0.15)" : "transparent",
                border:"none",color:"rgba(255,255,255,0.42)",
                padding:"6px 14px",borderRadius:6,
                fontSize:12,fontWeight:700,letterSpacing:1.5,
                fontFamily:"'Space Grotesk',sans-serif",
                cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                transition:"all .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.8)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.42)"}
            >
              ADMIN <span style={{fontSize:8}}>▼</span>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  style={{
                    position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:99,
                    background:"rgba(14,14,20,0.97)",backdropFilter:"blur(20px)",
                    border:`1px solid ${C.border}`,borderRadius:10,
                    padding:"6px",minWidth:200,
                    boxShadow:"0 16px 40px rgba(0,0,0,0.6)",
                  }}
                >
                  {[
                    {to:"/admin",label:"Administration",roles:["admin","super_admin"]},
                    {to:"/admin/news",label:"Actualités Admin",roles:["admin","founder","fondateur","super_admin"]},
                    {to:"/admin/results",label:"Résultats",roles:["admin","founder","fondateur","super_admin"]},
                    {to:"/admin-store",label:"Boutique Admin",roles:["admin","super_admin"]},
                    {to:"/founder",label:"Panel Fondateur",roles:["founder","fondateur","super_admin"]},
                    {to:"/create-tournament",label:"Créer Tournoi",roles:["founder","fondateur","super_admin"]},
                    {to:"/super-admin",label:"Super Admin",roles:["super_admin"]},
                  ].filter(l=>l.roles.includes(role)).map(l=>(
                    <NavLink key={l.to} to={l.to}
                      onClick={()=>setMenuOpen(false)}
                      style={{
                        display:"block",padding:"9px 14px",borderRadius:7,
                        textDecoration:"none",fontSize:13,
                        color:"rgba(255,255,255,0.6)",
                        fontFamily:"'Space Grotesk',sans-serif",
                        transition:"all .15s",
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(124,58,237,0.12)";e.currentTarget.style.color="#fff"}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.6)"}}
                    >{l.label}</NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* RIGHT SIDE */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>

        {/* Search */}
        <div style={{position:"relative"}} className="cp-search">
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,opacity:.35}}>🔍</span>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              width:180,padding:"7px 12px 7px 30px",borderRadius:8,
              background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,
              color:C.text,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,
              outline:"none",boxSizing:"border-box",transition:"all .2s",
            }}
            onFocus={e=>{e.target.style.borderColor="rgba(124,58,237,0.4)";e.target.style.width="220px";}}
            onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.width="180px";}}
          />
        </div>

        {/* Wallet */}
        <Link to="/wallet" className="cp-wallet-btn" style={{
          display:"flex",alignItems:"center",gap:7,padding:"7px 13px",
          borderRadius:9,background:`linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.1))`,
          border:`1px solid rgba(124,58,237,0.3)`,textDecoration:"none",
          boxShadow:`0 2px 14px rgba(124,58,237,0.12)`,transition:"all .2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.6)";e.currentTarget.style.boxShadow=`0 4px 20px rgba(124,58,237,0.25)`;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.3)";e.currentTarget.style.boxShadow=`0 2px 14px rgba(124,58,237,0.12)`;}}>
          <span style={{fontSize:13}}>💎</span>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:"#fff"}}>
            {balance.toLocaleString("fr-FR")}
          </span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,.3)",letterSpacing:1}}>pts</span>
        </Link>

        {/* Support */}
        <Link to="/support" style={{
          width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.04)",
          border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",
          textDecoration:"none",fontSize:16,transition:"all .2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.primaryDim;}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>🎧</Link>

        {/* Notification Bell */}
        <NotificationBellConnected />

        {/* Chat */}
        <div style={{position:"relative"}}>
          <Link to="/chat" style={{
            width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.04)",
            border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",
            textDecoration:"none",fontSize:16,transition:"all .2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.cyanDim;}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>💬</Link>
          {chatUnread > 0 && (
            <span style={{position:"absolute",top:-4,right:-4,minWidth:17,height:17,borderRadius:6,
              background:C.cyan,display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:700,color:"#0b0b0f",padding:"0 3px"}}>
              {chatUnread>99?"99+":chatUnread}
            </span>
          )}
        </div>

        {/* Online indicator */}
        <div style={{position:"relative"}}>
          <button
            onClick={()=>setShowOnline(o=>!o)}
            style={{
              display:"flex",alignItems:"center",gap:6,
              height:36,padding:"0 12px",borderRadius:9,
              background: showOnline ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
              border:`1px solid ${showOnline ? "rgba(34,197,94,0.35)" : C.border}`,
              cursor:"pointer",transition:"all .2s",flexShrink:0,
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(34,197,94,0.1)";e.currentTarget.style.borderColor="rgba(34,197,94,0.3)";}}
            onMouseLeave={e=>{if(!showOnline){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor=C.border;}}}
          >
            <motion.span
              animate={{scale:[1,1.3,1],opacity:[1,.5,1]}}
              transition={{duration:2,repeat:Infinity}}
              style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"block",
                boxShadow:"0 0 6px rgba(34,197,94,0.8)"}}
            />
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,
              color:"rgba(34,197,94,0.9)",letterSpacing:.5}}>
              {onlineUsers.length}
            </span>
          </button>

          <AnimatePresence>
            {showOnline && (
              <motion.div
                initial={{opacity:0,y:-8,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:.96}}
                transition={{duration:.15}}
                style={{
                  position:"absolute",top:"calc(100% + 10px)",right:0,zIndex:200,
                  background:"rgba(11,11,18,0.98)",backdropFilter:"blur(24px)",
                  border:`1px solid ${C.border}`,borderRadius:12,
                  width:240,maxHeight:320,overflow:"hidden",
                  boxShadow:"0 20px 50px rgba(0,0,0,0.7)",
                }}
              >
                <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",gap:8}}>
                  <motion.span animate={{scale:[1,1.3,1]}} transition={{duration:2,repeat:Infinity}}
                    style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"block",boxShadow:"0 0 8px #22c55e"}}/>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,
                    color:"rgba(34,197,94,0.8)",fontWeight:700}}>
                    EN LIGNE — {onlineUsers.length}
                  </span>
                </div>
                <div style={{overflowY:"auto",maxHeight:252,padding:"6px"}}>
                  {onlineUsers.length === 0 ? (
                    <p style={{textAlign:"center",padding:"20px",color:C.textLow,
                      fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>Aucun membre</p>
                  ) : onlineUsers.map(u => {
                    const ini = u.full_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
                    const roleColors = {super_admin:C.cyan,admin:"#818cf8",founder:C.primary,fondateur:C.primary,user:C.textMid};
                    const rc = roleColors[u.role]||C.textMid;
                    return (
                      <button key={u.user_id||u.full_name}
                        onClick={()=>{navigate(`/profile?id=${u.user_id}`);setShowOnline(false);}}
                        style={{display:"flex",alignItems:"center",gap:10,width:"100%",
                          padding:"7px 8px",borderRadius:8,background:"transparent",
                          border:"none",cursor:"pointer",textAlign:"left",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        <div style={{position:"relative",flexShrink:0}}>
                          <div style={{width:30,height:30,borderRadius:8,overflow:"hidden",
                            background:`linear-gradient(135deg,${rc}40,${rc}20)`,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            border:`1px solid ${rc}30`,fontSize:11,fontWeight:800,
                            fontFamily:"'Space Grotesk',sans-serif",color:rc}}>
                            {u.avatar_url
                              ? <img src={u.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              : ini}
                          </div>
                          <span style={{position:"absolute",bottom:-1,right:-1,width:8,height:8,
                            borderRadius:"50%",background:"#22c55e",border:"2px solid #0b0b12",
                            boxShadow:"0 0 5px #22c55e"}}/>
                        </div>
                        <div style={{minWidth:0}}>
                          <p style={{margin:0,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,
                            fontWeight:600,color:"rgba(255,255,255,0.85)",
                            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {u.full_name||"—"}
                          </p>
                          <p style={{margin:0,fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                            letterSpacing:1,color:rc,fontWeight:700,textTransform:"uppercase"}}>
                            {u.role==="super_admin"?"SUPER ADMIN":u.role==="user"?"MEMBRE":(u.role||"MEMBRE").toUpperCase()}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div style={{position:"relative"}}>
          <button onClick={()=>navigate("/profile")}
            style={{
              width:36,height:36,borderRadius:9,border:`1.5px solid rgba(124,58,237,0.4)`,
              display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",
              background:C.primaryDim,cursor:"pointer",
              boxShadow:`0 0 14px rgba(124,58,237,0.2)`,transition:"all .2s",padding:0,
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.8)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,0.4)";}}>
            {(equippedItems?.avatar?.image_url||profile?.avatar_url)
              ? <img src={equippedItems?.avatar?.image_url||profile?.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,fontSize:12,color:C.primary}}>{initials}</span>}
          </button>
        </div>
      </div>

      <style>{`
        @media(max-width:1023px){
          .cp-topnav{display:none!important}
          .cp-search{display:none!important}
          .cp-wallet-btn{display:none!important}
          .cp-mobile-menu{display:flex!important}
          .cp-logo-text{display:none!important}
        }
        @media(min-width:1024px){ .cp-mobile-menu{display:none!important} }
      `}</style>
    </header>
  );
}

// ═══════════════════════════ MOBILE DRAWER ══════════════════════════════════
function MobileDrawer({ profile, onClose, onLogout }) {
  const location = useLocation();
  const role = profile?.role ?? "user";
  const isAdmin = ["admin","super_admin","founder","fondateur"].includes(role);
  const roleConf = ROLE_CFG[role] ?? ROLE_CFG.user;

  const allLinks = [
    ...NAV_LINKS,
    { to:"/profile",      label:"Mon Profil" },
    { to:"/wallet",       label:"Portefeuille" },
    { to:"/achievements", label:"Achievements" },
    { to:"/daily-rewards",label:"Daily Rewards" },
    { to:"/support",      label:"Assistance" },
    ...(isAdmin ? [
      { to:"/admin",            label:"Administration" },
      { to:"/admin/news",       label:"Actualités Admin" },
      { to:"/admin/results",    label:"Résultats" },
      { to:"/create-tournament",label:"Créer Tournoi" },
    ] : []),
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"rgba(11,11,15,0.98)",overflowY:"auto"}}>
      <div style={{padding:"20px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:44,height:44,borderRadius:12,background:C.primaryDim,
            border:`1.5px solid rgba(124,58,237,0.35)`,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,fontWeight:800,color:C.primary,fontFamily:"'Space Grotesk',sans-serif",overflow:"hidden"}}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : profile?.full_name?.slice(0,2).toUpperCase() ?? "?"}
          </div>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{profile?.full_name ?? profile?.username ?? "—"}</div>
            <div style={{color:roleConf.color,fontSize:10,fontWeight:700,letterSpacing:1.5}}>{roleConf.label}</div>
          </div>
        </div>
      </div>

      <nav style={{flex:1,padding:"10px 10px"}}>
        {allLinks.map(l => {
          const active = location.pathname === l.to || location.pathname.startsWith(l.to+"/");
          return (
            <NavLink key={l.to} to={l.to} onClick={onClose} style={{
              display:"block",padding:"11px 14px",borderRadius:9,marginBottom:2,
              textDecoration:"none",fontSize:14,fontWeight:500,
              fontFamily:"'Space Grotesk',sans-serif",
              color: active ? "#fff" : "rgba(255,255,255,0.5)",
              background: active ? "rgba(124,58,237,0.15)" : "transparent",
              borderLeft: active ? `3px solid ${C.primary}` : "3px solid transparent",
              transition:"all .15s",
            }}>
              {l.label}
            </NavLink>
          );
        })}
      </nav>

      <div style={{padding:"12px 10px",borderTop:`1px solid ${C.border}`}}>
        <button onClick={onLogout} style={{
          width:"100%",padding:"13px",
          background:"rgba(220,38,38,0.06)",border:"1px solid rgba(220,38,38,0.2)",
          color:"#dc2626",fontWeight:800,fontSize:13,cursor:"pointer",
          fontFamily:"'Barlow Condensed',sans-serif",
          letterSpacing:2,textTransform:"uppercase",
          transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(220,38,38,0.15)";e.currentTarget.style.borderColor="rgba(220,38,38,0.5)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(220,38,38,0.06)";e.currentTarget.style.borderColor="rgba(220,38,38,0.2)";}}>
          ⏻ DÉCONNEXION
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════ BOTTOM NAV ════════════════════════════════════
function BottomNav({ chatUnread }) {
  const location = useLocation();
  return (
    <div style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:50,
      background:"rgba(10,10,15,0.97)",backdropFilter:"blur(24px) saturate(1.5)",
      borderTop:"1px solid rgba(124,58,237,0.15)",
      display:"flex",alignItems:"stretch",
      boxShadow:"0 -8px 32px rgba(0,0,0,0.6)",
      paddingBottom:"env(safe-area-inset-bottom,0px)",
    }}>
      {BOTTOM_NAV.map(item => {
        const active = location.pathname === item.to || location.pathname.startsWith(item.to+"/");
        const isChat = item.to === "/chat";
        return (
          <NavLink key={item.to} to={item.to} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            padding:"10px 4px 8px",textDecoration:"none",position:"relative",
            background: active ? "rgba(124,58,237,0.08)" : "transparent",
            transition:"background .2s",
          }}>
            {active && <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,
              background:`linear-gradient(90deg,transparent,${C.primary},transparent)`,borderRadius:"0 0 4px 4px"}}/>}
            {isChat && chatUnread > 0 && (
              <div style={{position:"absolute",top:8,left:"55%",minWidth:15,height:15,borderRadius:99,
                background:"#ff4757",border:"2px solid rgba(10,10,15,0.97)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#fff",fontWeight:700,padding:"0 3px"}}>
                {chatUnread > 9 ? "9+" : chatUnread}
              </div>
            )}
            <span style={{fontSize:20,lineHeight:1,filter:active?`drop-shadow(0 0 6px ${C.primary})`:""}}>{item.icon}</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,letterSpacing:.5,marginTop:4,
              color:active?C.primary:"rgba(255,255,255,0.28)",transition:"color .2s",fontWeight:active?700:400}}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

// ═══════════════════════════ BACK BUTTON ═══════════════════════════════════
const ROOT_PAGES = ["/","home","/dashboard","/tournaments","/leaderboard",
  "/teams","/store","/news","/chat","/profile","/wallet",
  "/achievements","/daily-rewards","/stats","/support",
  "/admin","/founder","/super-admin"];

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = ROOT_PAGES.some(p => location.pathname === p);
  if (isRoot) return null;

  return (
    <div style={{padding:"16px clamp(14px,4vw,24px) 0",maxWidth:1200,width:"100%"}}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display:"inline-flex",alignItems:"center",gap:8,
          background:"rgba(124,58,237,0.08)",
          border:"1px solid rgba(124,58,237,0.2)",
          color:"rgba(255,255,255,0.55)",
          padding:"7px 16px",borderRadius:8,
          fontSize:13,fontWeight:600,cursor:"pointer",
          fontFamily:"'Space Grotesk',sans-serif",
          transition:"all .15s",letterSpacing:.3,
        }}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(124,58,237,0.18)";e.currentTarget.style.borderColor="rgba(124,58,237,0.5)";e.currentTarget.style.color="#fff";e.currentTarget.style.transform="translateX(-2px)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="rgba(124,58,237,0.08)";e.currentTarget.style.borderColor="rgba(124,58,237,0.2)";e.currentTarget.style.color="rgba(255,255,255,0.55)";e.currentTarget.style.transform="";}}
      >
        <span style={{fontSize:15}}>←</span>
        Retour
      </button>
    </div>
  );
}

// ═══════════════════════════ NEWS POPUP ════════════════════════════════════
function NewsPopup({ profile }) {
  const [article, setArticle] = useState(null);

  const checkNews = useCallback(async () => {
    try {
      const { data: latest } = await supabase.from("news")
        .select("id,title,excerpt,cover_url,category,published_at")
        .order("published_at",{ ascending:false })
        .limit(1).maybeSingle();
      if (!latest) return;
      const seen = JSON.parse(localStorage.getItem("cp_seen_news") || "[]");
      if (!seen.includes(latest.id)) setArticle(latest);
    } catch (error) {
      console.error("checkNews failed", error);
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    checkNews();
    const ch = supabase.channel("news_popup")
      .on("postgres_changes",{ event:"INSERT", schema:"public", table:"news" },()=>checkNews())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile?.id, checkNews]);

  const dismiss = () => {
    if (!article) return;
    const seen = JSON.parse(localStorage.getItem("cp_seen_news") || "[]");
    if (!seen.includes(article.id)) seen.push(article.id);
    localStorage.setItem("cp_seen_news", JSON.stringify(seen));
    setArticle(null);
  };

  if (!article) return null;

  const CAT_COLORS = { general:"#818cf8", tournament:"#fbbf24", update:"#00d4ff", player:"#10b981", team:"#a78bfa" };
  const catColor = CAT_COLORS[article.category] || "#818cf8";

  return (
    <AnimatePresence>
      <motion.div key="news-overlay"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(12px)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <motion.div
          initial={{scale:0.85,opacity:0,y:30}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.85,opacity:0}}
          transition={{type:"spring",stiffness:280,damping:26}}
          style={{background:"linear-gradient(135deg,#0d0d1a,#0a0a14)",border:`1px solid ${catColor}40`,
            borderRadius:20,width:"100%",maxWidth:520,overflow:"hidden",
            boxShadow:`0 0 60px ${catColor}20,0 30px 80px rgba(0,0,0,0.8)`}}>
          {article.cover_url && (
            <div style={{position:"relative",height:180,overflow:"hidden"}}>
              <img src={article.cover_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#0d0d1a)"}}/>
            </div>
          )}
          <div style={{padding:article.cover_url?"0 24px":"24px 24px 0"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:`${catColor}20`,
              border:`1px solid ${catColor}50`,borderRadius:20,padding:"4px 12px",marginBottom:12}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:catColor,display:"block",boxShadow:`0 0 8px ${catColor}`}}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,color:catColor,fontWeight:700,textTransform:"uppercase"}}>📢 NOUVELLE ANNONCE</span>
            </div>
            <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:2,color:"#fff",margin:"0 0 10px",lineHeight:1.2}}>{article.title}</h2>
            {article.excerpt && (
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.6,margin:"0 0 24px"}}>{article.excerpt}</p>
            )}
          </div>
          <div style={{padding:"0 24px 24px"}}>
            <button onClick={dismiss} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${catColor}cc,${catColor}88)`,border:"none",borderRadius:12,fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:3,color:"#fff",cursor:"pointer",boxShadow:`0 8px 24px ${catColor}40`,transition:"all .2s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              ✓ J'AI LU — OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════ KYC BANNER ════════════════════════════════════
function KYCBanner({ profile }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const needsKYC = profile && (
    profile.verification_status === "pending" ||
    profile.verification_status === null ||
    profile.verification_status === undefined
  ) && !["admin","super_admin","founder","fondateur","designer"].includes(profile.role);

  if (!needsKYC || dismissed) return null;

  return (
    <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}}
      style={{position:"relative",zIndex:39,background:"linear-gradient(90deg,rgba(251,191,36,0.12),rgba(239,68,68,0.08))",
        borderBottom:"1px solid rgba(251,191,36,0.3)",padding:"12px 24px",
        display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <span style={{fontSize:20}}>⚠️</span>
      <div style={{flex:1,minWidth:200}}>
        <p style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:"#fbbf24",margin:0}}>
          Vérification d'identité requise
        </p>
        <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"rgba(255,255,255,0.55)",margin:"2px 0 0"}}>
          Votre compte est en attente de validation. Certaines actions sont temporairement désactivées.
        </p>
      </div>
      <div style={{display:"flex",gap:8,flexShrink:0}}>
        <button onClick={()=>navigate("/profile")}
          style={{padding:"7px 16px",borderRadius:8,background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.5)",
            color:"#fbbf24",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(251,191,36,0.35)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(251,191,36,0.2)"}>
          📎 Mon profil
        </button>
        <button onClick={()=>setDismissed(true)}
          style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
            color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ×
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════ NOTIFY INJECTOR ═══════════════════════════════
function NotifyInjector({ profile, setProfile, balance, setBalance, equippedItems, refreshProfile }) {
  const notify = useNotify();
  return <Outlet context={{ profile, setProfile, balance, setBalance, equippedItems, refreshProfile, notify }}/>;
}

// ═══════════════════════════ MAIN LAYOUT ═══════════════════════════════════
export default function MainLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [balance,       setBalance]       = useState(0);
  const [equippedItems, setEquippedItems] = useState({});
  const [unread,        setUnread]        = useState(0);
  const [urgent,        setUrgent]        = useState(0);
  const [chatUnread,    setChatUnread]    = useState(0);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [onlineUsers,   setOnlineUsers]   = useState([]);
  const pRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (!profile) return;
    pRef.current = profile;
    fetchBalance(); fetchEquipped(); fetchUnread(); fetchUrgent(); fetchChatUnread();

    const ch = supabase.channel("ml_v4")
      .on("postgres_changes",{event:"*",schema:"public",table:"wallets",filter:`user_id=eq.${profile.id}`},p=>{if(p.new?.balance!==undefined)setBalance(p.new.balance);})
      .on("postgres_changes",{event:"*",schema:"public",table:"user_items",filter:`user_id=eq.${profile.id}`},()=>fetchEquipped())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${profile.id}`},p=>{if(p.new)setProfile(p.new);})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"admin_messages"},fetchUnread)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},()=>{if(location.pathname!=="/chat")fetchChatUnread();})
      .subscribe();

    const presenceCh = supabase.channel("global-presence", {
      config: { presence: { key: profile.id } }
    });
    presenceCh
      .on("presence",{ event:"sync" },() => {
        const state = presenceCh.presenceState();
        const users = Object.values(state).map(arr=>arr[0]).filter(Boolean);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceCh.track({
            user_id:    profile.id,
            full_name:  profile.full_name,
            avatar_url: profile.avatar_url || null,
            role:       profile.role || "user",
            online_at:  new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(presenceCh);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (location.pathname === "/chat") {
      localStorage.setItem("chat_last_seen", new Date().toISOString());
      setChatUnread(0);
    }
    setMobileOpen(false);
  }, [location.pathname]);

  const fetchBalance    = async () => { try { const{data}=await supabase.from("wallets").select("balance").eq("user_id",pRef.current?.id).maybeSingle(); setBalance(data?.balance??0); } catch(_) {} };
  const fetchEquipped   = async () => { try { const{data}=await supabase.from("user_items").select("item_id,equipped,store_items(id,name,type,rarity,image_url)").eq("user_id",pRef.current?.id).eq("equipped",true); if(data){const m={};data.forEach(u=>{if(u.store_items)m[u.store_items.type]=u.store_items;});setEquippedItems(m);} } catch(_) {} };
  const fetchUnread     = async () => { try { const p=pRef.current; if(!p)return; const{count}=await supabase.from("admin_messages").select("*",{count:"exact",head:true}).or(`user_id.eq.${p.id},is_global.eq.true`).eq("read",false); setUnread(count||0); } catch(_) {} };
  const fetchUrgent     = async () => { try { const{count}=await supabase.from("support_tickets").select("*",{count:"exact",head:true}).in("priority",["urgent","critique"]).eq("status","open"); setUrgent(count||0); } catch(_) {} };
  const fetchChatUnread = async () => { try { const p=pRef.current; if(!p)return; const last=localStorage.getItem("chat_last_seen")||"2020-01-01"; const{count}=await supabase.from("chat_messages").select("*",{count:"exact",head:true}).gt("created_at",last).neq("sender_id",p.id); setChatUnread(count||0); } catch(_) {} };
  const refreshProfile  = async () => { const p=pRef.current; if(!p?.id)return; const{data}=await supabase.from("profiles").select("*").eq("id",p.id).maybeSingle(); if(data)setProfile(data); await fetchBalance(); await fetchEquipped(); };

  // ✅ FIX: maybeSingle() + signOut si profile manquant → stop infinite loop
  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(); // ← était .single() → causait 406 → loop infini

    if (error || !data) {
      // Profile manquant ou RLS block → déconnecter proprement
      await supabase.auth.signOut();
      navigate("/");
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  // ✅ FIX: navigate("/") au lieu de navigate("/home")
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <OrbCanvas/><GridBg/>
      <div style={{textAlign:"center",position:"relative",zIndex:2}}>
        <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
          style={{width:44,height:44,border:`2px solid rgba(124,58,237,0.2)`,borderTopColor:C.primary,borderRadius:"50%",margin:"0 auto 20px"}}/>
        <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:5,color:C.primary}}>CHARGEMENT</p>
      </div>
    </div>
  );

  return (
    <NotificationProvider profile={profile}>
      <div style={{minHeight:"100vh",background:C.bg,color:C.text,display:"flex",flexDirection:"column",position:"relative"}}>
        <OrbCanvas/><GridBg/>

        <div style={{position:"relative",zIndex:41}}>
          <Topbar
            profile={profile} balance={balance} equippedItems={equippedItems}
            chatUnread={chatUnread} unread={unread} urgent={urgent}
            onlineUsers={onlineUsers}
            onMenuClick={()=>setMobileOpen(o=>!o)}
            onLogout={handleLogout}
          />
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={()=>setMobileOpen(false)}
                style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:48}}/>
              <motion.div initial={{x:-280}} animate={{x:0}} exit={{x:-280}}
                transition={{type:"spring",stiffness:320,damping:32}}
                style={{position:"fixed",top:0,left:0,zIndex:49,width:280,height:"100vh",overflowY:"auto",
                  background:"rgba(11,11,15,0.98)",backdropFilter:"blur(28px)",
                  borderRight:`1px solid ${C.border}`}}>
                <MobileDrawer profile={profile} onClose={()=>setMobileOpen(false)} onLogout={handleLogout}/>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <KYCBanner profile={profile} />
        <NewsPopup profile={profile} />

        <main style={{flex:1,overflowY:"auto",minWidth:0,position:"relative",zIndex:1,width:"100%",
          paddingBottom:"var(--bottom-nav-h,0px)"}}>
          <BackButton/>
          <NotifyInjector profile={profile} setProfile={setProfile} balance={balance}
            setBalance={setBalance} equippedItems={equippedItems} refreshProfile={refreshProfile}/>
        </main>

        <div className="cp-bottom-nav">
          <BottomNav chatUnread={chatUnread}/>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          html{-webkit-text-size-adjust:100%;}
          body{margin:0;overflow-x:hidden;background:#0a0a0f;}
          img{max-width:100%;height:auto;}
          button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
          ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.3);border-radius:4px;}
          .cp-bottom-nav{display:none;}
          main > *{max-width:100%;}
          @media(max-width:767px){ main{padding-left:0;padding-right:0;} }
          @media(max-width:1023px){
            .cp-bottom-nav{display:block;}
            :root{--bottom-nav-h:64px;}
          }
          @media(min-width:1024px){
            :root{--bottom-nav-h:0px;}
          }
        `}</style>
      </div>
    </NotificationProvider>
  );
}