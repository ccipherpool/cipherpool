import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Calendar, Trophy, AlertTriangle, CheckCircle2,
  Zap, Plus, Clock, ChevronRight, X, RefreshCw,
} from "lucide-react";

const C = {
  bg:       "#111119",
  surface:  "rgba(23,23,32,0.95)",
  surface2: "rgba(30,30,42,0.95)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  accent:   "#6366f1",
  green:    "#10b981",
  red:      "#ef4444",
  amber:    "#f59e0b",
  purple:   "#8b5cf6",
  text:     "#f4f4f5",
  text2:    "#a1a1aa",
  text3:    "#52525b",
  font:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

const RESET_OPTIONS = [
  { key: "reset_coins",       label: "Coins (CP)",          desc: "All wallets reset to 0",             danger: true,  icon: "💰" },
  { key: "reset_xp",          label: "XP & Levels",         desc: "All players return to level 1",      danger: true,  icon: "🆙" },
  { key: "reset_wins",        label: "Wins & Points",       desc: "Wins, K/D, ranking points reset",    danger: true,  icon: "🏆" },
  { key: "reset_tournaments", label: "Active Tournaments",  desc: "Archive all active tournaments",     danger: true,  icon: "🎮" },
  { key: "reset_chat",        label: "Global Chat",         desc: "Erase all chat messages",            danger: false, icon: "💬" },
  { key: "reset_avatars",     label: "Equipped Avatars",    desc: "Remove equipped avatars",            danger: false, icon: "👤" },
  { key: "reset_clans",       label: "Clan Stats",          desc: "Reset clan points and wins to 0",   danger: false, icon: "🛡️" },
];

export default function SeasonsTab() {
  const [seasons, setSeasons] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [form, setForm] = useState({
    name: "", description: "",
    reset_coins: true, reset_xp: true, reset_wins: true,
    reset_avatars: false, reset_chat: true, reset_tournaments: true, reset_clans: false,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: all } = await supabase.from("seasons").select("*").order("number", { ascending: false });
    setSeasons(all || []);
    setActive((all || []).find(s => s.status === "active") || null);
    setLoading(false);
  };

  const startNewSeason = async () => {
    if (!form.name.trim() || submitting || confirmText !== "CONFIRM") return;
    setSubmitting(true);
    setResult(null);
    const { data, error } = await supabase.rpc("start_new_season", {
      p_name: form.name.trim(),
      p_number: (seasons[0]?.number || 0) + 1,
      p_reset_coins:       form.reset_coins,
      p_reset_xp:          form.reset_xp,
      p_reset_stats:       form.reset_wins,
      p_reset_avatars:     form.reset_avatars,
      p_reset_chat:        form.reset_chat,
      p_reset_tournaments: form.reset_tournaments,
      p_reset_clans:       form.reset_clans,
    });
    setSubmitting(false);
    if (error || data?.success === false) {
      setResult({ ok: false, msg: error?.message || data?.error || "Unknown error" });
    } else {
      setResult({ ok: true, msg: "New season launched successfully" });
      setShowModal(false);
      setConfirmText("");
      setForm(f => ({ ...f, name: "", description: "" }));
      fetchData();
    }
  };

  const statusBadge = (status) => {
    const map = {
      active:    { label: "Active",    color: C.green },
      completed: { label: "Completed", color: C.text3 },
      scheduled: { label: "Scheduled", color: C.amber },
    };
    const s = map[status] || { label: status, color: C.text3 };
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
        background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30`,
        letterSpacing: 0.5, textTransform: "uppercase",
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ fontFamily: C.font, color: C.text }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.amber}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Crown size={18} color={C.amber} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Season Management</h2>
            <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>Launch new seasons and manage resets</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchData} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.accent}, #818cf8)`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: `0 0 16px ${C.accent}30` }}
          >
            <Plus size={13} /> Launch New Season
          </button>
        </div>
      </div>

      {/* Result notifications */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: result.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${result.ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, color: result.ok ? "#34d399" : "#f87171", fontSize: 13, fontWeight: 600 }}
          >
            {result.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {result.msg}
            <button onClick={() => setResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Season Card */}
      <div style={{ marginBottom: 24, padding: "20px 24px", borderRadius: 12, background: active ? `linear-gradient(135deg, ${C.surface}, rgba(16,185,129,0.05))` : C.surface, border: `1px solid ${active ? "rgba(16,185,129,0.2)" : C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? C.green : C.text3, boxShadow: active ? `0 0 8px ${C.green}` : "none" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? C.green : C.text3, letterSpacing: 1, textTransform: "uppercase" }}>
                {active ? "Active Season" : "No Active Season"}
              </span>
            </div>
            {active ? (
              <>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px", lineHeight: 1.2 }}>
                  Season {active.number} — {active.name}
                </h3>
                {active.description && (
                  <p style={{ fontSize: 13, color: C.text2, margin: "0 0 12px" }}>{active.description}</p>
                )}
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.text3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Calendar size={12} />
                    Started {new Date(active.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {active.end_date && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Clock size={12} />
                      Ends {new Date(active.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 14, color: C.text3, margin: 0 }}>Launch a new season to activate the competitive cycle.</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {active && [
              { key: "reset_coins", icon: "💰", label: "Coins" },
              { key: "reset_xp",    icon: "🆙", label: "XP" },
              { key: "reset_stats", icon: "📊", label: "Stats" },
            ].map(r => (
              <div key={r.key} style={{ padding: "6px 12px", borderRadius: 8, background: active[r.key] ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)", border: `1px solid ${active[r.key] ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)"}`, fontSize: 11, color: active[r.key] ? C.red : C.green, fontWeight: 600 }}>
                {r.icon} {r.label}: {active[r.key] ? "Will Reset" : "Preserved"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Season History */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Trophy size={13} /> Season History
        </h3>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: C.text3, fontSize: 13 }}>Loading seasons...</div>
        ) : seasons.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: C.text3, fontSize: 13 }}>No seasons created yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {seasons.map(s => (
              <div key={s.id} style={{ padding: "16px 18px", borderRadius: 10, background: C.surface, border: `1px solid ${s.status === "active" ? "rgba(16,185,129,0.2)" : C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>Season {s.number}</span>
                  {statusBadge(s.status)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{s.name}</div>
                {s.description && (
                  <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{s.description}</div>
                )}
                <div style={{ fontSize: 11, color: C.text3, display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={10} />
                  {new Date(s.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {s.end_date && ` → ${new Date(s.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", background: "#111119", border: `1px solid ${C.border2}`, borderRadius: 16, padding: "28px", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.amber}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={18} color={C.amber} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Launch New Season</h3>
                    <p style={{ fontSize: 11, color: C.red, margin: 0, fontWeight: 600 }}>⚠ This will close the current active season</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Season name */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Season Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Season 2 — Cyber Wars"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box" }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Description (optional)</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Season theme, objectives, new features..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, resize: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Reset options */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text2, letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 10 }}>What Will Be Reset</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {RESET_OPTIONS.map(opt => (
                      <label key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px", borderRadius: 8, background: form[opt.key] ? `${C.red}0a` : C.surface, border: `1px solid ${form[opt.key] ? `${C.red}30` : C.border}`, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={form[opt.key]}
                          onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))}
                          style={{ marginTop: 2, accentColor: C.accent }}
                        />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: "0 0 2px", display: "flex", alignItems: "center", gap: 6 }}>
                            {opt.icon} {opt.label}
                            {opt.danger && form[opt.key] && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: C.red, color: "#fff" }}>DANGER</span>
                            )}
                          </p>
                          <p style={{ fontSize: 11, color: C.text3, margin: 0, lineHeight: 1.4 }}>{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Confirm input */}
                <div style={{ padding: "16px", borderRadius: 10, background: "rgba(239,68,68,0.05)", border: `1px solid rgba(239,68,68,0.2)` }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8 }}>To confirm, type "CONFIRM" below:</p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="Type CONFIRM to proceed"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${confirmText === "CONFIRM" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.3)"}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box" }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setShowModal(false); setConfirmText(""); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    onClick={startNewSeason}
                    disabled={!form.name.trim() || confirmText !== "CONFIRM" || submitting}
                    style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: form.name.trim() && confirmText === "CONFIRM" && !submitting ? `linear-gradient(135deg, ${C.amber}, #f97316)` : C.surface2, color: form.name.trim() && confirmText === "CONFIRM" && !submitting ? "#000" : C.text3, fontSize: 13, fontWeight: 700, cursor: form.name.trim() && confirmText === "CONFIRM" && !submitting ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.15s" }}
                  >
                    {submitting ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Launching...</> : <><Zap size={13} /> Launch Season</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </motion.div>
  );
}
