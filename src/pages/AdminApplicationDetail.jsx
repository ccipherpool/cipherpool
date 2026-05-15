import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ArrowLeft, ThumbsUp, ThumbsDown, Minus, MessageSquare,
  CheckCircle, XCircle, Clock, AlertCircle, Send, User, Calendar,
  Star, Trophy, Zap, Lock, ChevronDown, ChevronUp, Activity,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_CONFIG = {
  pending:      { label: "Pending",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   icon: Clock          },
  under_review: { label: "Under Review", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   icon: Shield         },
  approved:     { label: "Approved",     color: "#34d399", bg: "rgba(52,211,153,0.1)",   icon: CheckCircle    },
  rejected:     { label: "Rejected",     color: "#f87171", bg: "rgba(248,113,113,0.1)",  icon: XCircle        },
  on_hold:      { label: "On Hold",      color: "#fb923c", bg: "rgba(251,146,60,0.1)",   icon: AlertCircle    },
};

const VOTE_CONFIG = {
  approve:      { label: "Approve",      color: "#34d399", icon: ThumbsUp   },
  reject:       { label: "Reject",       color: "#f87171", icon: ThumbsDown },
  neutral:      { label: "Neutral",      color: "#a1a1aa", icon: Minus      },
  request_info: { label: "Need Info",    color: "#fb923c", icon: MessageSquare },
};

const FINAL_ACTIONS = [
  { status: "approved", label: "Approve",  color: "#34d399", bg: "linear-gradient(135deg,#059669,#34d399)" },
  { status: "rejected", label: "Reject",   color: "#f87171", bg: "linear-gradient(135deg,#dc2626,#f87171)" },
  { status: "on_hold",  label: "On Hold",  color: "#fb923c", bg: "linear-gradient(135deg,#ea580c,#fb923c)" },
];

const QA_LABELS = {
  q_why_join:          "Why do you want to join the team?",
  q_experience:        "Moderation / community experience?",
  q_conflict_scenario: "Scenario: player spamming racial slurs. What do you do?",
  q_availability:      "Hours available per week",
  q_languages:         "Languages you speak",
  q_extra:             "Anything else to add",
};

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#71717a", letterSpacing: 1, textTransform: "uppercase" }}>{title}</span>
        {open ? <ChevronUp size={14} color="#52525b" /> : <ChevronDown size={14} color="#52525b" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 16px 16px" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VotePanel({ appId, myVote, onVoted, disabled }) {
  const [selected, setSelected] = useState(myVote?.vote || null);
  const [comment, setComment]   = useState(myVote?.comment || "");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");

  const submit = async () => {
    if (!selected) return setErr("Select a vote first");
    setLoading(true); setErr("");
    const { data } = await supabase.rpc("vote_admin_application", {
      p_app_id: appId, p_vote: selected, p_comment: comment || null,
    });
    setLoading(false);
    if (data?.success) onVoted(selected, comment);
    else setErr(data?.error || "Failed to vote");
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {Object.entries(VOTE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const active = selected === key;
          return (
            <button key={key} onClick={() => !disabled && setSelected(key)} disabled={disabled}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${active ? cfg.color + "60" : "rgba(255,255,255,.06)"}`,
                background: active ? cfg.color + "15" : "rgba(255,255,255,.02)",
                color: active ? cfg.color : "#71717a", fontWeight: 700, fontSize: 13,
                cursor: disabled ? "default" : "pointer", transition: "all .15s",
              }}>
              <Icon size={14} /> {cfg.label}
            </button>
          );
        })}
      </div>

      {!disabled && (
        <>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Optional comment for this vote…"
            rows={2}
            style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit", marginBottom: 10 }}
          />
          {err && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{err}</p>}
          <button onClick={submit} disabled={loading || !selected}
            style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 13, cursor: loading || !selected ? "default" : "pointer", background: loading || !selected ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#6d28d9,#8b5cf6)", color: loading || !selected ? "#3f3f46" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {loading ? "Submitting…" : <><Send size={13} /> {myVote ? "Update Vote" : "Submit Vote"}</>}
          </button>
        </>
      )}
    </div>
  );
}

function FinalDecisionPanel({ appId, onDecided }) {
  const [status, setStatus]     = useState("");
  const [note, setNote]         = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");

  const submit = async () => {
    if (!status) return setErr("Select a decision");
    setLoading(true); setErr("");
    const { data } = await supabase.rpc("final_review_admin_application", {
      p_app_id: appId, p_status: status,
      p_note: note || null,
      p_blacklist_days: blacklist ? parseInt(blacklist) : null,
    });
    setLoading(false);
    if (data?.success) onDecided(status);
    else setErr(data?.error || "Failed");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {FINAL_ACTIONS.map(a => (
          <button key={a.status} onClick={() => setStatus(a.status)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${status === a.status ? a.color + "60" : "rgba(255,255,255,.06)"}`,
              background: status === a.status ? a.bg : "rgba(255,255,255,.02)",
              color: status === a.status ? "#fff" : a.color,
              fontWeight: 800, fontSize: 12, cursor: "pointer", transition: "all .15s",
            }}>
            {a.label}
          </button>
        ))}
      </div>

      <textarea value={note} onChange={e => setNote(e.target.value)}
        placeholder="Final note (visible to applicant if rejected/approved)…"
        rows={2}
        style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit", marginBottom: 8 }}
      />

      {status === "rejected" && (
        <input value={blacklist} onChange={e => setBlacklist(e.target.value)}
          placeholder="Blacklist days (optional, e.g. 30)"
          type="number" min="0" max="365"
          style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 12px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
        />
      )}

      {err && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{err}</p>}
      <button onClick={submit} disabled={loading || !status}
        style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 13, cursor: loading || !status ? "default" : "pointer", background: loading || !status ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#dc2626,#f97316)", color: loading || !status ? "#3f3f46" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {loading ? "Processing…" : "Confirm Decision"}
      </button>
    </div>
  );
}

