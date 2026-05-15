import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, Send, CheckCircle, Clock, XCircle, AlertTriangle, Plus,
  X, Link, ChevronDown, Shield, Search,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const TYPES = [
  { key: "cheat",  label: "Cheating",      icon: "🎯", desc: "Aimbot, wallhack, exploits" },
  { key: "toxic",  label: "Toxic Behavior", icon: "💢", desc: "Hate speech, racism, slurs"  },
  { key: "fraud",  label: "Fraud",          icon: "💰", desc: "Scam, fake giveaways"        },
  { key: "bug",    label: "Bug Report",     icon: "🐛", desc: "Technical issue / glitch"    },
  { key: "other",  label: "Other",          icon: "📋", desc: "Anything else"               },
];

const SEVERITIES = [
  { key: "low",      label: "Low",      color: "#71717a", desc: "Minor annoyance"          },
  { key: "medium",   label: "Medium",   color: "#f59e0b", desc: "Affects gameplay"         },
  { key: "high",     label: "High",     color: "#f97316", desc: "Serious violation"        },
  { key: "critical", label: "Critical", color: "#ef4444", desc: "Immediate action needed"  },
];

const STATUS_CFG = {
  pending:   { label: "Pending Review", color: "#f59e0b", icon: Clock       },
  resolved:  { label: "Resolved",       color: "#34d399", icon: CheckCircle },
  dismissed: { label: "Dismissed",      color: "#71717a", icon: XCircle     },
};

function TypeCard({ type, selected, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "12px 8px", borderRadius: 12, border: `1px solid ${selected ? "#8b5cf680" : "rgba(255,255,255,.06)"}`,
        background: selected ? "rgba(139,92,246,.12)" : "rgba(255,255,255,.02)",
        cursor: "pointer", transition: "all .15s",
      }}>
      <span style={{ fontSize: 22 }}>{type.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: selected ? "#a78bfa" : "#71717a" }}>{type.label}</span>
      <span style={{ fontSize: 10, color: "#52525b", textAlign: "center", lineHeight: 1.3 }}>{type.desc}</span>
    </button>
  );
}

