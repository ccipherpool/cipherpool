import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug, Upload, AlertCircle, CheckCircle, Clock, X, Send,
  ChevronRight, Shield, Zap, AlertTriangle, Info,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const SEVERITY_META = {
  low:      { label: "Low",      color: "#10b981", bg: "rgba(16,185,129,.1)",  reward: 25,   icon: Info          },
  medium:   { label: "Medium",   color: "#f59e0b", bg: "rgba(245,158,11,.1)", reward: 100,  icon: AlertCircle   },
  high:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,.1)",  reward: 300,  icon: AlertTriangle },
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.1)",   reward: 1000, icon: Shield        },
};

const CATEGORIES = [
  { value: "ui",             label: "UI / Visual Bug" },
  { value: "payment_wallet", label: "Payment / Wallet" },
  { value: "tournament",     label: "Tournament" },
  { value: "chat_abuse",     label: "Chat / Abuse" },
  { value: "security",       label: "Security Vulnerability" },
  { value: "login_auth",     label: "Login / Auth" },
  { value: "database",       label: "Data / Database" },
  { value: "performance",    label: "Performance" },
  { value: "other",          label: "Other" },
];

const STATUS_META = {
  open:          { label: "Open",         color: "#71717a" },
  acknowledged:  { label: "Acknowledged", color: "#6366f1" },
  in_progress:   { label: "In Progress",  color: "#f59e0b" },
  fixed:         { label: "Fixed ✓",      color: "#10b981" },
  rejected:      { label: "Rejected",     color: "#ef4444" },
  duplicate:     { label: "Duplicate",    color: "#52525b" },
  wont_fix:      { label: "Won't Fix",    color: "#52525b" },
};

