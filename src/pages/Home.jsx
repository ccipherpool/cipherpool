import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    players: 0,
    tournaments: 0,
    online: 0,
    teams: 0,
  });
  const [activeTournaments, setActiveTournaments] = useState([]);
  const presenceRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    fetchStats();
    setupPresence();

    const cleanup = initParticles();

    return () => {
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
      if (cleanup) cleanup();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const online15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const [t, teams, profiles, online] = await Promise.allSettled([
        supabase
          .from("tournaments")
          .select("id,name,status,game_type,max_players", { count: "exact" })
          .limit(5),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("last_seen", online15),
      ]);

      if (t.status === "fulfilled" && t.value.data) {
        setStats((prev) => ({
          ...prev,
          tournaments: t.value.count || t.value.data.length,
        }));

        setActiveTournaments(
          t.value.data
            .filter((x) => ["open", "in_progress", "locked"].includes(x.status))
            .slice(0, 3)
        );
      }

      if (teams.status === "fulfilled") {
        setStats((prev) => ({ ...prev, teams: teams.value.count || 0 }));
      }

      if (profiles.status === "fulfilled") {
        setStats((prev) => ({ ...prev, players: profiles.value.count || 0 }));
      }

      if (online.status === "fulfilled") {
        setStats((prev) => ({ ...prev, online: online.value.count || 0 }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setupPresence = () => {
    presenceRef.current = supabase.channel("site_online", {
      config: { presence: { key: "u" + Math.random().toString(36).slice(2) } },
    });

    presenceRef.current
      .on("presence", { event: "sync" }, () => {
        const count = Object.keys(presenceRef.current.presenceState()).length;
        setStats((prev) => ({ ...prev, online: count }));
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          await presenceRef.current.track({ at: Date.now() });
        }
      });
  };

  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.4,
      a: Math.random() * 0.35 + 0.08,
    }));

    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,85,247,${p.a})`;
        ctx.fill();
      });

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(168,85,247,${0.07 * (1 - d / 110)})`;
            ctx.lineWidth = 0.5;
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
  };

  const goTo = (path) => {
    if (currentUser) {
      navigate(path === "/register" ? "/dashboard" : path);
    } else {
      navigate(path);
    }
  };

  const statusInfo = (s) =>
    ({
      open: { l: "OUVERT", c: "#22c55e" },
      in_progress: { l: "EN COURS", c: "#f59e0b" },
      locked: { l: "COMPLET", c: "#ef4444" },
    }[s] || { l: s?.toUpperCase(), c: "#64748b" });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030308",
        color: "#fff",
        fontFamily: "'Inter','Segoe UI',sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* NAV */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 clamp(14px,4vw,48px)",
          height: 60,
          borderBottom: "1px solid rgba(168,85,247,0.1)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(3,3,8,0.88)",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "clamp(18px,5vw,22px)", fontWeight: 900 }}>
            <span
              style={{
                background: "linear-gradient(to right,#a855f7,#06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Cipher
            </span>
            <span style={{ color: "#fff" }}>Pool</span>
          </span>

          <span
            style={{
              padding: "2px 8px",
              background: "rgba(168,85,247,0.15)",
              color: "#a78bfa",
              fontSize: 10,
              borderRadius: 20,
              border: "1px solid rgba(168,85,247,0.3)",
              fontWeight: 700,
            }}
          >
            BETA
          </span>
        </Link>

        <div style={{ display: "flex", gap: 10 }}>
          {currentUser ? (
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "8px clamp(10px,3vw,22px)",
                background: "linear-gradient(to right,#7c3aed,#0891b2)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                fontSize: "clamp(11px,3vw,14px)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Mon Espace →
            </button>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  padding: "8px clamp(8px,3vw,20px)",
                  color: "#94a3b8",
                  textDecoration: "none",
                  border: "1px solid rgba(168,85,247,0.25)",
                  borderRadius: 10,
                  fontSize: "clamp(11px,3vw,14px)",
                  fontWeight: 500,
                  transition: "all .2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#fff";
                  e.target.style.borderColor = "#7c3aed";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#94a3b8";
                  e.target.style.borderColor = "rgba(168,85,247,0.25)";
                }}
              >
                Connexion
              </Link>

              <Link
                to="/register"
                style={{
                  padding: "8px clamp(10px,3vw,22px)",
                  background: "linear-gradient(to right,#7c3aed,#0891b2)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "clamp(11px,3vw,14px)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          position: "relative",
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: "40px 0",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        />

        <div
          style={{
            position: "absolute",
            top: "12%",
            left: "8%",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle,rgba(124,58,237,0.16),transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "5%",
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle,rgba(6,182,212,0.12),transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            maxWidth: 980,
            padding: "0 clamp(14px,4vw,24px)",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 24,
              padding: "7px 18px",
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(168,85,247,0.22)",
              borderRadius: 40,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                background: "#22c55e",
                borderRadius: "50%",
                boxShadow: "0 0 7px #22c55e",
                display: "inline-block",
                animation: "blink 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>
              {stats.online > 0
                ? `${stats.online} joueurs en ligne`
                : "Plateforme eSports Free Fire"}
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(42px,8vw,86px)",
              fontWeight: 900,
              margin: "0 0 10px",
              lineHeight: 1,
              letterSpacing: "-2px",
            }}
          >
            <span
              style={{
                background: "linear-gradient(135deg,#c084fc,#e879f9,#38bdf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              CipherPool
            </span>
          </h1>

          <p
            style={{
              fontSize: 12,
              color: "#475569",
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            ESPORTS · FREE FIRE · MAROC
          </p>

          <p
            style={{
              fontSize: "clamp(16px,2vw,20px)",
              color: "#cbd5e1",
              margin: "0 auto 18px",
              lineHeight: 1.8,
              maxWidth: 720,
            }}
          >
            CipherPool هي منصة eSports مخصصة للاعبي
            <strong style={{ color: "#a78bfa" }}> Free Fire </strong>
            في المغرب.
          </p>

          <p
            style={{
              fontSize: "clamp(14px,1.7vw,17px)",
              color: "#94a3b8",
              margin: "0 auto 44px",
              lineHeight: 1.9,
              maxWidth: 760,
            }}
          >
            هنا تقدر تصاوب حساب، تدخل البطولات، تتابع الإحصائيات ديالك،
            تجمع النقاط، وتبني الاسم ديالك داخل community gaming بشكل سهل
            وواضح.
          </p>

          {/* STATS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "clamp(6px,2vw,12px)",
              maxWidth: 760,
              margin: "0 auto 44px",
            }}
          >
            {[
              { v: stats.players, l: "Joueurs", ic: "👤", c: "#a855f7" },
              { v: stats.tournaments, l: "Tournois", ic: "🏆", c: "#06b6d4" },
              { v: stats.online, l: "En ligne", ic: "🟢", c: "#22c55e", live: true },
              { v: stats.teams, l: "Équipes", ic: "🛡️", c: "#f59e0b" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${s.c}22`,
                  borderRadius: 16,
                  padding: "16px 8px",
                  position: "relative",
                  backdropFilter: "blur(8px)",
                  transition: "transform .2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {s.live && (
                  <span
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 7,
                      width: 7,
                      height: 7,
                      background: "#22c55e",
                      borderRadius: "50%",
                      boxShadow: "0 0 6px #22c55e",
                      animation: "blink 1.5s infinite",
                    }}
                  />
                )}
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.ic}</div>
                <div
                  style={{
                    fontSize: "clamp(20px,3vw,28px)",
                    fontWeight: 900,
                    color: s.c,
                  }}
                >
                  {s.v.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            className="home-hero-btns"
          >
            <button
              onClick={() => goTo("/register")}
              style={{
                flex: "1 1 auto",
                maxWidth: 280,
                minWidth: 140,
                padding: "clamp(12px,3vw,15px) clamp(20px,5vw,44px)",
                background: "linear-gradient(135deg,#7c3aed,#0891b2)",
                border: "none",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: "clamp(13px,3vw,16px)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 0 40px rgba(124,58,237,0.4)",
                transition: "all .25s",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 0 60px rgba(124,58,237,0.6)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 0 40px rgba(124,58,237,0.4)";
              }}
            >
              🚀 {currentUser ? "Entrer dans mon espace" : "Créer un compte"}
            </button>

            {!currentUser && (
              <button
                onClick={() => navigate("/login")}
                style={{
                  flex: "1 1 auto",
                  maxWidth: 220,
                  minWidth: 120,
                  padding: "clamp(12px,3vw,15px) clamp(16px,4vw,36px)",
                  background: "transparent",
                  border: "1px solid rgba(168,85,247,0.38)",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: "clamp(13px,3vw,16px)",
                  color: "#c4b5fd",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  transition: "all .25s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(124,58,237,0.1)";
                  e.target.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.transform = "scale(1)";
                }}
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </section>

      {/* BAR */}
      <div
        style={{
          padding: "12px clamp(12px,4vw,48px)",
          background: "rgba(124,58,237,0.06)",
          borderTop: "1px solid rgba(168,85,247,0.1)",
          borderBottom: "1px solid rgba(168,85,247,0.1)",
          display: "flex",
          gap: "clamp(8px,3vw,36px)",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
        className="feature-bar"
      >
        {[
          "⚡ Interface simple",
          "🔒 Vérification sécurisée",
          "💰 Système de points",
          "📊 Statistiques joueur",
          "🎮 Compétition Free Fire",
          "🏅 Progression gaming",
        ].map((f, i) => (
          <span
            key={i}
            style={{
              color: "#64748b",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* ACTIVE TOURNAMENTS */}
      {activeTournaments.length > 0 && (
        <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,5vw,48px)", background: "#030308" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(26px,4vw,40px)",
                  fontWeight: 800,
                  marginBottom: 10,
                  background: "linear-gradient(135deg,#a855f7,#06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                🏆 Tournois actifs
              </h2>
              <p style={{ color: "#475569", fontSize: 14 }}>
                بعض البطولات المتاحة حالياً على المنصة
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 20,
              }}
            >
              {activeTournaments.map((t) => {
                const si = statusInfo(t.status);

                return (
                  <div
                    key={t.id}
                    onClick={() =>
                      currentUser
                        ? navigate(`/tournaments/${t.id}`)
                        : navigate("/register")
                    }
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(168,85,247,0.14)",
                      borderRadius: 20,
                      padding: 24,
                      cursor: "pointer",
                      transition: "all .25s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border =
                        "1px solid rgba(168,85,247,0.42)";
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.background =
                        "rgba(124,58,237,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border =
                        "1px solid rgba(168,85,247,0.14)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.02)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: si.c,
                          background: `${si.c}18`,
                          padding: "4px 10px",
                          borderRadius: 20,
                        }}
                      >
                        {si.l}
                      </span>
                      <span style={{ fontSize: 11, color: "#475569" }}>
                        {t.game_type || "Free Fire"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#f1f5f9",
                        marginBottom: 8,
                      }}
                    >
                      {t.name}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        marginBottom: 16,
                      }}
                    >
                      👥 Max {t.max_players || "?"} joueurs
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                        paddingTop: 14,
                        fontSize: 13,
                        color: "#a78bfa",
                        fontWeight: 600,
                      }}
                    >
                      {currentUser
                        ? "Voir le tournoi →"
                        : "Créer un compte pour participer →"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section
        style={{
          padding: "clamp(40px,8vw,80px) clamp(14px,5vw,48px)",
          background: "linear-gradient(to bottom,#030308,#080312)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2
              style={{
                fontSize: "clamp(26px,4vw,40px)",
                fontWeight: 800,
                marginBottom: 10,
                background: "linear-gradient(135deg,#a855f7,#06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Comment ça marche ?
            </h2>
            <p style={{ color: "#475569", fontSize: 14 }}>
              شرح بسيط وواضح
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 20,
            }}
          >
            {[
              {
                n: "01",
                ic: "📝",
                t: "Créer un compte",
                d: "سجّل بحساب جديد وكمّل المعلومات ديالك بسهولة.",
                c: "#a855f7",
              },
              {
                n: "02",
                ic: "✅",
                t: "Compléter le profil",
                d: "وجد البروفايل ديالك باش تبان كلاعب حقيقي فالمنصة.",
                c: "#06b6d4",
              },
              {
                n: "03",
                ic: "🎮",
                t: "Participer & évoluer",
                d: "دخل فالمنافسة، تابع الإحصائيات ديالك، وطوّر المستوى ديالك.",
                c: "#a855f7",
              },
            ].map((s, i) => (
              <div key={i} style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: -1,
                    background: `linear-gradient(135deg,${s.c}25,transparent)`,
                    borderRadius: 20,
                    filter: "blur(8px)",
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    background: "rgba(8,3,18,0.95)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    padding: "32px 24px",
                    borderRadius: 20,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{s.ic}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: s.c,
                      letterSpacing: 3,
                      marginBottom: 10,
                      opacity: 0.6,
                    }}
                  >
                    ÉTAPE {s.n}
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#f1f5f9",
                      marginBottom: 10,
                    }}
                  >
                    {s.t}
                  </h3>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 14,
                      lineHeight: 1.7,
                    }}
                  >
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "clamp(40px,8vw,80px) clamp(14px,5vw,48px)", background: "#080312" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2
              style={{
                fontSize: "clamp(26px,4vw,40px)",
                fontWeight: 800,
                background: "linear-gradient(135deg,#a855f7,#06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Pourquoi CipherPool ?
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 14,
            }}
          >
            {[
              { ic: "🛡️", t: "Profil sécurisé", d: "حساب منظم وواضح", c: "#a855f7" },
              { ic: "💰", t: "Points & progression", d: "تقدّم وتحفيز مستمر", c: "#06b6d4" },
              { ic: "💬", t: "Communauté gaming", d: "تجربة موجهة للاعبين", c: "#a855f7" },
              { ic: "📊", t: "Stats joueur", d: "إحصائيات سهلة للفهم", c: "#22c55e" },
              { ic: "🏅", t: "Achievements", d: "نظام تطور وتشجيع", c: "#f59e0b" },
              { ic: "👑", t: "Expérience pro", d: "شكل احترافي للمنصة", c: "#ef4444" },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.015)",
                  border: `1px solid ${f.c}15`,
                  borderRadius: 16,
                  padding: "22px 18px",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${f.c}08`;
                  e.currentTarget.style.border = `1px solid ${f.c}32`;
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                  e.currentTarget.style.border = `1px solid ${f.c}15`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 10 }}>{f.ic}</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#e2e8f0",
                    marginBottom: 6,
                  }}
                >
                  {f.t}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  {f.d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "clamp(60px,10vw,100px) clamp(14px,5vw,48px)",
          textAlign: "center",
          background:
            "linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.07))",
          borderTop: "1px solid rgba(168,85,247,0.1)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(28px,5vw,50px)",
              fontWeight: 900,
              marginBottom: 14,
              background: "linear-gradient(135deg,#a855f7,#06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Prêt à commencer ?
          </h2>

          <p
            style={{
              color: "#64748b",
              fontSize: 16,
              marginBottom: 36,
              lineHeight: 1.7,
            }}
          >
            دخل للمنصة وبدأ التجربة ديالك بطريقة بسيطة واحترافية.
          </p>

          <button
            onClick={() => goTo("/register")}
            style={{
              padding: "clamp(14px,3vw,18px) clamp(28px,6vw,60px)",
              background: "linear-gradient(135deg,#7c3aed,#0891b2)",
              border: "none",
              borderRadius: 16,
              fontWeight: 900,
              fontSize: "clamp(14px,3vw,18px)",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 0 50px rgba(124,58,237,0.45)",
              transition: "all .25s",
              letterSpacing: 1,
              width: "100%",
              maxWidth: 360,
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.06)";
              e.target.style.boxShadow = "0 0 70px rgba(124,58,237,0.65)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 0 50px rgba(124,58,237,0.45)";
            }}
          >
            {currentUser ? "Mon Dashboard →" : "Créer mon compte"}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid rgba(168,85,247,0.08)",
          padding: "clamp(28px,6vw,48px) clamp(14px,5vw,48px) 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 36,
            marginBottom: 36,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>
              <span
                style={{
                  background: "linear-gradient(to right,#a855f7,#06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Cipher
              </span>
              <span style={{ color: "#fff" }}>Pool</span>
            </div>

            <p style={{ color: "#334155", fontSize: 13, lineHeight: 1.7 }}>
              Plateforme eSports dédiée à la communauté Free Fire au Maroc.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              Accès
            </h4>

            <div style={{ marginBottom: 8 }}>
              <Link
                to="/login"
                style={{
                  color: "#334155",
                  textDecoration: "none",
                  fontSize: 13,
                }}
                onMouseEnter={(e) => (e.target.style.color = "#a855f7")}
                onMouseLeave={(e) => (e.target.style.color = "#334155")}
              >
                Connexion
              </Link>
            </div>

            <div style={{ marginBottom: 8 }}>
              <Link
                to="/register"
                style={{
                  color: "#334155",
                  textDecoration: "none",
                  fontSize: 13,
                }}
                onMouseEnter={(e) => (e.target.style.color = "#a855f7")}
                onMouseLeave={(e) => (e.target.style.color = "#334155")}
              >
                Inscription
              </Link>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(168,85,247,0.06)",
            paddingTop: 20,
            textAlign: "center",
            color: "#1e293b",
            fontSize: 12,
          }}
        >
          © 2026 CipherPool — Tous droits réservés.
        </div>
      </footer>

      <style>{`
        * { box-sizing: border-box; }
        body { overflow-x: hidden; }

        @keyframes blink {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.3; transform:scale(1.5); }
        }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          /* Stats cards: toujours 4 col mais plus petits */
          .home-stats-grid {
            grid-template-columns: repeat(4,1fr) !important;
            gap: 6px !important;
          }

          /* Buttons hero: full width stacked */
          .home-hero-btns {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 0 !important;
          }
          .home-hero-btns > * {
            max-width: 100% !important;
            min-width: unset !important;
            justify-content: center !important;
          }

          /* Footer: 1 col */
          footer .footer-inner {
            grid-template-columns: 1fr !important;
          }

          /* Feature bar: wrap + smaller */
          .feature-bar span {
            font-size: 11px !important;
          }

          /* How it works grid */
          .how-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}