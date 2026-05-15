import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, ThumbsUp, ThumbsDown, MessageSquare, Plus, Filter,
  Search, ChevronDown, CheckCircle, Clock, X, Send, Trophy,
  Flame, Star, AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "gameplay", label: "Gameplay" },
  { value: "ui_ux", label: "UI/UX" },
  { value: "rewards", label: "Rewards" },
  { value: "social", label: "Social" },
  { value: "security", label: "Security" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

const STATUS_META = {
  pending:      { label: "Pending",      color: "#71717a", bg: "rgba(113,113,122,.12)" },
  under_review: { label: "Under Review", color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  planned:      { label: "Planned",      color: "#6366f1", bg: "rgba(99,102,241,.12)" },
  approved:     { label: "Approved",     color: "#10b981", bg: "rgba(16,185,129,.12)" },
  rejected:     { label: "Rejected",     color: "#ef4444", bg: "rgba(239,68,68,.12)" },
  completed:    { label: "Completed",    color: "#06b6d4", bg: "rgba(6,182,212,.12)" },
};

const SORTS = [
  { value: "votes", label: "Top Voted" },
  { value: "new",   label: "Newest" },
  { value: "hot",   label: "Hot" },
];

export default function IdeasPage({ userId }) {
  const [ideas, setIdeas]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState("all");
  const [sort, setSort]         = useState("votes");
  const [search, setSearch]     = useState("");
  const [myVotes, setMyVotes]   = useState({});  // { ideaId: 1|-1 }
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null); // detail view

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("community_ideas_feed").select("*");
    if (category !== "all") q = q.eq("category", category);
    if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    if (sort === "votes") q = q.order("vote_score", { ascending: false });
    else if (sort === "new") q = q.order("created_at", { ascending: false });
    else q = q.order("comment_count", { ascending: false }).order("vote_score", { ascending: false });
    const { data } = await q.limit(50);
    setIdeas(data || []);
    setLoading(false);
  }, [category, sort, search]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  // Load user's votes
  useEffect(() => {
    if (!userId) return;
    supabase.from("feature_votes").select("request_id,vote").eq("user_id", userId)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(v => { map[v.request_id] = v.vote; });
        setMyVotes(map);
      });
  }, [userId]);

  const handleVote = async (ideaId, vote) => {
    if (!userId) return;
    const { data } = await supabase.rpc("vote_feature", { p_request_id: ideaId, p_vote: vote });
    if (data?.success) {
      setIdeas(prev => prev.map(idea => {
        if (idea.id !== ideaId) return idea;
        const prev_vote = myVotes[ideaId] || 0;
        let delta = vote;
        if (prev_vote === vote) delta = -vote;         // toggle off
        else if (prev_vote !== 0) delta = vote * 2;    // changed
        return {
          ...idea,
          vote_score: idea.vote_score + delta,
          upvotes:   idea.upvotes   + (vote === 1  ? (prev_vote === 1  ? -1 : 1) : (prev_vote === 1  ? -1 : 0)),
          downvotes: idea.downvotes + (vote === -1 ? (prev_vote === -1 ? -1 : 1) : (prev_vote === -1 ? -1 : 0)),
        };
      }));
      setMyVotes(prev => {
        const updated = { ...prev };
        if (updated[ideaId] === vote) delete updated[ideaId];
        else updated[ideaId] = vote;
        return updated;
      });
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25 0%,#06060f 100%)", borderBottom: "1px solid rgba(99,102,241,.15)", padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lightbulb size={18} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#f4f4f5" }}>Ideas & Voting</h1>
              <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>Shape the future of CipherPool</p>
            </div>
            {userId && (
              <button
                onClick={() => setShowForm(true)}
                style={{ marginLeft: "auto", padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#818cf8)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Plus size={14} /> Submit Idea
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
              <Search size={13} color="#52525b" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ideas…"
                style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "8px 12px 8px 30px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {SORTS.map(s => (
                <button key={s.value} onClick={() => setSort(s.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${sort === s.value ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`, background: sort === s.value ? "rgba(99,102,241,.12)" : "transparent", color: sort === s.value ? "#818cf8" : "#52525b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${category === c.value ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.06)"}`, background: category === c.value ? "rgba(99,102,241,.12)" : "transparent", color: category === c.value ? "#818cf8" : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ideas list */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, border: "2px solid #6366f130", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : ideas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Lightbulb size={40} color="#27272a" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#3f3f46", fontSize: 14 }}>No ideas found. Be the first!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ideas.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={i}
                myVote={myVotes[idea.id]}
                onVote={handleVote}
                onClick={() => setSelected(idea)}
                userId={userId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit idea modal */}
      <AnimatePresence>
        {showForm && (
          <SubmitIdeaModal
            userId={userId}
            onClose={() => setShowForm(false)}
            onSuccess={() => { setShowForm(false); fetchIdeas(); }}
          />
        )}
      </AnimatePresence>

      {/* Idea detail modal */}
      <AnimatePresence>
        {selected && (
          <IdeaDetailModal
            idea={selected}
            myVote={myVotes[selected.id]}
            onVote={handleVote}
            onClose={() => setSelected(null)}
            userId={userId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function IdeaCard({ idea, index, myVote, onVote, onClick, userId }) {
  const status = STATUS_META[idea.status] || STATUS_META.pending;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={onClick}
      style={{
        display: "flex", gap: 14, padding: "14px 16px", borderRadius: 12,
        background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)",
        cursor: "pointer", transition: "all .15s",
      }}
      className="hover:border-indigo-500/20 hover:bg-white/[0.03]"
    >
      {/* Vote column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 40 }}
        onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onVote(idea.id, 1)}
          disabled={!userId}
          style={{ width: 32, height: 28, borderRadius: 7, border: `1px solid ${myVote === 1 ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.08)"}`, background: myVote === 1 ? "rgba(16,185,129,.12)" : "transparent", color: myVote === 1 ? "#10b981" : "#52525b", cursor: userId ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s" }}
        >
          <ThumbsUp size={13} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 800, color: idea.vote_score > 0 ? "#10b981" : idea.vote_score < 0 ? "#ef4444" : "#52525b" }}>
          {idea.vote_score}
        </span>
        <button
          onClick={() => onVote(idea.id, -1)}
          disabled={!userId}
          style={{ width: 32, height: 28, borderRadius: 7, border: `1px solid ${myVote === -1 ? "rgba(239,68,68,.4)" : "rgba(255,255,255,.08)"}`, background: myVote === -1 ? "rgba(239,68,68,.12)" : "transparent", color: myVote === -1 ? "#ef4444" : "#52525b", cursor: userId ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s" }}
        >
          <ThumbsDown size={13} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5" }}>{idea.title}</span>
          {idea.reward_given && <Trophy size={12} color="#f59e0b" />}
        </div>
        <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
          {idea.description}
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: status.bg, color: status.color, fontWeight: 700 }}>
            {status.label}
          </span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,.04)", color: "#52525b", fontWeight: 600 }}>
            {idea.category?.replace("_", "/")}
          </span>
          <span style={{ fontSize: 11, color: "#3f3f46", display: "flex", alignItems: "center", gap: 3 }}>
            <MessageSquare size={10} /> {idea.comment_count}
          </span>
          <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>
            by @{idea.author_username}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SubmitIdeaModal({ userId, onClose, onSuccess }) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async () => {
    setError("");
    if (title.trim().length < 10) return setError("Title must be at least 10 characters");
    if (desc.trim().length < 30)  return setError("Description must be at least 30 characters");
    setLoading(true);
    const { data } = await supabase.rpc("submit_feature_request", {
      p_title: title.trim(), p_description: desc.trim(), p_category: category,
    });
    setLoading(false);
    if (data?.success) onSuccess();
    else setError(data?.error || "Failed to submit");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: "linear-gradient(160deg,#0f0f1a,#0c0c18)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 18, padding: 24, width: 500, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Lightbulb size={18} color="#818cf8" />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>Submit an Idea</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 6 }}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={150}
            placeholder="Clear, concise idea title (min 10 chars)"
            style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <div style={{ textAlign: "right", fontSize: 10, color: "#3f3f46", marginTop: 2 }}>{title.length}/150</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 6 }}>CATEGORY</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CATEGORIES.filter(c => c.value !== "all").map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${category === c.value ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`, background: category === c.value ? "rgba(99,102,241,.12)" : "transparent", color: category === c.value ? "#818cf8" : "#52525b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 6 }}>DESCRIPTION</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={2000} rows={5}
            placeholder="Describe your idea in detail. What problem does it solve? How should it work? (min 30 chars)"
            style={{ width: "100%", background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
          <div style={{ textAlign: "right", fontSize: 10, color: "#3f3f46", marginTop: 2 }}>{desc.length}/2000</div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 12, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#a16207", marginBottom: 14 }}>
          💡 Approved ideas earn <strong style={{ color: "#f59e0b" }}>100 CP</strong> + contribute to your Admin Readiness Score
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: loading ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,#6366f1,#818cf8)", color: loading ? "#3f3f46" : "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {loading ? "Submitting…" : <><Send size={14} /> Submit Idea</>}
        </button>
      </motion.div>
    </div>
  );
}

function IdeaDetailModal({ idea, myVote, onVote, onClose, userId }) {
  const [comments, setComments] = useState([]);
  const [loadingCmts, setLoadingCmts] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const status = STATUS_META[idea.status] || STATUS_META.pending;

  useEffect(() => {
    supabase.from("feature_comments")
      .select("*, profiles!user_id(username, avatar_url)")
      .eq("request_id", idea.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => { setComments(data || []); setLoadingCmts(false); });
  }, [idea.id]);

  const submitComment = async () => {
    if (!newComment.trim() || !userId) return;
    setSubmitting(true);
    const { data } = await supabase.rpc("comment_feature", {
      p_request_id: idea.id, p_content: newComment.trim(),
    });
    if (data?.success) {
      setNewComment("");
      const { data: fresh } = await supabase
        .from("feature_comments")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("request_id", idea.id).eq("is_deleted", false)
        .order("created_at", { ascending: true });
      setComments(fresh || []);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: "linear-gradient(160deg,#0f0f1a,#0c0c18)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 18, padding: 24, width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: status.bg, color: status.color, fontWeight: 700 }}>
            {status.label}
          </span>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} />
          </button>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f4f4f5", margin: "0 0 10px" }}>{idea.title}</h2>
        <p style={{ fontSize: 13, color: "#71717a", lineHeight: 1.6, margin: "0 0 16px" }}>{idea.description}</p>

        {idea.admin_note && (
          <div style={{ background: "rgba(6,182,212,.06)", border: "1px solid rgba(6,182,212,.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#67e8f9", marginBottom: 14 }}>
            📌 Admin note: {idea.admin_note}
          </div>
        )}

        {/* Vote row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <button onClick={() => onVote(idea.id, 1)} disabled={!userId}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${myVote === 1 ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.08)"}`, background: myVote === 1 ? "rgba(16,185,129,.12)" : "transparent", color: myVote === 1 ? "#10b981" : "#52525b", cursor: userId ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>
            <ThumbsUp size={13} /> {idea.upvotes}
          </button>
          <button onClick={() => onVote(idea.id, -1)} disabled={!userId}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${myVote === -1 ? "rgba(239,68,68,.4)" : "rgba(255,255,255,.08)"}`, background: myVote === -1 ? "rgba(239,68,68,.12)" : "transparent", color: myVote === -1 ? "#ef4444" : "#52525b", cursor: userId ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>
            <ThumbsDown size={13} /> {idea.downvotes}
          </button>
          <span style={{ fontSize: 11, color: "#3f3f46", marginLeft: "auto" }}>
            by @{idea.author_username} · {idea.category?.replace("_", "/")}
          </span>
        </div>

        {/* Comments */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#52525b", letterSpacing: 1, marginBottom: 10 }}>
          COMMENTS ({idea.comment_count})
        </div>

        {loadingCmts ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#3f3f46", fontSize: 12 }}>Loading…</div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#3f3f46", fontSize: 12 }}>No comments yet. Be the first!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,.02)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{c.profiles?.username?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>@{c.profiles?.username}</div>
                  <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.5 }}>{c.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {userId && (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newComment} onChange={e => setNewComment(e.target.value)} maxLength={500}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()}
              placeholder="Add a comment…"
              style={{ flex: 1, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "9px 12px", color: "#f4f4f5", fontSize: 13, outline: "none" }} />
            <button onClick={submitComment} disabled={submitting || !newComment.trim()}
              style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "rgba(99,102,241,.15)", color: "#818cf8", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Send size={13} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