export default function BugBountyPage({ userId }) {
  const [myReports, setMyReports]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);

  const fetchReports = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("bug_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setMyReports(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25 0%,#06060f 100%)", borderBottom: "1px solid rgba(239,68,68,.15)", padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bug size={18} color="#f87171" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Bug Bounty</h1>
              <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>Find bugs, earn CP rewards</p>
            </div>
            {userId && (
              <button
                onClick={() => setShowForm(true)}
                style={{ marginLeft: "auto", padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#f97316)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Bug size={14} /> Report Bug
              </button>
            )}
          </div>

          {/* Reward tiers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 16 }}>
            {Object.entries(SEVERITY_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} style={{ padding: "10px 12px", borderRadius: 10, background: meta.bg, border: `1px solid ${meta.color}25`, textAlign: "center" }}>
                  <Icon size={14} color={meta.color} style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5", marginTop: 2 }}>+{meta.reward} CP</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* My reports */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px" }}>
        {!userId ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Shield size={40} color="#27272a" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#3f3f46", fontSize: 14 }}>Log in to submit and track bug reports</p>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, border: "2px solid #ef444430", borderTop: "2px solid #ef4444", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : myReports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Bug size={40} color="#27272a" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#3f3f46", fontSize: 14 }}>No bug reports yet. Help us improve!</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: 1, marginBottom: 12 }}>
              YOUR REPORTS ({myReports.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myReports.map((r, i) => <ReportCard key={r.id} report={r} index={i} />)}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ReportForm
            userId={userId}
            onClose={() => setShowForm(false)}
            onSuccess={() => { setShowForm(false); fetchReports(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportCard({ report, index }) {
  const sev  = SEVERITY_META[report.severity] || SEVERITY_META.low;
  const stat = STATUS_META[report.status]     || STATUS_META.open;
  const Icon = sev.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={sev.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5" }}>{report.title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: stat.color, whiteSpace: "nowrap" }}>{stat.label}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sev.bg, color: sev.color, fontWeight: 700 }}>
            {sev.label} — +{sev.reward} CP
          </span>
          <span style={{ fontSize: 10, color: "#3f3f46" }}>{report.category?.replace("_", "/")}</span>
          {report.reward_given && (
            <span style={{ fontSize: 10, color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}>
              <CheckCircle size={10} /> {report.reward_amount} CP earned
            </span>
          )}
          <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>
            {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>
        {report.admin_note && (
          <div style={{ fontSize: 11, color: "#71717a", marginTop: 6, padding: "6px 10px", background: "rgba(255,255,255,.03)", borderRadius: 6 }}>
            📌 {report.admin_note}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ReportForm({ userId, onClose, onSuccess }) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [steps, setSteps]       = useState("");
  const [category, setCategory] = useState("ui");
  const [severity, setSeverity] = useState("low");
  const [page, setPage]         = useState("");
  const [device, setDevice]     = useState("");
  const [browser, setBrowser]   = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `bug-reports/${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("screenshots").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("screenshots").getPublicUrl(path);
      setScreenshotUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    setError("");
    if (title.trim().length < 10) return setError("Title must be at least 10 characters");
    if (desc.trim().length < 30)  return setError("Description must be at least 30 characters");
    setLoading(true);
    const { data } = await supabase.rpc("submit_bug_report", {
      p_title:          title.trim(),
      p_description:    desc.trim(),
      p_category:       category,
      p_severity:       severity,
      p_steps:          steps.trim() || null,
      p_screenshot_url: screenshotUrl || null,
      p_affected_page:  page.trim() || null,
      p_device_info:    device.trim() || null,
      p_browser_info:   browser.trim() || null,
    });
    setLoading(false);
    if (data?.success) onSuccess();
    else setError(data?.error || "Failed to submit");
  };

  const sev = SEVERITY_META[severity];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: "linear-gradient(160deg,#0f0f1a,#0c0c18)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 18, padding: 24, width: 560, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bug size={18} color="#f87171" />
            <span style={{ fontSize: 16, fontWeight: 800 }}>Report a Bug</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>

        <FieldLabel>TITLE</FieldLabel>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={150}
          placeholder="Short, descriptive bug title (min 10 chars)"
          style={inputStyle} />

        <FieldLabel style={{ marginTop: 12 }}>SEVERITY</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
          {Object.entries(SEVERITY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button key={key} onClick={() => setSeverity(key)}
                style={{ padding: "8px 6px", borderRadius: 8, border: `1px solid ${severity === key ? meta.color + "50" : "rgba(255,255,255,.07)"}`, background: severity === key ? meta.bg : "transparent", color: severity === key ? meta.color : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <Icon size={13} />
                {meta.label}
                <span style={{ fontSize: 10 }}>+{meta.reward} CP</span>
              </button>
            );
          })}
        </div>

        <FieldLabel>CATEGORY</FieldLabel>
        <select value={category} onChange={e => setCategory(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <FieldLabel>DESCRIPTION</FieldLabel>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={3000} rows={4}
          placeholder="What happened? What did you expect? (min 30 chars)"
          style={{ ...inputStyle, resize: "none", fontFamily: "inherit", lineHeight: 1.5, marginBottom: 12 }} />

        <FieldLabel>STEPS TO REPRODUCE (optional)</FieldLabel>
        <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={3}
          placeholder="1. Go to...\n2. Click...\n3. Bug appears"
          style={{ ...inputStyle, resize: "none", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <FieldLabel>AFFECTED PAGE (optional)</FieldLabel>
            <input value={page} onChange={e => setPage(e.target.value)} placeholder="e.g. /tournament/123"
              style={inputStyle} />
          </div>
          <div>
            <FieldLabel>BROWSER (optional)</FieldLabel>
            <input value={browser} onChange={e => setBrowser(e.target.value)} placeholder="e.g. Chrome 120"
              style={inputStyle} />
          </div>
        </div>

        <FieldLabel>SCREENSHOT (optional)</FieldLabel>
        {screenshotUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <img src={screenshotUrl} alt="Screenshot" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)" }} />
            <span style={{ fontSize: 12, color: "#10b981" }}>Screenshot uploaded ✓</span>
            <button onClick={() => setScreenshotUrl("")} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}><X size={13} /></button>
          </div>
        ) : (
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1px dashed rgba(255,255,255,.1)", cursor: uploading ? "default" : "pointer", marginBottom: 12 }}>
            <Upload size={14} color="#52525b" />
            <span style={{ fontSize: 12, color: "#52525b" }}>{uploading ? "Uploading…" : "Click to upload screenshot"}</span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleUpload(e.target.files?.[0])} disabled={uploading} />
          </label>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 12, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div style={{ background: sev.bg, border: `1px solid ${sev.color}25`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: sev.color, marginBottom: 14 }}>
          If confirmed as <strong>{sev.label}</strong> severity, you earn <strong>+{sev.reward} CP</strong>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: loading ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#ef4444,#f97316)", color: loading ? "#3f3f46" : "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {loading ? "Submitting…" : <><Send size={14} /> Submit Bug Report</>}
        </button>
      </motion.div>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none",
  boxSizing: "border-box", marginBottom: 0,
};

function FieldLabel({ children, style }) {
  return (
    <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6, marginTop: 0, ...style }}>
      {children}
    </div>
  );
}
