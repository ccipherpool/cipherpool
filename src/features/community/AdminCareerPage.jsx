import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Star, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronRight, Send, X, Lock, Unlock, Trophy, Zap, Users,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const LEVELS = [
  { level: 1, title: "Trusted User",        color: "#10b981", min_score: 40 },
  { level: 2, title: "Helper",              color: "#06b6d4", min_score: 55 },
  { level: 3, title: "Moderator Candidate", color: "#6366f1", min_score: 65 },
  { level: 4, title: "Trial Moderator",     color: "#8b5cf6", min_score: 75 },
  { level: 5, title: "Admin Candidate",     color: "#f59e0b", min_score: 85 },
  { level: 6, title: "Admin",               color: "#ef4444", min_score: 95 },
];

const REQUIREMENTS = [
  { key: "account_age_ok",    label: "Account ≥ 1 month old",      points: 10, icon: Clock   },
  { key: "email_verified",    label: "Email verified",              points: 10, icon: CheckCircle },
  { key: "no_active_bans",    label: "No critical warnings",        points: 10, icon: Shield  },
  { key: "fair_play_ok",      label: "Fair-play score ≥ 80",        points: 15, icon: Star    },
  { key: "tournament_played", label: "Participated in ≥ 1 tournament", points: 15, icon: Trophy },
];