function NotesPanel({ appId }) {
  const [notes, setNotes]     = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("admin_application_notes")
      .select("*, profiles:author_id(username,avatar_url)")
      .eq("application_id", appId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setNotes(data || []));
  }, [appId]);

  const addNote = async () => {
    if (!content.trim()) return;
    setLoading(true);
    const { data } = await supabase.rpc("add_application_note", {
      p_app_id: appId, p_content: content.trim(), p_internal: true,
    });
    if (data?.success) {
      const { data: n } = await supabase.from("admin_application_notes")
        .select("*, profiles:author_id(username,avatar_url)")
        .eq("id", data.id).maybeSingle();
      if (n) setNotes(prev => [...prev, n]);
      setContent("");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {notes.length === 0 && <p style={{ color: "#52525b", fontSize: 12 }}>No internal notes yet.</p>}
        {notes.map(n => (
          <div key={n.id} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "rgba(0,0,0,.3)", borderRadius: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 800, color: "#fff" }}>
              {(n.profiles?.username || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 3 }}>
                <strong style={{ color: "#a78bfa" }}>{n.profiles?.username}</strong>
                {" · "}{new Date(n.created_at).toLocaleString()}
              </div>
              <p style={{ fontSize: 13, color: "#d4d4d8", margin: 0, lineHeight: 1.5 }}>{n.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={content} onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addNote()}
          placeholder="Add internal note…"
          style={{ flex: 1, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 12px", color: "#f4f4f5", fontSize: 13, outline: "none" }}
        />
        <button onClick={addNote} disabled={loading}
          style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: "#6d28d9", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

export default function AdminApplicationDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { profile }  = useAuth();

  const [app, setApp]       = useState(null);
  const [votes, setVotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === "super_admin";
  const isStaff      = profile?.role === "admin" || isSuperAdmin;

  const load = async () => {
    setLoading(true);
    const [{ data: appData }, { data: voteData }] = await Promise.all([
      supabase.from("admin_applications")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url, role, created_at, fair_play_score),
          assigned:assigned_reviewer (username),
          decider:final_decision_by (username)
        `)
        .eq("id", id).maybeSingle(),
      supabase.from("admin_application_votes")
        .select("*, voter:voter_id(username, avatar_url, role)")
        .eq("application_id", id),
    ]);
    setApp(appData);
    setVotes(voteData || []);
    setLoading(false);
  };

  useEffect(() => { if (isStaff) load(); }, [id, isStaff]);

  if (!isStaff) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Lock size={36} color="#3f3f46" style={{ margin: "0 auto 10px" }} />
        <p style={{ color: "#52525b", fontSize: 14 }}>Staff access required</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #6d28d920", borderTop: "2px solid #8b5cf6", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!app) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#52525b" }}>Application not found</p>
    </div>
  );

  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const myVote = votes.find(v => v.voter_id === profile?.id);

  const approveCount  = votes.filter(v => v.vote === "approve").length;
  const rejectCount   = votes.filter(v => v.vote === "reject").length;
  const neutralCount  = votes.filter(v => v.vote === "neutral" || v.vote === "request_info").length;
  const totalVotes    = votes.length;
  const approvalRate  = totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : 0;

  const isActive = app.status === "pending" || app.status === "under_review";

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25,#06060f)", borderBottom: "1px solid rgba(139,92,246,.12)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/admin-applications")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#71717a", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Application Review</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${cfg.color}30`, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700 }}>
            <StatusIcon size={12} /> {cfg.label}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* LEFT: Main content */}
        <div>
          {/* Applicant profile */}
          <Section title="Applicant Profile">
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(139,92,246,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#a78bfa", flexShrink: 0 }}>
                {app.profiles?.avatar_url
                  ? <img src={app.profiles.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
                  : (app.profiles?.username || "?")[0].toUpperCase()
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{app.profiles?.username}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#71717a" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={11} /> Joined {new Date(app.profiles?.created_at).toLocaleDateString("en-US", { month:"short", year:"numeric" })}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={11} color="#f59e0b" /> FP: {app.profiles?.fair_play_score ?? 100}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Activity size={11} /> Score: {app.readiness_score}%
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: app.readiness_score >= 80 ? "#34d399" : app.readiness_score >= 60 ? "#f59e0b" : "#f87171", lineHeight: 1 }}>
                  {app.readiness_score}
                </div>
                <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>READINESS</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {app.assigned?.username && (
                <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(96,165,250,.1)", border: "1px solid rgba(96,165,250,.2)", color: "#60a5fa" }}>
                  Reviewer: {app.assigned.username}
                </div>
              )}
              <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", color: "#71717a" }}>
                Submitted: {new Date(app.created_at).toLocaleString()}
              </div>
            </div>
          </Section>

          {/* Application answers */}
          <Section title="Application Answers">
            {Object.entries(QA_LABELS).map(([key, label]) => {
              const answer = app[key];
              if (!answer) return null;
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#6d28d9", fontWeight: 700, letterSpacing: .5, marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {answer}
                  </div>
                </div>
              );
            })}
          </Section>

          {/* Final decision info */}
          {app.final_decision_at && (
            <Section title="Final Decision">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <StatusIcon size={16} color={cfg.color} />
                <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
                <span style={{ fontSize: 12, color: "#52525b" }}>by {app.decider?.username} · {new Date(app.final_decision_at).toLocaleDateString()}</span>
              </div>
              {app.final_note && (
                <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#a1a1aa" }}>
                  {app.final_note}
                </div>
              )}
            </Section>
          )}
        </div>

        {/* RIGHT: Vote panel + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Vote summary */}
          <div style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.15)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 12 }}>VOTE SUMMARY</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#34d399" }}>✓ Approve: {approveCount}</span>
              <span style={{ fontSize: 12, color: "#f87171" }}>✗ Reject: {rejectCount}</span>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>~ Other: {neutralCount}</span>
            </div>
            {/* Approval bar */}
            <div style={{ height: 6, background: "rgba(255,255,255,.05)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#059669,#34d399)", width: `${approvalRate}%`, transition: "width .5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#52525b", textAlign: "center", marginTop: 4 }}>
              {approvalRate}% approval ({totalVotes} votes)
            </div>
          </div>

          {/* Cast vote */}
          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 12 }}>
              {myVote ? `YOUR VOTE: ${VOTE_CONFIG[myVote.vote]?.label?.toUpperCase()}` : "CAST YOUR VOTE"}
            </div>
            <VotePanel
              appId={id}
              myVote={myVote}
              disabled={!isActive}
              onVoted={(vote, comment) => {
                setVotes(prev => {
                  const idx = prev.findIndex(v => v.voter_id === profile?.id);
                  const upd = { ...myVote, vote, comment, voter: { username: profile?.username } };
                  if (idx >= 0) { const arr = [...prev]; arr[idx] = upd; return arr; }
                  return [...prev, upd];
                });
              }}
            />
            {!isActive && (
              <p style={{ fontSize: 11, color: "#52525b", textAlign: "center", marginTop: 8 }}>
                Application is {cfg.label.toLowerCase()} — voting closed
              </p>
            )}
          </div>

          {/* Individual votes */}
          {votes.length > 0 && (
            <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 10 }}>INDIVIDUAL VOTES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {votes.map(v => {
                  const vc = VOTE_CONFIG[v.vote];
                  const VIcon = vc?.icon || Minus;
                  return (
                    <div key={v.voter_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(0,0,0,.3)", borderRadius: 8 }}>
                      <VIcon size={12} color={vc?.color || "#a1a1aa"} />
                      <span style={{ flex: 1, fontSize: 12, color: "#d4d4d8" }}>{v.voter?.username}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: vc?.color || "#a1a1aa" }}>{vc?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final decision — super_admin only */}
          {isSuperAdmin && isActive && (
            <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 12 }}>FINAL DECISION</div>
              <FinalDecisionPanel
                appId={id}
                onDecided={(status) => { setApp(a => ({ ...a, status, final_decision_at: new Date().toISOString() })); }}
              />
            </div>
          )}

          {/* Internal notes */}
          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 10 }}>INTERNAL NOTES</div>
            <NotesPanel appId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
