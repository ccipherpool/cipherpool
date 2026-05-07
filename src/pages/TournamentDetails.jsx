import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";

const STATUS_MAP = {
  active:    { label: "EN COURS",  color: CYAN,   glow: "rgba(0,212,255,0.25)"   },
  upcoming:  { label: "À VENIR",   color: ORANGE, glow: "rgba(249,115,22,0.25)"  },
  open:      { label: "OUVERT",    color: GREEN,  glow: "rgba(16,185,129,0.25)"  },
  completed: { label: "TERMINÉ",   color: "rgba(255,255,255,0.3)", glow: "transparent" },
  cancelled: { label: "ANNULÉ",    color: RED,    glow: "rgba(244,63,94,0.25)"   },
};

// ── Pill badge ─────────────────────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, fontSize: 10, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace", color, background: `${color}15`, border: `1px solid ${color}30` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      {children}
    </span>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function StatBox({ icon, label, value, color, glow }) {
  return (
    <div style={{ textAlign: "center", padding: "16px 12px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 100%, ${glow || color + "15"}, transparent 70%)` }} />
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color, marginBottom: 4 }}>{value}</p>
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
    if (tournament.status !== "open" && tournament.status !== "upcoming" && tournament.status !== "active") { setError("Les inscriptions sont fermées pour ce tournoi."); return; }
    if (tournament.current_players >= tournament.max_players) { setError("Ce tournoi est complet."); return; }
    setRequesting(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const { error: e } = await supabase.from("tournament_participants").insert([{ tournament_id: id, user_id: user.id, status: "pending" }]);
      if (e) {
        if (e.code === "23505") setError("Vous êtes déjà inscrit à ce tournoi.");
        else setError(e.message);
      } else { navigate(`/tournaments/${id}/waiting`); }
    } catch { setError("Une erreur est survenue."); }
    setRequesting(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
      <div style={{ width: 36, height: 36, border: `2px solid rgba(0,212,255,0.15)`, borderTopColor: CYAN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pct  = tournament.max_players > 0 ? Math.round((tournament.current_players / tournament.max_players) * 100) : 0;
  const full = tournament.current_players >= tournament.max_players;
  const s    = STATUS_MAP[tournament.status] || STATUS_MAP.upcoming;
  const free = (tournament.entry_fee || 0) === 0;

  const RULES = [
    "Pas de triche ni d'émulateurs autorisés.",
    "Soyez présents 15 minutes avant le début.",
    "Les résultats sont validés manuellement par le staff.",
    "Le fair-play est obligatoire — tout comportement toxique entraîne une disqualification.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Inter','Space Grotesk',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}} @keyframes flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>

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
        {/* Top accent line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${s.color}, ${VIOLET}, transparent)` }} />

        {/* BG glow */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${s.glow}, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />

        <div style={{ padding: "32px 32px 28px", position: "relative" }}>
          {/* Top badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <Badge color={s.color}>{s.label}</Badge>
            {tournament.mode && <Badge color="rgba(255,255,255,0.35)">{tournament.mode}</Badge>}
            <Badge color={ORANGE}>FREE FIRE</Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "start" }} className="td-hero-grid">
            <style>{`.td-hero-grid{grid-template-columns:1fr auto}@media(max-width:640px){.td-hero-grid{grid-template-columns:1fr}}`}</style>

            <div>
              <h1 style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: "clamp(22px,4vw,38px)", color: "#fff", marginBottom: 10, lineHeight: 1.15 }}>{tournament.name}</h1>
              {tournament.description && (
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 560 }}>{tournament.description}</p>
              )}
            </div>

            {/* Prize highlight */}
            <div style={{ textAlign: "center", padding: "20px 28px", borderRadius: 18, background: `rgba(249,115,22,0.06)`, border: `1px solid rgba(249,115,22,0.2)` }}>
              <p style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 6 }}>PRIZE POOL</p>
              <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 900, color: ORANGE, lineHeight: 1 }}>
                {(tournament.prize_coins || 0).toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: "rgba(249,115,22,0.6)", marginTop: 4, fontFamily: "monospace" }}>CP COINS</p>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 24 }} className="td-stats">
            <style>{`.td-stats{grid-template-columns:repeat(4,1fr)}@media(max-width:640px){.td-stats{grid-template-columns:repeat(2,1fr)}}`}</style>
            <StatBox icon="👥" label="JOUEURS" value={`${tournament.current_players || 0}/${tournament.max_players || 0}`} color="#60a5fa" />
            <StatBox icon="🎟️" label="ENTRÉE" value={free ? "FREE" : `${tournament.entry_fee} CP`} color={free ? CYAN : RED} />
            <StatBox icon="🗺️" label="MAP" value="Bermuda" color="rgba(255,255,255,0.45)" />
            <StatBox icon="📅" label="DATE" value={tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("fr-FR") : "TBA"} color={VIOLET} />
          </div>
        </div>
      </motion.div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }} className="td-main">
        <style>{`.td-main{grid-template-columns:1fr 320px}@media(max-width:900px){.td-main{grid-template-columns:1fr}}`}</style>

        {/* LEFT: info panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Fill bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ padding: "20px 24px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
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
            style={{ padding: "22px 24px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: CYAN, fontFamily: "monospace", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
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
            style={{ padding: "22px 24px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 18 }}>INFORMATIONS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {[
                { label: "Organisateur",  val: "CipherPool Staff" },
                { label: "Format",        val: tournament.mode || "Solo" },
                { label: "Plateforme",    val: "Free Fire Mobile" },
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

        {/* RIGHT: registration panel */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ padding: "24px 22px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.07)", position: "relative", overflow: "hidden" }}>
            {/* subtle glow */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.06), transparent)", pointerEvents: "none" }} />

            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 20 }}>INSCRIPTION</p>

            {/* Prize / Entry */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ padding: "14px 12px", borderRadius: 12, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)", textAlign: "center" }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 6 }}>PRIZE</p>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 18, fontWeight: 900, color: ORANGE }}>{(tournament.prize_coins || 0).toLocaleString()}</p>
                <p style={{ fontSize: 9, color: "rgba(249,115,22,0.5)", fontFamily: "monospace" }}>CP</p>
              </div>
              <div style={{ padding: "14px 12px", borderRadius: 12, background: `rgba(${free ? "0,212,255" : "244,63,94"},0.07)`, border: `1px solid rgba(${free ? "0,212,255" : "244,63,94"},0.18)`, textAlign: "center" }}>
                <p style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 6 }}>ENTRÉE</p>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 18, fontWeight: 900, color: free ? CYAN : RED }}>{free ? "FREE" : tournament.entry_fee}</p>
                {!free && <p style={{ fontSize: 9, color: `rgba(244,63,94,0.5)`, fontFamily: "monospace" }}>CP</p>}
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fca5a5", fontSize: 13 }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            {isApproved ? (
              <Link to={`/tournaments/${id}/room`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 13, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, color: "#000", textDecoration: "none", background: `linear-gradient(135deg,${GREEN},#059669)`, boxShadow: `0 6px 24px rgba(16,185,129,0.35)` }}>
                ⚡ ACCÉDER À LA SALLE
              </Link>
            ) : userRequest?.status === "pending" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 13, fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, color: ORANGE, background: "rgba(249,115,22,0.1)", border: `1px solid rgba(249,115,22,0.25)` }}>
                ⏳ DEMANDE EN ATTENTE
              </div>
            ) : (
              <button onClick={requestToJoin} disabled={requesting || full}
                style={{
                  width: "100%", padding: "14px", borderRadius: 13, border: "none", cursor: (requesting || full) ? "not-allowed" : "pointer",
                  fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2,
                  background: full ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg,${CYAN},${VIOLET})`,
                  color: full ? "rgba(255,255,255,0.2)" : "#fff",
                  boxShadow: full ? "none" : `0 6px 24px rgba(0,212,255,0.3)`,
                  opacity: requesting ? 0.7 : 1, transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                {requesting
                  ? <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  : full ? "TOURNOI COMPLET" : <>S'INSCRIRE AU TOURNOI 👥</>
                }
              </button>
            )}

            {!profile && (
              <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 14 }}>
                <Link to="/login" style={{ color: CYAN, textDecoration: "none", fontWeight: 600 }}>Connecte-toi</Link> pour participer
              </p>
            )}
          </div>

          {/* Share card */}
          <div style={{ padding: "18px 22px", borderRadius: 18, background: "#070b18", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginBottom: 12 }}>PARTAGER</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Telegram", color: "#39b0e3", icon: "✈️" },
                { label: "Copier",   color: CYAN,      icon: "🔗" },
              ].map(btn => (
                <button key={btn.label}
                  onClick={() => btn.label === "Copier" && navigator.clipboard.writeText(window.location.href)}
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
    </div>
  );
}
