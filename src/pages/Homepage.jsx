// src/pages/HomePage.jsx — CipherPool eSports — Full Redesign
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════
   FONTS & GLOBAL STYLES
═══════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600&family=Share+Tech+Mono&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .cp-home {
    font-family: 'Barlow', sans-serif;
    background: #050508;
    color: #fff;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .cp-home a { text-decoration: none; color: inherit; }

  .cp-home::before {
    content: '';
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.04) 2px,
      rgba(0,0,0,0.04) 4px
    );
  }

  .noise {
    position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: .03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  .display { font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase; }
  .mono    { font-family: 'Share Tech Mono', monospace; }

  @keyframes glitch {
    0%,100% { clip-path: inset(0 0 100% 0); transform: translate(0); }
    10%      { clip-path: inset(10% 0 60% 0); transform: translate(-4px, 0); }
    20%      { clip-path: inset(50% 0 30% 0); transform: translate(4px, 0); }
    30%      { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 0); }
    40%      { clip-path: inset(90% 0 0% 0);  transform: translate(2px, 0); }
  }

  @keyframes glitch2 {
    0%,100% { clip-path: inset(100% 0 0 0); transform: translate(0); opacity: 0; }
    10%      { clip-path: inset(60% 0 15% 0); transform: translate(4px, 0); opacity: 1; }
    20%      { clip-path: inset(30% 0 50% 0); transform: translate(-4px, 0); opacity: 1; }
    40%      { opacity: 0; }
  }

  @keyframes pulse-red {
    0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
    50%      { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
  }

  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }

  @keyframes scan {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }

  @keyframes slideInLeft {
    from { transform: translateX(-60px); opacity: 0; }
    to   { transform: translateX(0);     opacity: 1; }
  }

  @keyframes fadeUp {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  @keyframes countUp {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes rotateSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .hex-bg {
    position: absolute; inset: 0; overflow: hidden; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 60% at 70% 40%, rgba(220,38,38,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 60% 80% at 20% 60%, rgba(139,92,246,0.06) 0%, transparent 70%);
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 10px;
    background: #dc2626;
    color: #fff; font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    padding: 14px 32px; border: none; cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%);
    transition: all .2s; position: relative; overflow: hidden;
  }
  .btn-primary::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%); transition: transform .4s;
  }
  .btn-primary:hover::after { transform: translateX(100%); }
  .btn-primary:hover { background: #ef4444; transform: translateY(-2px); }

  .btn-outline {
    display: inline-flex; align-items: center; gap: 10px;
    background: transparent;
    color: #fff; font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    padding: 13px 30px;
    border: 1.5px solid rgba(255,255,255,0.2);
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%);
    transition: all .2s;
  }
  .btn-outline:hover { border-color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); }

  .section-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; letter-spacing: 4px; color: #dc2626;
    text-transform: uppercase; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .section-label::before {
    content: ''; display: block; width: 24px; height: 2px; background: #dc2626;
  }

  .section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 900; text-transform: uppercase; line-height: 1;
    color: #fff;
  }
  .section-title span { color: #dc2626; }

  .cp-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    transition: border-color .25s, transform .25s, box-shadow .25s;
    cursor: pointer;
  }
  .cp-card:hover {
    border-color: rgba(220,38,38,0.4);
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(220,38,38,0.12);
  }

  .cp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(20px, 5vw, 80px);
    height: 64px;
    background: rgba(5,5,8,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background .3s;
  }

  .cp-nav-link {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: rgba(255,255,255,0.5); cursor: pointer; transition: color .2s;
    background: none; border: none; padding: 0;
  }
  .cp-nav-link:hover { color: #fff; }

  .stat-box {
    border-left: 2px solid #dc2626;
    padding: 4px 0 4px 16px;
    animation: countUp .6s ease both;
  }

  .cp-divider {
    width: 100%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    margin: 0;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #050508; }
  ::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 2px; }
`;

/* ═══════════════════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════════════════ */
function Topbar({ user, onlineCount }) {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Accueil", path: "/home" },
    { label: "Tournois", path: "/tournaments" },
    { label: "Équipes", path: "/teams" },
    { label: "Classement", path: "/leaderboard" },
    { label: "Boutique", path: "/store" },
    { label: "Actualités", path: "/news" },
  ];

  return (
    <nav
      className="cp-nav"
      style={{ background: scrolled ? "rgba(5,5,8,0.98)" : "rgba(5,5,8,0.7)" }}
    >
      <div
        onClick={() => nav("/home")}
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: "#dc2626",
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 900,
              fontSize: 14,
              color: "#fff",
            }}
          >
            CP
          </span>
        </div>
        <div>
          <p
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: 3,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            CIPHERP<span style={{ color: "#dc2626" }}>OO</span>L
          </p>
          <p
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 8,
              letterSpacing: 2,
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1,
            }}
          >
            ESPORT PLATFORM
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
        {links.map((l) => (
          <button key={l.label} className="cp-nav-link" onClick={() => nav(l.path)}>
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 10,
            letterSpacing: 1,
            color: "rgba(255,255,255,0.5)",
            padding: "6px 12px",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              animation: "blink 2s ease-in-out infinite",
            }}
          />
          <span style={{ color: "#22c55e", fontWeight: 700 }}>{onlineCount}</span>
          <span>EN LIGNE</span>
        </div>

        {user ? (
          <button
            className="btn-primary"
            style={{ padding: "10px 24px", fontSize: 12 }}
            onClick={() => nav("/dashboard")}
          >
            MON ESPACE
          </button>
        ) : (
          <>
            <button
              className="btn-outline"
              style={{ padding: "10px 20px", fontSize: 12 }}
              onClick={() => nav("/login")}
            >
              CONNEXION
            </button>
            <button
              className="btn-primary"
              style={{ padding: "10px 24px", fontSize: 12 }}
              onClick={() => nav("/register")}
            >
              S'INSCRIRE
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════ */
function Hero({ stats, user }) {
  const nav = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,38,38,${p.alpha})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(220,38,38,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        paddingTop: 64,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 100% 80% at 100% 50%, rgba(220,38,38,0.07) 0%, transparent 60%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      <div
        style={{
          position: "absolute",
          right: "-5%",
          top: "10%",
          width: "55%",
          height: "80%",
          background: "linear-gradient(135deg, rgba(220,38,38,0.04) 0%, transparent 60%)",
          borderLeft: "1px solid rgba(220,38,38,0.1)",
          transform: "skewX(-8deg)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: "5%",
          top: "50%",
          transform: "translateY(-50%)",
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: "clamp(100px,14vw,200px)",
          fontWeight: 900,
          lineHeight: 1,
          color: "rgba(255,255,255,0.02)",
          textTransform: "uppercase",
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: -4,
        }}
      >
        ESPORT
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 clamp(20px,5vw,80px)",
          maxWidth: 800,
          animation: "slideInLeft .8s ease both",
        }}
      >
        <div className="section-label" style={{ marginBottom: 20 }}>
          Platform eSport #1 Maroc
        </div>

        <div style={{ position: "relative", marginBottom: 8 }}>
          <h1
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: "clamp(56px,9vw,120px)",
              fontWeight: 900,
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: -2,
              color: "#fff",
            }}
          >
            DOMINE
            <br />
            <span
              style={{
                color: "#dc2626",
                WebkitTextStroke: "2px #dc2626",
                WebkitTextFillColor: "transparent",
              }}
            >
              L'ARÈNE
            </span>
          </h1>

          <h1
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: "clamp(56px,9vw,120px)",
              fontWeight: 900,
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: -2,
              color: "#00ffff",
              animation: "glitch 4s infinite",
              opacity: 0.4,
              pointerEvents: "none",
            }}
          >
            DOMINE
            <br />
            L'ARÈNE
          </h1>

          <h1
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: "clamp(56px,9vw,120px)",
              fontWeight: 900,
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: -2,
              color: "#ff0040",
              animation: "glitch2 4s infinite 1s",
              opacity: 0.3,
              pointerEvents: "none",
            }}
          >
            DOMINE
            <br />
            L'ARÈNE
          </h1>
        </div>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.5)",
            maxWidth: 440,
            marginBottom: 40,
            animation: "fadeUp .8s .3s ease both",
          }}
        >
          Rejoins la plateforme ultime pour les gamers. Tournois Free Fire, classements,
          équipes et cash prizes.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            animation: "fadeUp .8s .5s ease both",
            marginBottom: 60,
          }}
        >
          <button
            className="btn-primary"
            onClick={() => nav(user ? "/tournaments" : "/register")}
            style={{ fontSize: 14 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            EXPLORER LES TOURNOIS
          </button>

          <button
            className="btn-outline"
            onClick={() => nav(user ? "/dashboard" : "/register")}
            style={{ fontSize: 14 }}
          >
            {user ? "MON DASHBOARD →" : "CRÉER UN COMPTE →"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            flexWrap: "wrap",
            animation: "fadeUp .8s .7s ease both",
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {[
            { label: "JOUEURS", value: fmt(stats.players) },
            { label: "TOURNOIS", value: fmt(stats.tournaments) },
            { label: "PRIZE POOL", value: `${fmt(stats.prizePool)} CP` },
            { label: "ÉQUIPES", value: fmt(stats.teams) },
          ].map((s, i) => (
            <div key={s.label} className="stat-box" style={{ animationDelay: `${0.8 + i * 0.1}s` }}>
              <div
                style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: "clamp(28px,4vw,40px)",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#fff",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 4,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          animation: "fadeUp 1s 1.2s ease both",
        }}
      >
        <span
          style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 9,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          SCROLL
        </span>
        <div
          style={{
            width: 1,
            height: 40,
            background: "linear-gradient(#dc2626, transparent)",
            animation: "scan 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   LIVE STATS BAR
═══════════════════════════════════════════════════════ */
function LiveStats({ stats, onlineCount }) {
  const items = [
    {
      label: "EN LIGNE MAINTENANT",
      value: onlineCount,
      icon: "🟢",
      color: "#22c55e",
      live: true,
    },
    {
      label: "MEMBRES INSCRITS",
      value: stats.players,
      icon: "👥",
      color: "#fff",
    },
    {
      label: "TOURNOIS ORGANISÉS",
      value: stats.tournaments,
      icon: "🏆",
      color: "#fbbf24",
    },
    {
      label: "ÉQUIPES ACTIVES",
      value: stats.teams,
      icon: "⚔️",
      color: "#818cf8",
    },
  ];

  return (
    <section
      style={{
        padding: "48px clamp(20px,5vw,80px)",
        background: "rgba(255,255,255,0.01)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 1,
          background: "rgba(255,255,255,0.05)",
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.label}
            style={{
              padding: "32px 28px",
              background: "#050508",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              overflow: "hidden",
              animation: `fadeUp .5s ${i * 0.1}s ease both`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: item.color,
                opacity: 0.4,
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.live && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 8,
                    letterSpacing: 2,
                    color: "#22c55e",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    padding: "2px 8px",
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#22c55e",
                      animation: "blink 1s infinite",
                    }}
                  />
                  LIVE
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: "clamp(40px,5vw,64px)",
                fontWeight: 900,
                lineHeight: 1,
                color: item.color,
              }}
            >
              {fmt(item.value)}
            </div>

            <div
              style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 9,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   TOURNAMENTS SECTION
═══════════════════════════════════════════════════════ */
function TournamentCard({ t, user }) {
  const nav = useNavigate();
  const pct = t.max_players > 0 ? Math.round(((t.current_players ?? 0) / t.max_players) * 100) : 0;

  const statusMap = {
    open: { label: "INSCRIPTIONS", color: "#22c55e" },
    in_progress: { label: "EN COURS", color: "#dc2626" },
    closed: { label: "TERMINÉ", color: "#6b7280" },
  };

  const st = statusMap[t.status] || statusMap.open;

  return (
    <div
      className="cp-card"
      onClick={() => nav(user ? `/tournaments/${t.id}` : "/register")}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ height: 160, position: "relative", overflow: "hidden", background: "#0d0d12" }}>
        {t.banner_url ? (
          <img
            src={t.banner_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg,#1a0505,#050508)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 56, opacity: 0.1 }}>🎮</span>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(transparent 40%, rgba(5,5,8,0.9))",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(5,5,8,0.8)",
            backdropFilter: "blur(8px)",
            padding: "4px 10px",
            border: `1px solid ${st.color}30`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: st.color,
              display: "block",
              animation: t.status === "in_progress" ? "blink 1s infinite" : "none",
            }}
          />
          <span
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: st.color,
            }}
          >
            {st.label}
          </span>
        </div>

        {t.prize_coins > 0 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(220,38,38,0.85)",
              padding: "4px 10px",
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            {fmt(t.prize_coins)} CP
          </div>
        )}

        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
          <p
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 0.5,
              lineHeight: 1.1,
            }}
          >
            {t.name}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span
              style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: 1,
              }}
            >
              JOUEURS
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed',monospace",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {t.current_players ?? 0} / {t.max_players}
            </span>
          </div>
          <div style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: pct >= 80 ? "#dc2626" : "#22c55e",
                transition: "width .5s",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
          }}
        >
          {t.entry_fee > 0 ? (
            <span
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "#dc2626",
              }}
            >
              {t.entry_fee} CP{" "}
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>/ entrée</span>
            </span>
          ) : (
            <span
              style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 10,
                color: "#22c55e",
                letterSpacing: 1,
              }}
            >
              GRATUIT
            </span>
          )}

          <span
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: 1,
            }}
          >
            {"FREE FIRE"}
          </span>
        </div>
      </div>
    </div>
  );
}

function TournamentsSection({ tournaments, user }) {
  const nav = useNavigate();

  return (
    <section style={{ padding: "100px clamp(20px,5vw,80px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 48,
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <div className="section-label">Compétitions actives</div>
          <h2 className="section-title">
            TOURNOIS <span>EN VEDETTE</span>
          </h2>
        </div>
        <button className="btn-outline" onClick={() => nav(user ? "/tournaments" : "/register")}>
          VOIR TOUT →
        </button>
      </div>

      {tournaments.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 11,
              letterSpacing: 3,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            AUCUN TOURNOI ACTIF — REVENEZ BIENTÔT
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {tournaments.map((t) => (
            <TournamentCard key={t.id} t={t} user={user} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FEATURE STRIP
═══════════════════════════════════════════════════════ */
function FeatureStrip() {
  const items = [
    "TOURNOIS FREE FIRE",
    "CASH PRIZES",
    "CLASSEMENTS EN TEMPS RÉEL",
    "ÉQUIPES PROFESSIONNELLES",
    "SYSTÈME DE RANG",
    "BOUTIQUE D'ITEMS",
  ];

  return (
    <div
      style={{
        borderTop: "1px solid rgba(220,38,38,0.2)",
        borderBottom: "1px solid rgba(220,38,38,0.2)",
        background: "rgba(220,38,38,0.04)",
        padding: "14px 0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          animation: "marquee 20s linear infinite",
          whiteSpace: "nowrap",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              color: i % 2 === 0 ? "rgba(255,255,255,0.6)" : "rgba(220,38,38,0.8)",
              padding: "0 32px",
            }}
          >
            {i % 2 === 0 ? item : "✦"}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TEAMS SECTION
═══════════════════════════════════════════════════════ */
function TeamsSection({ teams }) {
  const nav = useNavigate();
  if (!teams.length) return null;

  return (
    <section
      style={{
        padding: "100px clamp(20px,5vw,80px)",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 48,
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <div className="section-label">Les meilleures</div>
          <h2 className="section-title">
            MEILLEURES <span>ÉQUIPES</span>
          </h2>
        </div>
        <button className="btn-outline" onClick={() => nav("/leaderboard")}>
          CLASSEMENT →
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {teams.slice(0, 6).map((team, i) => (
          <div
            key={team.id}
            className="cp-card"
            onClick={() => nav(`/teams/${team.id}`)}
            style={{ padding: "20px 16px" }}
          >
            <div
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2,
                color: i < 3 ? "#dc2626" : "rgba(255,255,255,0.2)",
                marginBottom: 12,
              }}
            >
              #{i + 1}
            </div>

            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#1a0505,#0d0d1a)",
                border: `2px solid ${i < 3 ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.08)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 20,
                    fontWeight: 900,
                    color: i < 3 ? "#dc2626" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {team.name?.[0]?.toUpperCase() ?? "T"}
                </span>
              )}
            </div>

            <p
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              {team.name}
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <span
                style={{
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: 1,
                }}
              >
                {team.wins ?? 0} WINS
              </span>
              {team.wins > 0 && (
                <span
                  style={{
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 9,
                    color: "rgba(220,38,38,0.7)",
                    letterSpacing: 1,
                  }}
                >
                  {team.wins}W
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   NEWS SECTION
═══════════════════════════════════════════════════════ */
function NewsSection({ news }) {
  const nav = useNavigate();
  if (!news.length) return null;

  const [main, ...rest] = news;

  return (
    <section style={{ padding: "100px clamp(20px,5vw,80px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 48,
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <div className="section-label">Infos & Updates</div>
          <h2 className="section-title">
            DERNIÈRES <span>ACTUALITÉS</span>
          </h2>
        </div>
        <button className="btn-outline" onClick={() => nav("/news")}>
          TOUTES LES NEWS →
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div
          className="cp-card"
          onClick={() => nav("/news")}
          style={{
            gridRow: rest.length > 0 ? "1 / 3" : "auto",
            overflow: "hidden",
          }}
        >
          <div style={{ height: 280, position: "relative", background: "#0d0d12", overflow: "hidden" }}>
            {main.cover_url ? (
              <img
                src={main.cover_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg,#1a0505,#050508)",
                }}
              />
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(transparent 30%, rgba(5,5,8,0.95))",
              }}
            />

            <div style={{ position: "absolute", top: 16, left: 16 }}>
              <span
                style={{
                  background: "#dc2626",
                  padding: "3px 10px",
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 2,
                }}
              >
                {(main.category ?? "GÉNÉRAL").toUpperCase()}
              </span>
            </div>

            <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
              <p
                style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                {main.title}
              </p>
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.5)" }}>
              {main.excerpt?.slice(0, 120)}...
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rest.slice(0, 3).map((n) => (
            <div
              key={n.id}
              className="cp-card"
              onClick={() => nav("/news")}
              style={{
                display: "flex",
                gap: 0,
                overflow: "hidden",
                height: 100,
              }}
            >
              <div style={{ width: 120, flexShrink: 0, background: "#0d0d12", overflow: "hidden" }}>
                {n.cover_url ? (
                  <img
                    src={n.cover_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg,#1a0505,#050508)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 24, opacity: 0.15 }}>📰</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 9,
                    color: "#dc2626",
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  {(n.category ?? "GÉNÉRAL").toUpperCase()}
                </span>
                <p
                  style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {n.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════════════ */
function HowItWorks({ user }) {
  const nav = useNavigate();

  const steps = [
    {
      n: "01",
      icon: "👤",
      title: "CRÉE TON COMPTE",
      desc: "Inscris-toi gratuitement et configure ton profil gamer en moins de 2 minutes.",
    },
    {
      n: "02",
      icon: "🎮",
      title: "REJOINS UN TOURNOI",
      desc: "Parcours les tournois disponibles et inscris-toi avec tes coins ou gratuitement.",
    },
    {
      n: "03",
      icon: "⚔️",
      title: "COMBATS ET GAGNE",
      desc: "Joue tes matchs, soumets tes résultats et grimpe dans le classement.",
    },
    {
      n: "04",
      icon: "🏆",
      title: "RÉCOLTE TES GAINS",
      desc: "Remporte des coins, des items exclusifs et la gloire dans la communauté.",
    },
  ];

  return (
    <section
      style={{
        padding: "100px clamp(20px,5vw,80px)",
        background: "rgba(220,38,38,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div className="section-label" style={{ justifyContent: "center" }}>
          Simple & rapide
        </div>
        <h2 className="section-title">
          COMMENT ÇA <span>MARCHE</span> ?
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 32,
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {steps.map((s) => (
          <div
            key={s.n}
            style={{
              position: "relative",
              padding: "28px 24px",
              borderLeft: "2px solid rgba(220,38,38,0.3)",
            }}
          >
            <div
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 1,
                color: "rgba(220,38,38,0.08)",
                position: "absolute",
                top: 12,
                right: 16,
                letterSpacing: -2,
              }}
            >
              {s.n}
            </div>

            <span style={{ fontSize: 32, display: "block", marginBottom: 16 }}>{s.icon}</span>
            <h3
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 1,
                marginBottom: 10,
                color: "#fff",
              }}
            >
              {s.title}
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 56 }}>
        <button
          className="btn-primary"
          onClick={() => nav(user ? "/dashboard" : "/register")}
          style={{ fontSize: 15 }}
        >
          {user ? "MON ESPACE →" : "REJOINDRE MAINTENANT — C'EST GRATUIT"}
        </button>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════ */
function Footer() {
  const nav = useNavigate();

  return (
    <footer
      style={{
        padding: "60px clamp(20px,5vw,80px) 32px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "#dc2626",
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                CP
              </span>
            </div>
            <span
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: 3,
              }}
            >
              CIPHERPOOL
            </span>
          </div>

          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              lineHeight: 1.7,
              maxWidth: 280,
            }}
          >
            La plateforme eSport dédiée aux gamers marocains. Tournois, classements et communauté.
          </p>
        </div>

        {[
          {
            title: "PLATEFORME",
            links: [
              ["Tournois", "/tournaments"],
              ["Classement", "/leaderboard"],
              ["Équipes", "/teams"],
              ["Boutique", "/store"],
            ],
          },
          {
            title: "COMPTE",
            links: [
              ["Connexion", "/login"],
              ["Inscription", "/register"],
              ["Mon Profil", "/profile"],
              ["Support", "/support"],
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <p
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.4)",
                marginBottom: 16,
              }}
            >
              {col.title}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col.links.map(([label, path]) => (
                <button
                  key={label}
                  onClick={() => nav(path)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "'Barlow',sans-serif",
                    transition: "color .2s",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#dc2626")}
                  onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.45)")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cp-divider" />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <p
          style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 10,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: 1,
          }}
        >
          © 2026 CIPHERPOOL — ALL RIGHTS RESERVED
        </p>
        <p
          style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 10,
            color: "rgba(220,38,38,0.5)",
            letterSpacing: 1,
          }}
        >
          BUILT FOR GAMERS ✦ POWERED BY PASSION
        </p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════
   HELPER
═══════════════════════════════════════════════════════ */
function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n ?? 0);
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function HomePage() {
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [news, setNews] = useState([]);
  const [stats, setStats] = useState({
    players: 0,
    tournaments: 0,
    prizePool: 0,
    teams: 0,
  });
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    let presenceCh;

    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      // Only create presence channel for authenticated users
      if (u) {
        presenceCh = supabase
          .channel("home-presence", {
            config: { presence: { key: u.id } },
          })
          .on("presence", { event: "sync" }, () => {
            const state = presenceCh.presenceState();
            setOnlineCount(Object.keys(state).length);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceCh.track({ user_id: u.id, at: Date.now() });
            }
          });
      }

      const { data: trn } = await supabase
        .from("tournaments")
        .select("id,name,status,max_players,current_players,banner_url,prize_coins,entry_fee")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(6);
      setTournaments(trn ?? []);

      const { data: tm } = await supabase
        .from("teams")
        .select("id,name,logo_url,wins,accent_color")
        .order("wins", { ascending: false })
        .limit(6);

      setTeams(tm ?? []);

      const { data: nw } = await supabase
        .from("news")
        .select("id,title,excerpt,cover_url,category,published_at,created_at")
        .order("created_at", { ascending: false })
        .limit(4);
      setNews(nw ?? []);

      const [profilesRes, tournamentsRes, teamsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("teams").select("*", { count: "exact", head: true }),
      ]);

      let totalPrize = 0;
      try {
        const { data: prizeData } = await supabase.from("tournaments").select("prize_coins");
        totalPrize = prizeData?.reduce((sum, t) => sum + (t.prize_coins ?? 0), 0) ?? 0;
      } catch (_) {}

      setStats({
        players: profilesRes.count ?? 0,
        tournaments: tournamentsRes.count ?? 0,
        prizePool: totalPrize,
        teams: teamsRes.count ?? 0,
      });
    })();

    return () => {
      if (presenceCh) {
        supabase.removeChannel(presenceCh);
      }
    };
  }, []);

  return (
    <div className="cp-home">
      <style>{GLOBAL_CSS}</style>
      <div className="noise" />

      <Topbar user={user} onlineCount={onlineCount} />

      <main style={{ position: "relative", zIndex: 1 }}>
        <Hero stats={stats} user={user} />
        <FeatureStrip />
        <LiveStats stats={stats} onlineCount={onlineCount} />
        <TournamentsSection tournaments={tournaments} user={user} />
        <TeamsSection teams={teams} />
        <NewsSection news={news} />
        <HowItWorks user={user} />
      </main>

      <Footer />
    </div>
  );
}