import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp, ThumbsDown, Minus, MessageSquare, Shield, Clock,
  ChevronRight, Send, Lock, Inbox,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const VOTE_OPTIONS = [
  { key: "approve",      label: "Approve",   color: "#34d399", bg: "rgba(52,211,153,.12)",  icon: ThumbsUp       },
  { key: "reject",       label: "Reject",    color: "#f87171", bg: "rgba(248,113,113,.12)", icon: ThumbsDown     },
  { key: "neutral",      label: "Neutral",   color: "#a1a1aa", bg: "rgba(161,161,170,.08)", icon: Minus          },
  { key: "request_info", label: "Need Info", color: "#fb923c", bg: "rgba(251,146,60,.12)",  icon: MessageSquare  },
];

function VotingCard({ app, myVote, onVoted, onDetails }) {
  const [selected, setSelected] = useState(myVote?.vote || null);
  const [comment, setComment]   = useState(myVote?.comment || "");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(!!myVote);

  const submit = async () => {
    if (!selected) return;
    setLoading(true);
    const { data } = await supabase.rpc("vote_admin_application", {
      p_app_id: app.id, p_vote: selected, p_comment: comment || null,
    });
    setLoading(false);
    if (data?.success) {
      setDone(true);
      onVoted?.(app.id, selected);
    }
  };

  const approveCount = app.admin_application_votes?.filter(v => v.vote === "approve").length || 0;
  const rejectCount  = app.admin_application_votes?.filter(v => v.vote === "reject").length || 0;
  const totalVotes   = app.admin_application_votes?.length || 0;
  const approvalRate = totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, padding: 20, marginBottom: 14 }}>

      {/* Applicant header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(139,92,246,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#a78bfa", flexShrink: 0, overflow: "hidden" }}>
          {app.profiles?.avatar_url
            ? <img src={app.profiles.avatar_url} alt="" style={{ width: 44, height: 44, objectFit: "cover" }} />
            : (app.profiles?.username || "?")[0].toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>{app.profiles?.username}</div>
          <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
            Score: <strong style={{ color: app.readiness_score >= 70 ? "#34d399" : "#f59e0b" }}>{app.readiness_score}%</strong>
            {" · "}Submitted {new Date(app.created_at).toLocaleDateString()}
            {totalVotes > 0 && approvalRate !== null && (
              <>{" · "}<span style={{ color: approvalRate >= 50 ? "#34d399" : "#f87171" }}>{approvalRate}% approval ({totalVotes} votes)</span></>
            )}
          </div>
        </div>
        <button onClick={() => onDetails(app.id)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#71717a", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          Details <ChevronRight size={11} />
        </button>
      </div>

      {/* Quick answer preview */}
      <div style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, marginBottom: 4 }}>WHY THEY WANT TO JOIN:</div>
        <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.5 }}>
          {app.q_why_join?.substring(0, 200)}{app.q_why_join?.length > 200 ? "…" : ""}
        </div>
      </div>

      {/* Vote buttons */}
      {done ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 12 }}>
          <Shield size={14} color="#8b5cf6" />
          <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>
            Your vote: <strong>{VOTE_OPTIONS.find(v => v.key === selected)?.label}</strong>
          </span>
          <button onClick={() => setDone(false)} style={{ marginLeft: "auto", fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer" }}>
            Change
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {VOTE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = selected === opt.key;
              return (
                <button key={opt.key} onClick={() => setSelected(opt.key)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 4px",
                    borderRadius: 10, border: `1px solid ${active ? opt.color + "50" : "rgba(255,255,255,.06)"}`,
                    background: active ? opt.bg : "rgba(255,255,255,.02)",
                    cursor: "pointer", transition: "all .15s",
                  }}>
                  <Icon size={15} color={active ? opt.color : "#52525b"} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? opt.color : "#52525b" }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Optional comment…"
              style={{ flex: 1, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "8px 12px", color: "#f4f4f5", fontSize: 12, outline: "none" }}
            />
            <button onClick={submit} disabled={loading || !selected}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 12, cursor: loading || !selected ? "default" : "pointer", background: loading || !selected ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#6d28d9,#8b5cf6)", color: loading || !selected ? "#3f3f46" : "#fff", display: "flex", alignItems: "center", gap: 5 }}>
              <Send size={12} /> {myVote ? "Update" : "Vote"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function AdminVoting() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted]     = useState({});

  const isStaff = profile?.role === "admin" || profile?.role === "super_admin";

  useEffect(() => {
    if (!isStaff) return;
    setLoading(true);
    supabase
      .from("admin_applications")
      .select(`
        id, readiness_score, created_at, q_why_join, status,
        profiles:user_id (username, avatar_url),
        admin_application_votes (vote, voter_id)
      `)
      .in("status", ["pending","under_review"])
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setApps(data || []);
        setLoading(false);
      });
  }, [isStaff]);

  const handleVoted = (appId, vote) => {
    setVoted(v => ({ ...v, [appId]: vote }));
  };

  const myVoteFor = (app) => {
    return app.admin_application_votes?.find(v => v.voter_id === profile?.id) || null;
  };

  const unvoted  = apps.filter(a => !myVoteFor(a) && !voted[a.id]);
  const votedApps = apps.filter(a => myVoteFor(a) || voted[a.id]);

  if (!isStaff) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Lock size={36} color="#3f3f46" style={{ margin: "0 auto 10px" }} />
        <p style={{ color: "#52525b" }}>Staff access required</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25,#06060f)", borderBottom: "1px solid rgba(139,92,246,.12)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(139,92,246,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={16} color="#a78bfa" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Voting Queue</h1>
            <p style={{ fontSize: 11, color: "#52525b", margin: 0 }}>
              {unvoted.length} application{unvoted.length !== 1 ? "s" : ""} awaiting your vote
            </p>
          </div>
          <button onClick={() => navigate("/admin-applications")}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#71717a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Full List <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}>
            <div style={{ width: 26, height: 26, border: "2px solid #8b5cf620", borderTop: "2px solid #8b5cf6", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Inbox size={40} color="#27272a" style={{ margin: "0 auto 14px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#52525b", marginBottom: 6 }}>No Active Applications</div>
            <p style={{ fontSize: 13, color: "#3f3f46" }}>Nothing to vote on right now. Check back later.</p>
          </div>
        ) : (
          <>
            {unvoted.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#52525b", letterSpacing: 1, marginBottom: 12 }}>
                  NEEDS YOUR VOTE ({unvoted.length})
                </div>
                <AnimatePresence mode="popLayout">
                  {unvoted.map(app => (
                    <VotingCard key={app.id} app={app} myVote={null}
                      onVoted={handleVoted}
                      onDetails={id => navigate(`/admin-application/${id}`)} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {votedApps.length > 0 && (
              <div style={{ opacity: 0.6 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#52525b", letterSpacing: 1, marginBottom: 12 }}>
                  ALREADY VOTED ({votedApps.length})
                </div>
                {votedApps.map(app => (
                  <VotingCard key={app.id} app={app} myVote={myVoteFor(app) || { vote: voted[app.id] }}
                    onVoted={handleVoted}
                    onDetails={id => navigate(`/admin-application/${id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
