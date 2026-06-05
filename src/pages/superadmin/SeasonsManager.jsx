import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Calendar, Trophy, AlertTriangle, CheckCircle2, ArrowLeft, Zap, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import SeasonResetManager from "../../components/season/SeasonResetManager";

export default function SeasonsManager() {
  const navigate = useNavigate();
  const [seasons, setSeasons]     = useState([]);
  const [active, setActive]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [successMsg, setSuccessMsg]   = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: all } = await supabase
      .from("seasons")
      .select("*")
      .order("number", { ascending: false });
    setSeasons(all || []);
    setActive((all || []).find(s => s.status === "active") || null);
    setLoading(false);
  };

  const handleSuccess = (data) => {
    setShowManager(false);
    setSuccessMsg(`✅ Season ${data?.season_number} launched — "${data?.season_name || "New Season"}" is now active.`);
    fetchData();
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-10 p-4 md:p-8" data-testid="seasons-manager">
      {/* Header */}
      <div className="flex items-center gap-6 rotate-[-0.5deg]">
        <button
          onClick={() => navigate("/super-admin")}
          className="w-12 h-12 rounded-full border-2 border-zinc-900 dark:border-white bg-white dark:bg-zinc-900 flex items-center justify-center hover:scale-110 transition-transform shadow-[4px_4px_0px_0px] shadow-zinc-900 dark:shadow-white"
          aria-label="Retour"
        >
          <ArrowLeft size={24} className="text-zinc-900 dark:text-white" />
        </button>
        <div>
          <h1 className="text-3xl md:text-5xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Crown className="text-amber-500" size={40} />
            Season Management 👑
          </h1>
          <p className="font-handwritten text-2xl text-zinc-500 mt-1">
            Launch new seasons and configure platform-wide resets ✨
          </p>
        </div>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-2xl bg-green-100 border-2 border-green-500 text-green-700 font-handwritten text-2xl flex items-center gap-4 rotate-[1deg] shadow-[4px_4px_0px_0px] shadow-green-500"
          >
            <CheckCircle2 size={32} /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active season card */}
      <div className="card-creative p-8 bg-white dark:bg-zinc-900 rotate-[0.5deg]" data-testid="active-season-card">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border-2 border-zinc-900 dark:border-white bg-green-400 text-zinc-900 font-handwritten text-xl rotate-[-2deg] mb-4">
              <Zap size={20} /> ACTIVE SEASON
            </div>
            {active ? (
              <>
                <h2 className="text-4xl md:text-6xl font-handwritten font-bold text-zinc-900 dark:text-white leading-tight">
                  Season {active.number} · <span className="text-blue-500 underline decoration-wavy">{active.name}</span>
                </h2>
                {active.description && (
                  <p className="font-handwritten text-2xl text-zinc-600 dark:text-zinc-400 mt-4 max-w-2xl">{active.description}</p>
                )}
                <div className="flex items-center gap-6 mt-6 text-xl font-handwritten text-zinc-500">
                  <span className="flex items-center gap-2">
                    <Calendar size={20} /> Started {new Date(active.start_date).toLocaleDateString()}
                  </span>
                  {active.reset_config && Object.values(active.reset_config).filter(Boolean).length > 0 && (
                    <span className="flex items-center gap-2 text-amber-500">
                      <RefreshCw size={16} /> {Object.values(active.reset_config).filter(Boolean).length} systems were reset
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="font-handwritten text-3xl text-zinc-400">No active season. Create one! 🛸</p>
            )}
          </div>
          <button
            data-testid="start-season-btn"
            onClick={() => setShowManager(true)}
            className="btn-creative bg-amber-400 text-zinc-900 hover:bg-amber-300 text-2xl px-8 py-4 rotate-2 flex items-center gap-2"
          >
            🚀 Launch New Season
          </button>
        </div>
      </div>

      {/* Season history */}
      <div className="space-y-6">
        <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Trophy size={32} className="text-amber-500" /> Season History 📜
        </h3>
        {loading ? (
          <p className="font-handwritten text-2xl text-zinc-400 italic">Loading… 📡</p>
        ) : seasons.filter(s => s.status === "completed").length === 0 ? (
          <p className="font-handwritten text-2xl text-zinc-400 italic">No past seasons 🌌</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasons.filter(s => s.status === "completed").map((s, i) => (
              <div key={s.id} className={cn(
                "card-creative p-6 flex flex-col justify-between group bg-white dark:bg-zinc-900",
                i % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 text-amber-500 flex items-center justify-center font-handwritten text-2xl shadow-[2px_2px_0px_0px] shadow-zinc-900">
                    {s.number}
                  </div>
                  <Sparkles size={24} className="text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <p className="font-handwritten text-2xl font-bold text-zinc-900 dark:text-white">{s.name}</p>
                  <p className="font-handwritten text-lg text-zinc-500 mt-2">
                    {new Date(s.start_date).toLocaleDateString()} → {s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}
                  </p>
                  {s.reset_config && Object.values(s.reset_config).filter(Boolean).length > 0 && (
                    <p className="font-handwritten text-base text-amber-500 mt-1 flex items-center gap-1">
                      <RefreshCw size={12} /> {Object.values(s.reset_config).filter(Boolean).length} systems reset
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Season Reset Manager overlay */}
      <AnimatePresence>
        {showManager && (
          <SeasonResetManager
            onClose={() => setShowManager(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
