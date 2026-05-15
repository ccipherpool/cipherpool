import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Bug, Shield, CheckCircle, XCircle, Clock, Eye,
  ChevronDown, AlertTriangle, X, Send, Users, Star, Trophy,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

const TABS = [
  { id: "ideas",        label: "Ideas",        icon: Lightbulb },
  { id: "bugs",         label: "Bug Reports",  icon: Bug       },
  { id: "applications", label: "Applications", icon: Shield    },
];

const SEVERITY_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const SEVERITY_REWARDS = { low: 25, medium: 100, high: 300, critical: 1000 };

export default function CommunityTab() {
  const [activeTab, setActiveTab] = useState("ideas");
  const [ideas, setIdeas]         = useState([]);
  const [bugs, setBugs]           = useState([]);
  const [apps, setApps]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchIdeas = useCallback(async () => {
    const { data } = await supabase
      .from("community_ideas_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setIdeas(data || []);
  }, []);

  const fetchBugs = useCallback(async () => {
    const { data } = await supabase
      .from("bug_reports_admin_view")
      .select("*")
      .limit(100);
    setBugs(data || []);
  }, []);

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("admin_applications")
      .select("*, profiles!user_id(username, avatar_url, fair_play_score)")
      .order("created_at", { ascending: false })
      .limit(100);
    setApps(data || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchIdeas(), fetchBugs(), fetchApps()]).then(() => setLoading(false));
  }, [fetchIdeas, fetchBugs, fetchApps]);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([fetchIdeas(), fetchBugs(), fetchApps()]).then(() => setLoading(false));
  };

  const pendingIdeas = ideas.filter(i => i.status === "pending").length;
  const pendingBugs  = bugs.filter(b => b.status === "open").length;
  const pendingApps  = apps.filter(a => a.status === "pending").length;

  const filteredIdeas = statusFilter === "all" ? ideas : ideas.filter(i => i.status === statusFilter);
  const filteredBugs  = statusFilter === "all" ? bugs  : bugs.filter(b => b.status === statusFilter);
  const filteredApps  = statusFilter === "all" ? apps  : apps.filter(a => a.status === statusFilter);

  return (
    <div style={{ padding: "0 24px 40px" }}>
      {/* Section tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, paddingTop: 4 }}>
        {TABS.map(t => {
          const pending = t.id === "ideas" ? pendingIdeas : t.id === "bugs" ? pendingBugs : pendingApps;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setStatusFilter("all"); setSelected(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
                border: `1px solid ${activeTab === t.id ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.06)"}`,
                background: activeTab === t.id ? "rgba(99,102,241,.1)" : "transparent",
                color: activeTab === t.id ? "#818cf8" : "#52525b", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
              <Icon size={14} />
              {t.label}
              {pending > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10, background: "rgba(239,68,68,.2)", color: "#f87171" }}>
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 28, height: 28, border: "2px solid #6366f130", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {activeTab === "ideas"        && <IdeasPanel ideas={filteredIdeas} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSelect={setSelected} onRefresh={handleRefresh} />}
          {activeTab === "bugs"         && <BugsPanel  bugs={filteredBugs}  statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSelect={setSelected} onRefresh={handleRefresh} />}
          {activeTab === "applications" && <AppsPanel  apps={filteredApps}  statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSelect={setSelected} onRefresh={handleRefresh} />}
        </>
      )}

      <AnimatePresence>
        {selected && activeTab === "ideas" && (
          <IdeaReviewModal idea={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); handleRefresh(); }} />
        )}
        {selected && activeTab === "bugs" && (
          <BugReviewModal bug={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); handleRefresh(); }} />
        )}
        {selected && activeTab === "applications" && (
          <AppReviewModal app={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); handleRefresh(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── IDEAS PANEL ─────────────────────────────────────────────────────────────

const IDEA_STATUSES = ["all","pending","under_review","planned","approved","rejected","completed"];

function IdeasPanel({ ideas, statusFilter, setStatusFilter, onSelect, onRefresh }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {IDEA_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${statusFilter === s ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`, background: statusFilter === s ? "rgba(99,102,241,.12)" : "transparent", color: statusFilter === s ? "#818cf8" : "#52525b" }}>
            {s === "all" ? "All" : s.replace("_"," ")}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ideas.length === 0 && <EmptyState label="No ideas" />}
        {ideas.map(idea => (
          <div key={idea.id}
            onClick={() => onSelect(idea)}
            style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", cursor: "pointer" }}
            className="hover:bg-white/[0.03]">
            {/* Vote score */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 42, gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: idea.vote_score > 0 ? "#10b981" : idea.vote_score < 0 ? "#ef4444" : "#52525b" }}>
                {idea.vote_score}
              </span>
              <span style={{ fontSize: 9, color: "#3f3f46", textAlign: "center" }}>votes</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5" }}>{idea.title}</span>
                <StatusBadge status={idea.status} />
              </div>
              <p style={{ fontSize: 12, color: "#71717a", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {idea.description}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#52525b" }}>by @{idea.author_username}</span>
                <span style={{ fontSize: 10, color: "#3f3f46" }}>{idea.category}</span>
                <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>{new Date(idea.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BUGS PANEL ──────────────────────────────────────────────────────────────

const BUG_STATUSES = ["all","open","acknowledged","in_progress","fixed","rejected","duplicate","wont_fix"];

function BugsPanel({ bugs, statusFilter, setStatusFilter, onSelect, onRefresh }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {BUG_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${statusFilter === s ? "rgba(239,68,68,.4)" : "rgba(255,255,255,.07)"}`, background: statusFilter === s ? "rgba(239,68,68,.12)" : "transparent", color: statusFilter === s ? "#f87171" : "#52525b" }}>
            {s === "all" ? "All" : s.replace("_"," ")}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bugs.length === 0 && <EmptyState label="No bug reports" />}
        {bugs.map(bug => {
          const sevColor = SEVERITY_COLORS[bug.severity] || "#71717a";
          return (
            <div key={bug.id}
              onClick={() => onSelect(bug)}
              style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid rgba(255,255,255,.06)`, cursor: "pointer", borderLeft: `3px solid ${sevColor}40` }}
              className="hover:bg-white/[0.03]">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${sevColor}18`, color: sevColor, fontWeight: 700 }}>
                    {bug.severity?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5" }}>{bug.title}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#52525b" }}>{bug.status?.replace("_"," ")}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#52525b" }}>by @{bug.reporter_username}</span>
                  <span style={{ fontSize: 10, color: "#3f3f46" }}>{bug.category?.replace("_","/")} · {bug.affected_page || "N/A"}</span>
                  {bug.reward_given && <span style={{ fontSize: 10, color: "#10b981" }}>✓ Rewarded {bug.reward_amount} CP</span>}
                  <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>{new Date(bug.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── APPLICATIONS PANEL ──────────────────────────────────────────────────────

const APP_STATUSES = ["all","pending","under_review","approved","rejected","on_hold"];

function AppsPanel({ apps, statusFilter, setStatusFilter, onSelect }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {APP_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${statusFilter === s ? "rgba(139,92,246,.4)" : "rgba(255,255,255,.07)"}`, background: statusFilter === s ? "rgba(139,92,246,.12)" : "transparent", color: statusFilter === s ? "#a78bfa" : "#52525b" }}>
            {s === "all" ? "All" : s.replace("_"," ")}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {apps.length === 0 && <EmptyState label="No applications" />}
        {apps.map(app => (
          <div key={app.id}
            onClick={() => onSelect(app)}
            style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", cursor: "pointer" }}
            className="hover:bg-white/[0.03]">
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(139,92,246,.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {app.profiles?.avatar_url
                ? <img src={app.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>{app.profiles?.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5" }}>@{app.profiles?.username}</div>
                  <div style={{ fontSize: 11, color: "#52525b" }}>Level {app.level} · Score: {app.readiness_score}% · FP: {app.profiles?.fair_play_score ?? "N/A"}</div>
                </div>
                <StatusBadge status={app.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── REVIEW MODALS ────────────────────────────────────────────────────────────

function IdeaReviewModal({ idea, onClose, onDone }) {
  const [note, setNote]       = useState(idea.admin_note || "");
  const [status, setStatus]   = useState(idea.status);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const STATUSES = ["pending","under_review","planned","approved","rejected","completed"];

  const handleSave = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("admin_review_idea", {
      p_request_id: idea.id, p_status: status, p_note: note.trim() || null,
    });
    setLoading(false);
    if (data?.success) onDone();
    else setError(data?.error || "Failed");
  };

  return (
    <ReviewModalWrapper onClose={onClose} title={`💡 Idea Review`}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", marginBottom: 6 }}>{idea.title}</div>
      <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6, marginBottom: 12 }}>{idea.description}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,.1)", color: "#818cf8" }}>{idea.category}</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,.05)", color: "#52525b" }}>↑{idea.upvotes} ↓{idea.downvotes} (score: {idea.vote_score})</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>STATUS</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${status === s ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`, background: status === s ? "rgba(99,102,241,.12)" : "transparent", color: status === s ? "#818cf8" : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {s.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ADMIN NOTE (optional)</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          placeholder="Leave a note for the user…"
          style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }} />
      </div>
      {["approved","completed"].includes(status) && !idea.reward_given && (
        <div style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#10b981", marginBottom: 12 }}>
          ✅ This will reward the user <strong>100 CP</strong>
        </div>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button onClick={handleSave} disabled={loading}
        style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: loading ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#6366f1,#818cf8)", color: loading ? "#3f3f46" : "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        {loading ? "Saving…" : "Save Review"}
      </button>
    </ReviewModalWrapper>
  );
}

function BugReviewModal({ bug, onClose, onDone }) {
  const [note, setNote]       = useState(bug.admin_note || "");
  const [status, setStatus]   = useState(bug.status);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const BUG_STATUSES = ["open","acknowledged","in_progress","fixed","rejected","duplicate","wont_fix"];
  const sevColor = SEVERITY_COLORS[bug.severity] || "#71717a";

  const handleSave = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("admin_review_bug", {
      p_report_id: bug.id, p_status: status, p_note: note.trim() || null,
    });
    setLoading(false);
    if (data?.success) onDone();
    else setError(data?.error || "Failed");
  };

  return (
    <ReviewModalWrapper onClose={onClose} title="🐛 Bug Report Review">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${sevColor}18`, color: sevColor, fontWeight: 700 }}>
          {bug.severity?.toUpperCase()} — +{SEVERITY_REWARDS[bug.severity]} CP
        </span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,.05)", color: "#52525b" }}>
          {bug.category?.replace("_","/")}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5", marginBottom: 8 }}>{bug.title}</div>
      <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6, marginBottom: 10 }}>{bug.description}</div>
      {bug.steps_to_repro && (
        <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#a1a1aa", fontFamily: "monospace", marginBottom: 10, whiteSpace: "pre-wrap" }}>
          {bug.steps_to_repro}
        </div>
      )}
      {bug.screenshot_url && (
        <a href={bug.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: 12 }}>
          <img src={bug.screenshot_url} alt="Screenshot" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)" }} />
        </a>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, fontSize: 11, color: "#52525b" }}>
        {bug.affected_page && <div>📄 Page: {bug.affected_page}</div>}
        {bug.device_info   && <div>📱 Device: {bug.device_info}</div>}
        {bug.browser_info  && <div>🌐 Browser: {bug.browser_info}</div>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>STATUS</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {BUG_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${status === s ? sevColor + "50" : "rgba(255,255,255,.07)"}`, background: status === s ? `${sevColor}15` : "transparent", color: status === s ? sevColor : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {s.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ADMIN NOTE</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          placeholder="Feedback for the reporter…"
          style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }} />
      </div>
      {["acknowledged","in_progress","fixed"].includes(status) && !bug.reward_given && (
        <div style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#10b981", marginBottom: 12 }}>
          ✅ Rewards <strong>{SEVERITY_REWARDS[bug.severity]} CP</strong> for confirmed {bug.severity} bug
        </div>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button onClick={handleSave} disabled={loading}
        style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: loading ? "rgba(255,255,255,.04)" : `linear-gradient(135deg,${sevColor},${sevColor}cc)`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        {loading ? "Saving…" : "Save Review"}
      </button>
    </ReviewModalWrapper>
  );
}

function AppReviewModal({ app, onClose, onDone }) {
  const [note, setNote]       = useState(app.admin_note || "");
  const [status, setStatus]   = useState(app.status);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const APP_STATUSES = ["pending","under_review","approved","rejected","on_hold"];

  const handleSave = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("admin_review_application", {
      p_app_id: app.id, p_status: status, p_note: note.trim() || null,
    });
    setLoading(false);
    if (data?.success) onDone();
    else setError(data?.error || "Failed");
  };

  const questions = [
    { label: "Why do you want to join?",              value: app.q_why_join          },
    { label: "Experience?",                           value: app.q_experience        },
    { label: "Conflict scenario response:",           value: app.q_conflict_scenario },
    { label: "Availability:",                         value: app.q_availability      },
    { label: "Languages:",                            value: app.q_languages         },
    { label: "Extra notes:",                          value: app.q_extra             },
  ];

  return (
    <ReviewModalWrapper onClose={onClose} title="⭐ Admin Application">
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(139,92,246,.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {app.profiles?.avatar_url
            ? <img src={app.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 16, fontWeight: 700, color: "#8b5cf6" }}>{app.profiles?.username?.[0]?.toUpperCase()}</span>
          }
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5" }}>@{app.profiles?.username}</div>
          <div style={{ fontSize: 11, color: "#52525b" }}>
            Readiness: {app.readiness_score}% · FP: {app.profiles?.fair_play_score ?? "N/A"} · Level {app.level} Application
          </div>
        </div>
      </div>

      {questions.map((q, i) => q.value && (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{q.label.toUpperCase()}</div>
          <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.6, background: "rgba(0,0,0,.2)", borderRadius: 8, padding: "10px 12px" }}>
            {q.value}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DECISION</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {APP_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${status === s ? "rgba(139,92,246,.4)" : "rgba(255,255,255,.07)"}`, background: status === s ? "rgba(139,92,246,.12)" : "transparent", color: status === s ? "#a78bfa" : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {s.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>FEEDBACK FOR APPLICANT</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          placeholder="Reason for decision, improvement tips, etc."
          style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }} />
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button onClick={handleSave} disabled={loading}
        style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: loading ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        {loading ? "Saving…" : "Submit Decision"}
      </button>
    </ReviewModalWrapper>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────

function ReviewModalWrapper({ children, title, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: "linear-gradient(160deg,#0f0f1a,#0c0c18)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 18, padding: 24, width: 580, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5" }}>{title}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending:      { color: "#71717a", bg: "rgba(113,113,122,.12)" },
    under_review: { color: "#f59e0b", bg: "rgba(245,158,11,.12)"  },
    planned:      { color: "#6366f1", bg: "rgba(99,102,241,.12)"  },
    approved:     { color: "#10b981", bg: "rgba(16,185,129,.12)"  },
    rejected:     { color: "#ef4444", bg: "rgba(239,68,68,.12)"   },
    completed:    { color: "#06b6d4", bg: "rgba(6,182,212,.12)"   },
    open:         { color: "#71717a", bg: "rgba(113,113,122,.12)" },
    acknowledged: { color: "#6366f1", bg: "rgba(99,102,241,.12)"  },
    in_progress:  { color: "#f59e0b", bg: "rgba(245,158,11,.12)"  },
    fixed:        { color: "#10b981", bg: "rgba(16,185,129,.12)"  },
    on_hold:      { color: "#f97316", bg: "rgba(249,115,22,.12)"  },
  };
  const c = colors[status] || { color: "#52525b", bg: "rgba(255,255,255,.05)" };
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
      {status?.replace("_"," ")}
    </span>
  );
}

function EmptyState({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
      <div style={{ fontSize: 32, marginBottom: 8, opacity: .3 }}>📭</div>
      <p style={{ fontSize: 13 }}>{label}</p>
    </div>
  );
}