export default function AdminCareerPage({ userId }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [myApp, setMyApp]         = useState(null);
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      supabase.rpc("get_my_readiness"),
      supabase.from("admin_applications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([{ data: r }, { data: app }]) => {
      setReadiness(r || null);
      setMyApp(app || null);
      setLoading(false);
    });
  }, [userId]);

  const score = readiness?.readiness_score ?? 0;

  const currentLevel = LEVELS.filter(l => score >= l.min_score).pop() || null;
  const nextLevel    = LEVELS.find(l => score < l.min_score) || null;

  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Shield size={48} color="#27272a" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "#3f3f46", fontSize: 14 }}>Log in to view your Admin Career progress</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25 0%,#06060f 100%)", borderBottom: "1px solid rgba(139,92,246,.15)", padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color="#a78bfa" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Admin Career</h1>
              <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>Track your path to becoming an admin</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, border: "2px solid #8b5cf630", borderTop: "2px solid #8b5cf6", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Score card */}
            <div style={{ background: "linear-gradient(135deg,rgba(139,92,246,.1),rgba(99,102,241,.06))", border: "1px solid rgba(139,92,246,.2)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>ADMIN READINESS SCORE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 52, fontWeight: 900, color: "#a78bfa", lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 20, color: "#52525b" }}>/ 100</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {currentLevel ? (
                    <>
                      <div style={{ fontSize: 10, color: "#52525b", marginBottom: 2 }}>CURRENT LEVEL</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: currentLevel.color }}>{currentLevel.title}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#3f3f46" }}>Not yet ranked</div>
                  )}
                  {nextLevel && (
                    <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>
                      Next: {nextLevel.title} at {nextLevel.min_score}%
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 8, background: "rgba(255,255,255,.06)", borderRadius: 10, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 10, background: "linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)" }}
                />
              </div>
            </div>

            {/* Requirements checklist */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: 1, marginBottom: 12 }}>REQUIREMENTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {REQUIREMENTS.map(req => {
                  const met = readiness?.[req.key] ?? false;
                  const Icon = req.icon;
                  return (
                    <div key={req.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: met ? "rgba(16,185,129,.05)" : "rgba(255,255,255,.02)", border: `1px solid ${met ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.06)"}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: met ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={13} color={met ? "#10b981" : "#3f3f46"} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: met ? "#f4f4f5" : "#71717a" }}>{req.label}</div>
                        {req.key === "fair_play_ok" && readiness?.fair_play_score != null && (
                          <div style={{ fontSize: 11, color: "#52525b" }}>Your score: {readiness.fair_play_score}</div>
                        )}
                        {req.key === "tournament_played" && readiness?.tournament_count != null && (
                          <div style={{ fontSize: 11, color: "#52525b" }}>{readiness.tournament_count} tournament{readiness.tournament_count !== 1 ? "s" : ""} played</div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: met ? "#10b981" : "#52525b" }}>+{req.points} pts</span>
                        {met ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#3f3f46" />}
                      </div>
                    </div>
                  );
                })}

                {/* Bonus items */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(99,102,241,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={13} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>Accepted ideas</div>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{readiness?.ideas_accepted ?? 0} approved (+5 pts each, max 20)</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>+{Math.min((readiness?.ideas_accepted ?? 0) * 5, 20)} pts</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(239,68,68,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield size={13} color="#f87171" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>Valid bug reports</div>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{readiness?.bugs_valid ?? 0} confirmed (+5 pts each, max 15)</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>+{Math.min((readiness?.bugs_valid ?? 0) * 5, 15)} pts</span>
                </div>

                {(readiness?.active_warnings ?? 0) > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.15)" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AlertCircle size={13} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5" }}>Active warnings</div>
                      <div style={{ fontSize: 11, color: "#52525b" }}>{readiness.active_warnings} warning(s) reducing your score</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>-{readiness.active_warnings * 10} pts</span>
                  </div>
                )}
              </div>
            </div>

            {/* Level ladder */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: 1, marginBottom: 12 }}>CAREER LADDER</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LEVELS.map(l => {
                  const reached = score >= l.min_score;
                  const isCurrent = currentLevel?.level === l.level;
                  return (
                    <div key={l.level} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: isCurrent ? `${l.color}12` : "rgba(255,255,255,.02)", border: `1px solid ${isCurrent ? l.color + "30" : "rgba(255,255,255,.06)"}` }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: reached ? `${l.color}20` : "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {reached ? <CheckCircle size={12} color={l.color} /> : <Lock size={12} color="#3f3f46" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: isCurrent ? 800 : 600, color: reached ? "#f4f4f5" : "#52525b" }}>
                          Level {l.level}: {l.title}
                        </span>
                        {isCurrent && <span style={{ marginLeft: 8, fontSize: 10, color: l.color, fontWeight: 700 }}>← YOU ARE HERE</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: reached ? l.color : "#3f3f46" }}>{l.min_score}%+</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Application status or CTA */}
            {myApp ? (
              <AppStatusCard app={myApp} />
            ) : score >= 40 ? (
              <div style={{ background: "linear-gradient(135deg,rgba(139,92,246,.1),rgba(99,102,241,.06))", border: "1px solid rgba(139,92,246,.25)", borderRadius: 14, padding: 20, textAlign: "center" }}>
                <Shield size={32} color="#a78bfa" style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", marginBottom: 6 }}>Ready to Apply!</div>
                <div style={{ fontSize: 13, color: "#71717a", marginBottom: 16 }}>
                  Your readiness score of <strong style={{ color: "#a78bfa" }}>{score}%</strong> qualifies you to apply.
                </div>
                <button onClick={() => setShowForm(true)}
                  style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  Apply Now →
                </button>
              </div>
            ) : (
              <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 20, textAlign: "center" }}>
                <Lock size={32} color="#27272a" style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: "#52525b", marginBottom: 6 }}>Application Locked</div>
                <div style={{ fontSize: 13, color: "#3f3f46" }}>
                  Reach <strong style={{ color: "#71717a" }}>40% readiness</strong> to unlock your application.<br />
                  You need <strong style={{ color: "#a78bfa" }}>{40 - score} more points</strong>.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ApplicationForm
            userId={userId}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              supabase.from("admin_applications").select("*").eq("user_id", userId)
                .order("created_at", { ascending: false }).limit(1).maybeSingle()
                .then(({ data }) => setMyApp(data || null));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AppStatusCard({ app }) {
  const STATUS_META = {
    pending:      { label: "Pending Review",  color: "#f59e0b", icon: Clock         },
    under_review: { label: "Under Review",    color: "#6366f1", icon: Shield        },
    approved:     { label: "Approved! 🎉",    color: "#10b981", icon: CheckCircle   },
    rejected:     { label: "Not Approved",    color: "#ef4444", icon: XCircle       },
    on_hold:      { label: "On Hold",         color: "#f97316", icon: AlertCircle   },
  };
  const s = STATUS_META[app.status] || STATUS_META.pending;
  const Icon = s.icon;
  return (
    <div style={{ background: `${s.color}0d`, border: `1px solid ${s.color}25`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon size={18} color={s.color} />
        <span style={{ fontSize: 15, fontWeight: 800, color: s.color }}>Application Status: {s.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "#52525b" }}>
        Submitted {new Date(app.created_at).toLocaleDateString()} · Score at time: {app.readiness_score}%
      </div>
      {app.admin_note && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,.04)", borderRadius: 8, fontSize: 12, color: "#a1a1aa" }}>
          📌 {app.admin_note}
        </div>
      )}
    </div>
  );
}

function ApplicationForm({ userId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    q_why_join: "", q_experience: "", q_conflict_scenario: "",
    q_availability: "", q_languages: "", q_extra: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setError("");
    if (form.q_why_join.trim().length < 50)          return setError("Question 1: min 50 characters");
    if (form.q_experience.trim().length < 50)        return setError("Question 2: min 50 characters");
    if (form.q_conflict_scenario.trim().length < 50) return setError("Question 3: min 50 characters");
    if (form.q_availability.trim().length < 10)      return setError("Availability: min 10 characters");
    if (form.q_languages.trim().length < 3)          return setError("Languages: min 3 characters");

    setLoading(true);
    const { data } = await supabase.rpc("submit_admin_application", {
      p_why_join:          form.q_why_join.trim(),
      p_experience:        form.q_experience.trim(),
      p_conflict_scenario: form.q_conflict_scenario.trim(),
      p_availability:      form.q_availability.trim(),
      p_languages:         form.q_languages.trim(),
      p_extra:             form.q_extra.trim() || null,
    });
    setLoading(false);
    if (data?.success) onSuccess();
    else setError(data?.error || "Failed to submit application");
  };

  const questions = [
    { key: "q_why_join",          label: "1. Why do you want to be part of the CipherPool team?", placeholder: "Tell us your motivation, what you love about the platform, and what you'd bring to the team. (min 50 chars)", rows: 4 },
    { key: "q_experience",        label: "2. Do you have moderation or community management experience?", placeholder: "Describe past experience (games, Discord, forums, etc.). If none, explain why you'd be good at it. (min 50 chars)", rows: 4 },
    { key: "q_conflict_scenario", label: "3. Scenario: A player is spamming racial slurs in chat. What do you do?", placeholder: "Walk us through your decision-making process step by step. (min 50 chars)", rows: 4 },
    { key: "q_availability",      label: "4. How many hours per week are you available?", placeholder: "e.g. Weekdays 3–4h, weekends 5h+", rows: 2 },
    { key: "q_languages",         label: "5. What languages do you speak fluently?", placeholder: "e.g. Arabic, French, English", rows: 2 },
    { key: "q_extra",             label: "6. Anything else you'd like to add? (optional)", placeholder: "Skills, achievements, questions for us…", rows: 3 },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: "linear-gradient(160deg,#0f0f1a,#0c0c18)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 18, padding: 24, width: 600, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={18} color="#a78bfa" />
            <span style={{ fontSize: 16, fontWeight: 800 }}>Admin Application</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#a78bfa", marginBottom: 20 }}>
          ⚠️ Answer all questions honestly and thoughtfully. Low-effort answers will be rejected.
        </div>

        {questions.map(q => (
          <div key={q.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 700, display: "block", marginBottom: 6, lineHeight: 1.4 }}>
              {q.label}
            </label>
            <textarea
              value={form[q.key]}
              onChange={e => set(q.key, e.target.value)}
              placeholder={q.placeholder}
              rows={q.rows}
              style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <div style={{ textAlign: "right", fontSize: 10, color: "#3f3f46" }}>{form[q.key].length} chars</div>
          </div>
        ))}

        {error && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 12, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: loading ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: loading ? "#3f3f46" : "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {loading ? "Submitting…" : <><Send size={14} /> Submit Application</>}
        </button>
      </motion.div>
    </div>
  );
}
