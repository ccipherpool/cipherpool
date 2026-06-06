import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";

const STATUS_MAP = {
  draft:             { label: "BROUILLON",  color: "rgba(255,255,255,0.3)", glow: "transparent" },
  published:         { label: "À VENIR",    color: ORANGE, glow: "rgba(249,115,22,0.25)"  },
  registration_open: { label: "OUVERT",     color: GREEN,  glow: "rgba(16,185,129,0.25)"  },
  full:              { label: "COMPLET",    color: ORANGE, glow: "rgba(249,115,22,0.25)"  },
  ready:             { label: "PRÊT",       color: CYAN,   glow: "rgba(0,212,255,0.25)"   },
  live:              { label: "EN COURS",   color: CYAN,   glow: "rgba(0,212,255,0.25)"   },
  results_pending:   { label: "RÉSULTATS",  color: VIOLET, glow: "rgba(139,92,246,0.25)"  },
  completed:         { label: "TERMINÉ",    color: "rgba(255,255,255,0.3)", glow: "transparent" },
  archived:          { label: "ARCHIVÉ",    color: "rgba(255,255,255,0.2)", glow: "transparent" },
  cancelled:         { label: "ANNULÉ",     color: RED,    glow: "rgba(244,63,94,0.25)"   },
};

function Badge({ color, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, fontSize: 10, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace", color, background: `${color}15`, border: `1px solid ${color}30` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      {children}
    </span>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{ textAlign: "center", padding: "14px 10px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 100%, ${color}12, transparent 70%)` }} />
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <p style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace", color, marginBottom: 3 }}>{value}</p>
      <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{label}</p>
    </div>
  );
}

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(userData);
    }
    const { data: tournamentData, error: tErr } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (tErr || !tournamentData) { navigate("/tournaments"); return; }
    setTournament(tournamentData);
    if (user) {
      const { data: requestData } = await supabase.from("tournament_participants").select("*").eq("tournament_id", id).eq("user_id", user.id).maybeSingle();
      setUserRequest(requestData);
      setIsApproved(requestData?.status === "approved");
    }
    setLoading(false);
  };

  const requestToJoin = async () => {
    if (!profile) { navigate("/login"); return; }
    setError("");
    setRequesting(true);
    try {
      const { data, error: e } = await supabase.rpc("join_tournament", { p_tournament_id: id });
      if (e) { setError(e.message); return; }
      if (!data.success) { setError(data.error || "Impossible de rejoindre ce tournoi."); return; }
      navigate(`/tournaments/${id}/waiting`);
    } catch { setError("Une erreur est survenue."); }
    finally { setRequesting(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
      <div style={{ width: 36, height: 36, border: `2px solid rgba(0,212,255,0.15)`, borderTopColor: CYAN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pct  = tournament.max_players > 0 ? Math.round((tournament.current_players / tournament.max_players) * 100) : 0;
  const full = tournament.current_players >= tournament.max_players;
  const s    = STATUS_MAP[tournament.status] || STATUS_MAP.published;
  const free = (tournament.entry_fee || 0) === 0;
  const canRegister    = tournament.status === "registration_open" && !full;
  const notOpenYet     = ["draft", "published"].includes(tournament.status);
  const alreadyStarted = ["ready", "live", "results_pending", "completed", "archived", "cancelled"].includes(tournament.status);

  const RULES = [
    "Pas de triche ni d'émulateurs autorisés.",
    "Soyez présents 15 minutes avant le début.",
    "Les résultats sont validés manuellement par le staff.",
    "Le fair-play est obligatoire — tout comportement toxique entraîne une disqualification.",
  ];

  const CtaButton = ({ compact = false }) => {
    const h = compact ? 44 : 52;
    const fs = compact ? 10 : 11;
    const br = 12;

    if (isApproved) return (
      <Link to={`/tournaments/${id}/room`}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: h, borderRadius: br, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: fs, letterSpacing: 2, color: "#000", textDecoration: "none", background: `linear-gradient(135deg,${GREEN},#059669)`, boxShadow: `0 6px 24px rgba(16,185,129,0.35)` }}>
        ⚡ {compact ? "ENTRER" : "ACCÉDER À LA SALLE"}
      </Link>
    );
    if (alreadyStarted) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: h, borderRadius: br, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: fs, letterSpacing: 2, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        🏁 TERMINÉ
      </div>
    );
    if (notOpenYet) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: h, borderRadius: br, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: fs, letterSpacing: 2, color: ORANGE, background: "rgba(249,115,22,0.07)", border: `1px solid rgba(249,115,22,0.2)` }}>
        🔒 {compact ? "BIENTÔT" : "INSCRIPTIONS PAS ENCORE OUVERTES"}
      </div>
    );
    if (userRequest?.status === "pending") return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: h, borderRadius: br, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: fs, letterSpacing: 2, color: ORANGE, background: "rgba(249,115,22,0.1)", border: `1px solid rgba(249,115,22,0.25)` }}>
        ⏳ EN ATTENTE
      </div>
    );
    return (
      <button onClick={requestToJoin} disabled={requesting || !canRegister}
        style={{
          width: "100%", height: h, borderRadius: br, border: "none",
          cursor: (requesting || !canRegister) ? "not-allowed" : "pointer",
          fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: fs, letterSpacing: 2,
          background: !canRegister ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg,${CYAN},${VIOLET})`,
          color: !canRegister ? "rgba(255,255,255,0.2)" : "#fff",
          boxShadow: !canRegister ? "none" : `0 6px 24px rgba(0,212,255,0.3)`,
          opacity: requesting ? 0.7 : 1, transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {requesting
          ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          : full ? "COMPLET" : "S'INSCRIRE 👥"
        }
      </button>
    );
  };

  return (
    <div
      className="pb-[76px] md:pb-0"
      style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Inter','Space Grotesk',sans-serif" }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>

      {/* ── BACK ── */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => navigate("/tournaments")}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", fontSize: 11, letterSpacing: 2, padding: 0, transition: "color 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.color = CYAN}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
      >
        ← RETOUR AUX TOURNOIS
      </motion.button>

      {/* ── CINEMATIC HERO ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "#070b18", border: `1px solid ${s.color}20` }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${s.color}, ${VIOLET}, transparent)` }} />
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${s.glow}, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)", filter: "blur(20px)", pointerEvents: "none" }} />

        <div className="p-4 md:p-8" style={{ position: "relative" }}>
          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <Badge color={s.color}>{s.label}</Badge>
            {tournament.mode && <Badge color="rgba(255,255,255,0.35)">{tournament.mode}</Badge>}
            <Badge color={ORANGE}>FREE FIRE</Badge>
          </div>

          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-8">
            <div className="flex-1">
              <h1 style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: "clamp(20px,4vw,36px)", color: "#fff", marginBottom: 8, lineHeight: 1.15 }}>
                {tournament.name}
              </h1>
              {tournament.description && (
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 560 }}>
                  {tournament.description}
                </p>
              )}
            </div>

            {/* Prize — desktop only (sidebar version) */}
            <div className="hidden md:block flex-shrink-0" style={{ textAlign: "center", padding: "20px 28px", borderRadius: 18, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <p style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 6 }}>PRIZE POOL</p>
              <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 900, color: ORANGE, lineHeight: 1 }}>
                {(tournament.prize_coins || 0).toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: "rgba(249,115,22,0.6)", marginTop: 4, fontFamily: "monospace" }}>CP COINS</p>
            </div>

            {/* Prize + Entry — mobile inline chips */}
            <div className="md:hidden flex gap-3">
              <div style={{ flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 14, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <p style={{ fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 3 }}>PRIZE</p>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 20, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>
                  {(tournament.prize_coins || 0).toLocaleString()}
                </p>
                <p style={{ fontSize: 8, color: "rgba(249,115,22,0.5)", marginTop: 2, fontFamily: "monospace" }}>CP</p>
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 14, background: `rgba(${free ? "0,212,255" : "244,63,94"},0.06)`, border: `1px solid rgba(${free ? "0,212,255" : "244,63,94"},0.2)` }}>
                <p style={{ fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 3 }}>ENTRÉE</p>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 20, fontWeight: 900, color: free ? CYAN : RED, lineHeight: 1 }}>
                  {free ? "FREE" : tournament.entry_fee}
                </p>
                {!free && <p style={{ fontSize: 8, color: "rgba(244,63,94,0.5)", marginTop: 2, fontFamily: "monospace" }}>CP</p>}
              </div>
            </div>
          </div>

          {/* Stats row: 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
            <StatBox icon="👥" label="JOUEURS"  value={`${tournament.current_players || 0}/${tournament.max_players || 0}`} color="#60a5fa" />
            <StatBox icon="🎟️" label="ENTRÉE"  value={free ? "FREE" : `${tournament.entry_fee} CP`}                        color={free ? CYAN : RED} />
            <StatBox icon="🗺️" label="MAP"     value="Bermuda"                                                               color="rgba(255,255,255,0.45)" />
            <StatBox icon="📅" label="DATE"    value={tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("fr-FR") : "TBA"} color={VIOLET} />
          </div>
        </div>
      </motion.div>

      {/* ── MAIN GRID
            Mobile:  flex-col-reverse → registration panel appears FIRST, then info
            Desktop: side-by-side grid ── */}
      <div className="flex flex-col-reverse md:grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>

        {/* LEFT: info panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Fill bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ padding: "18px 20px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>REMPLISSAGE</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 900, color: full ? RED : CYAN }}>{pct}%</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{tournament.current_players}/{tournament.max_players} joueurs</span>
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: [0.22,1,0.36,1], delay: 0.3 }}
                style={{ height: "100%", borderRadius: 99, background: full ? `linear-gradient(90deg,${RED},#b91c1c)` : `linear-gradient(90deg,${CYAN},${VIOLET})`, backgroundSize: "200% 100%", animation: "flow 2s linear infinite" }} />
            </div>
            {full && <p style={{ marginTop: 8, fontSize: 12, color: RED, fontFamily: "monospace" }}>⚠️ Ce tournoi est complet</p>}
          </motion.div>

          {/* Rules */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ padding: "18px 20px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: CYAN, fontFamily: "monospace", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              🛡 RÈGLEMENT
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {RULES.map((rule, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: `${CYAN}60`, marginTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}.</span>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{rule}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Info grid */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ padding: "18px 20px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 16 }}>INFORMATIONS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Organisateur",  val: "CipherPool Staff"    },
                { label: "Format",        val: tournament.mode || "Solo" },
                { label: "Plateforme",    val: "Free Fire Mobile"    },
                { label: "Date de début", val: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("fr-FR") : "À annoncer" },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginBottom: 5 }}>{item.label.toUpperCase()}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{item.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT: registration + share (on mobile: shows FIRST via flex-col-reverse) */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Registration card */}
          <div style={{ padding: "22px 20px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.07)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.06), transparent)", pointerEvents: "none" }} />
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 18 }}>INSCRIPTION</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ padding: "12px 10px", borderRadius: 12, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)", textAlign: "center" }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 5 }}>PRIZE</p>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 18, fontWeight: 900, color: ORANGE }}>{(tournament.prize_coins || 0).toLocaleString()}</p>
                <p style={{ fontSize: 9, color: "rgba(249,115,22,0.5)", fontFamily: "monospace" }}>CP</p>
              </div>
              <div style={{ padding: "12px 10px", borderRadius: 12, background: `rgba(${free ? "0,212,255" : "244,63,94"},0.07)`, border: `1px solid rgba(${free ? "0,212,255" : "244,63,94"},0.18)`, textAlign: "center" }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 5 }}>ENTRÉE</p>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 18, fontWeight: 900, color: free ? CYAN : RED }}>{free ? "FREE" : tournament.entry_fee}</p>
                {!free && <p style={{ fontSize: 9, color: "rgba(244,63,94,0.5)", fontFamily: "monospace" }}>CP</p>}
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fca5a5", fontSize: 13 }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <CtaButton />

            {!profile && (
              <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>
                <Link to="/login" style={{ color: CYAN, textDecoration: "none", fontWeight: 600 }}>Connecte-toi</Link> pour participer
              </p>
            )}
          </div>

          {/* Share */}
          <div style={{ padding: "16px 20px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginBottom: 12 }}>PARTAGER</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Telegram", color: "#39b0e3", icon: "✈️" },
                { label: "Copier",   color: CYAN,      icon: "🔗" },
              ].map(btn => (
                <button key={btn.label}
                  onClick={() => btn.label === "Copier" && navigator.clipboard.writeText(`${window.location.origin}/t/${tournament?.id}`)}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${btn.color}25`, background: `${btn.color}08`, color: btn.color, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${btn.color}15`; e.currentTarget.style.borderColor = `${btn.color}45`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${btn.color}08`; e.currentTarget.style.borderColor = `${btn.color}25`; }}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── MOBILE STICKY ACTION BAR (always visible above bottom nav) ── */}
      <div
        className="md:hidden fixed left-0 right-0 z-40"
        style={{
          bottom: "calc(56px + env(safe-area-inset-bottom))",
          background: "rgba(5,8,22,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          padding: "10px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Prize / Entry summary */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>PRIZE</p>
              <p style={{ fontSize: 15, fontWeight: 900, fontFamily: "Orbitron,sans-serif", color: ORANGE, lineHeight: 1 }}>
                {(tournament.prize_coins || 0).toLocaleString()}
                <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 2 }}>CP</span>
              </p>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>ENTRÉE</p>
              <p style={{ fontSize: 15, fontWeight: 900, fontFamily: "Orbitron,sans-serif", color: free ? CYAN : RED, lineHeight: 1 }}>
                {free ? "FREE" : `${tournament.entry_fee}CP`}
              </p>
            </div>
          </div>

          {/* Compact CTA */}
          <div style={{ flex: 1.6 }}>
            <CtaButton compact />
          </div>
        </div>
      </div>
    </div>
  );
}