function ReportForm({ onSubmit }) {
  const [form, setForm] = useState({
    type: "", title: "", description: "", reported_username: "",
    severity: "medium", evidence: [""],
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addEvidence = () => {
    if (form.evidence.length < 3) setForm(f => ({ ...f, evidence: [...f.evidence, ""] }));
  };
  const setEvidence = (i, v) => setForm(f => {
    const arr = [...f.evidence]; arr[i] = v; return { ...f, evidence: arr };
  });
  const removeEvidence = (i) => setForm(f => ({
    ...f, evidence: f.evidence.filter((_, idx) => idx !== i),
  }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.type)                              return setErr("Select a report type");
    if (form.title.trim().length < 5)            return setErr("Title: at least 5 characters");
    if (form.description.trim().length < 20)     return setErr("Description: at least 20 characters");

    let reportedId = null;
    if (form.reported_username.trim()) {
      const { data: u } = await supabase.from("profiles")
        .select("id").eq("username", form.reported_username.trim()).maybeSingle();
      if (!u) return setErr(`User "${form.reported_username}" not found`);
      reportedId = u.id;
    }

    const evidenceUrls = form.evidence.map(e => e.trim()).filter(Boolean);

    setLoading(true);
    const { data } = await supabase.rpc("submit_report_v2", {
      p_title:            form.title.trim(),
      p_type:             form.type,
      p_description:      form.description.trim(),
      p_reported_user_id: reportedId,
      p_severity:         form.severity,
      p_evidence_urls:    evidenceUrls.length ? evidenceUrls : null,
    });
    setLoading(false);

    if (data?.success) {
      setSuccess(true);
      onSubmit?.();
      setTimeout(() => setSuccess(false), 4000);
      setForm({ type: "", title: "", description: "", reported_username: "", severity: "medium", evidence: [""] });
    } else {
      setErr(data?.error || "Failed to submit report");
    }
  };

  if (success) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      style={{ textAlign: "center", padding: "40px 20px" }}>
      <CheckCircle size={48} color="#34d399" style={{ margin: "0 auto 14px" }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f5", marginBottom: 6 }}>Report Submitted</div>
      <p style={{ fontSize: 13, color: "#71717a" }}>Our staff will review it shortly. Thank you for helping keep CipherPool safe.</p>
    </motion.div>
  );

  return (
    <div>
      {/* Type selector */}
      <div style={{ fontSize: 12, color: "#71717a", fontWeight: 700, letterSpacing: .5, marginBottom: 10 }}>
        REPORT TYPE <span style={{ color: "#ef4444" }}>*</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 20 }}>
        {TYPES.map(t => (
          <TypeCard key={t.key} type={t} selected={form.type === t.key}
            onClick={() => set("type", t.key)} />
        ))}
      </div>

      {/* Severity */}
      <div style={{ fontSize: 12, color: "#71717a", fontWeight: 700, letterSpacing: .5, marginBottom: 10 }}>SEVERITY</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {SEVERITIES.map(s => (
          <button key={s.key} onClick={() => set("severity", s.key)}
            style={{
              padding: "10px 8px", borderRadius: 10,
              border: `1px solid ${form.severity === s.key ? s.color + "60" : "rgba(255,255,255,.06)"}`,
              background: form.severity === s.key ? s.color + "12" : "rgba(255,255,255,.02)",
              cursor: "pointer",
            }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: form.severity === s.key ? s.color : "#71717a" }}>{s.label}</div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Title */}
      <label style={{ fontSize: 12, color: "#71717a", fontWeight: 700, display: "block", marginBottom: 6 }}>
        TITLE <span style={{ color: "#ef4444" }}>*</span>
      </label>
      <input value={form.title} onChange={e => set("title", e.target.value)}
        placeholder="Brief summary of the issue…"
        maxLength={120}
        style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
      />

      {/* Reported user */}
      <label style={{ fontSize: 12, color: "#71717a", fontWeight: 700, display: "block", marginBottom: 6 }}>
        REPORTED USERNAME <span style={{ color: "#52525b", fontWeight: 400 }}>(optional)</span>
      </label>
      <input value={form.reported_username} onChange={e => set("reported_username", e.target.value)}
        placeholder="Username of the player you're reporting…"
        style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
      />

      {/* Description */}
      <label style={{ fontSize: 12, color: "#71717a", fontWeight: 700, display: "block", marginBottom: 6 }}>
        DESCRIPTION <span style={{ color: "#ef4444" }}>*</span>
      </label>
      <textarea value={form.description} onChange={e => set("description", e.target.value)}
        placeholder="Describe what happened in detail. Include timestamps, match IDs, or any other relevant context. (min 20 chars)"
        rows={5}
        style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, marginBottom: 4 }}
      />
      <div style={{ textAlign: "right", fontSize: 10, color: "#3f3f46", marginBottom: 16 }}>{form.description.length} chars</div>

      {/* Evidence URLs */}
      <label style={{ fontSize: 12, color: "#71717a", fontWeight: 700, display: "block", marginBottom: 6 }}>
        EVIDENCE LINKS <span style={{ color: "#52525b", fontWeight: 400 }}>(up to 3)</span>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {form.evidence.map((url, i) => (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", flex: 1, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", gap: 8 }}>
              <Link size={13} color="#52525b" />
              <input value={url} onChange={e => setEvidence(i, e.target.value)}
                placeholder="https://imgur.com/… or YouTube link"
                style={{ flex: 1, background: "none", border: "none", color: "#f4f4f5", fontSize: 13, outline: "none" }}
              />
            </div>
            {form.evidence.length > 1 && (
              <button onClick={() => removeEvidence(i)}
                style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {form.evidence.length < 3 && (
          <button onClick={addEvidence}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "1px dashed rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Plus size={12} /> Add link
          </button>
        )}
      </div>

      {err && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 12, marginBottom: 16 }}>
          <AlertTriangle size={13} /> {err}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 14, cursor: loading ? "default" : "pointer", background: loading ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#dc2626,#ef4444)", color: loading ? "#3f3f46" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {loading ? "Submitting…" : <><Send size={14} /> Submit Report</>}
      </button>
    </div>
  );
}

export default function Reports() {
  const { profile } = useAuth();
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadMyReports = async () => {
    if (!profile?.id) return;
    setLoadingReports(true);
    const { data } = await supabase
      .from("reports")
      .select("id, title, type, severity, status, created_at, description")
      .eq("reporter_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setMyReports(data || []);
    setLoadingReports(false);
  };

  useEffect(() => { loadMyReports(); }, [profile?.id]);

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25,#06060f)", borderBottom: "1px solid rgba(239,68,68,.12)", padding: "24px 24px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Flag size={17} color="#f87171" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Report Center</h1>
              <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>Help keep CipherPool fair and safe</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px" }}>
        {/* Submit button / form toggle */}
        <div style={{ marginBottom: 24 }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "1px dashed rgba(239,68,68,.3)", background: "rgba(239,68,68,.05)", color: "#f87171", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Plus size={16} /> Submit New Report
            </button>
          ) : (
            <div style={{ background: "linear-gradient(135deg,rgba(15,15,37,.8),rgba(6,6,15,.95))", border: "1px solid rgba(239,68,68,.2)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Flag size={16} color="#f87171" />
                  <span style={{ fontSize: 15, fontWeight: 800 }}>New Report</span>
                </div>
                <button onClick={() => setShowForm(false)}
                  style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={13} />
                </button>
              </div>
              <ReportForm onSubmit={() => { setShowForm(false); loadMyReports(); }} />
            </div>
          )}
        </div>

        {/* My reports */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: 1, marginBottom: 12 }}>MY REPORTS</div>

          {loadingReports ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
              <div style={{ width: 22, height: 22, border: "2px solid #ef444420", borderTop: "2px solid #ef4444", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : myReports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#3f3f46" }}>
              <Shield size={32} color="#27272a" style={{ margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13 }}>No reports submitted yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myReports.map(r => {
                const s = STATUS_CFG[r.status] || STATUS_CFG.pending;
                const SIcon = s.icon;
                const typeInfo = TYPES.find(t => t.key === r.type);
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize: 20 }}>{typeInfo?.icon || "📋"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", truncate: true }}>
                        {r.title || r.description?.substring(0,60) || "No title"}
                      </div>
                      <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
                        {typeInfo?.label} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: s.color }}>
                      <SIcon size={11} /> {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
