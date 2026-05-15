import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Clock, CheckCircle, XCircle, AlertCircle, Search,
  ChevronRight, ThumbsUp, ThumbsDown, Minus, MessageSquare,
  User, RefreshCw, Filter,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_CONFIG = {
  pending:      { label: "Pending",      color: "text-amber-400",  bg: "bg-amber-400/10  border-amber-400/20",  icon: Clock         },
  under_review: { label: "Under Review", color: "text-blue-400",   bg: "bg-blue-400/10   border-blue-400/20",   icon: Shield        },
  approved:     { label: "Approved",     color: "text-emerald-400",bg: "bg-emerald-400/10 border-emerald-400/20",icon: CheckCircle   },
  rejected:     { label: "Rejected",     color: "text-red-400",    bg: "bg-red-400/10    border-red-400/20",    icon: XCircle       },
  on_hold:      { label: "On Hold",      color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", icon: AlertCircle   },
};

const TABS = [
  { key: null,          label: "All"          },
  { key: "pending",     label: "Pending"      },
  { key: "under_review",label: "Under Review" },
  { key: "approved",    label: "Approved"     },
  { key: "rejected",    label: "Rejected"     },
  { key: "on_hold",     label: "On Hold"      },
];

const SCORE_COLOR = (s) => s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-red-400";

function Avatar({ url, name, size = 36 }) {
  if (url) return (
    <img src={url} alt={name} className="rounded-full object-cover"
      style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white bg-violet-600/40"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function VoteBadges({ approve, reject, neutral }) {
  const total = approve + reject + neutral;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="flex items-center gap-0.5 text-emerald-400">
        <ThumbsUp size={11} /> {approve}
      </span>
      <span className="flex items-center gap-0.5 text-red-400">
        <ThumbsDown size={11} /> {reject}
      </span>
      {neutral > 0 && (
        <span className="flex items-center gap-0.5 text-zinc-500">
          <Minus size={11} /> {neutral}
        </span>
      )}
      {total > 0 && (
        <span className="text-zinc-600 ml-0.5">({total})</span>
      )}
    </div>
  );
}

function AppRow({ app, onClick }) {
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const approveCount = app.votes?.filter(v => v.vote === "approve").length || 0;
  const rejectCount  = app.votes?.filter(v => v.vote === "reject").length || 0;
  const neutralCount = app.votes?.filter(v => v.vote === "neutral" || v.vote === "request_info").length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onClick={onClick}
      className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5
        hover:bg-white/[0.04] hover:border-violet-500/20 cursor-pointer transition-all duration-200"
    >
      <Avatar url={app.profiles?.avatar_url} name={app.profiles?.username} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-zinc-100 truncate">
            {app.profiles?.username || "Unknown"}
          </span>
          {app.profiles?.role && app.profiles.role !== "user" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 uppercase tracking-wide">
              {app.profiles.role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-zinc-500">
            {new Date(app.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"2-digit" })}
          </span>
          <VoteBadges approve={approveCount} reject={rejectCount} neutral={neutralCount} />
          {app.admin_application_notes?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-zinc-600">
              <MessageSquare size={10} /> {app.admin_application_notes.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className={`text-lg font-black ${SCORE_COLOR(app.readiness_score)}`}>
            {app.readiness_score}
          </div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wide">Score</div>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
          <Icon size={11} /> {cfg.label}
        </div>

        <ChevronRight size={15} className="text-zinc-600 group-hover:text-violet-400 transition-colors" />
      </div>
    </motion.div>
  );
}

export default function AdminApplications() {
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(null);
  const [search, setSearch]   = useState("");
  const [counts, setCounts]   = useState({});

  const canAccess = profile?.role === "admin" || profile?.role === "super_admin";

  const loadApps = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("admin_applications")
      .select(`
        id, user_id, status, readiness_score, created_at, updated_at,
        vote_score, vote_count, requested_role, assigned_reviewer,
        final_decision_at, admin_note,
        profiles:user_id (username, avatar_url, role, created_at),
        admin_application_votes (vote, voter_id),
        admin_application_notes (id)
      `)
      .order("created_at", { ascending: false });

    if (tab) q = q.eq("status", tab);

    const { data } = await q;
    setApps(data || []);
    setLoading(false);
  }, [tab]);

  // Count per status
  useEffect(() => {
    if (!canAccess) return;
    supabase.from("admin_applications").select("status")
      .then(({ data }) => {
        if (!data) return;
        const c = {};
        data.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
        setCounts(c);
      });
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    loadApps();
  }, [canAccess, loadApps]);

  const filtered = apps.filter(a =>
    !search || a.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <Shield size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Staff access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white">Admin Applications</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Review and vote on staff applications</p>
            </div>
            <button onClick={loadApps}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5
                text-zinc-400 hover:text-white hover:bg-white/8 transition-all text-xs">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {TABS.map(t => {
              const count = t.key ? counts[t.key] : Object.values(counts).reduce((a,b)=>a+b,0);
              return (
                <button key={t.key || "all"} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all
                    ${tab === t.key
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}>
                  {t.label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black
                      ${tab === t.key ? "bg-violet-500/30 text-violet-300" : "bg-white/5 text-zinc-600"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5
              text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Filter size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No applications found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {filtered.map(app => (
                <AppRow
                  key={app.id}
                  app={app}
                  onClick={() => navigate(`/admin-application/${app.id}`)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
