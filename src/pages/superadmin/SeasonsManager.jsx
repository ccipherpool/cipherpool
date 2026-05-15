import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";
import { Crown, Calendar, Trophy, AlertTriangle, CheckCircle2, ArrowLeft, Zap, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

/* ─────────────────────────────────────────────────────────────
   SuperAdmin → SeasonsManager
   - View current active season + history
   - Start new season with reset preferences (modal)
   - Super admin only (route protected)
   ───────────────────────────────────────────────────────────── */

const RESET_OPTIONS = [
  { key: "reset_coins",       label: "Pièces (CP)",          desc: "Tous les wallets reviennent à 0", danger: true, icon: "💰" },
  { key: "reset_xp",          label: "XP & Niveaux",         desc: "Tous les joueurs reviennent au level 1", danger: true, icon: "🆙" },
  { key: "reset_wins",        label: "Victoires & Points",   desc: "Wins, K/D, points de classement", danger: true, icon: "🏆" },
  { key: "reset_tournaments", label: "Tournois en cours",    desc: "Archive les tournois actifs", danger: true, icon: "🎮" },
  { key: "reset_chat",        label: "Chat Global",          desc: "Efface tous les messages du chat", danger: false, icon: "💬" },
  { key: "reset_avatars",     label: "Avatars équipés",      desc: "Retire les avatars achetés", danger: false, icon: "👤" },
  { key: "reset_clans",       label: "Stats des Clans",      desc: "Points/wins des clans à 0", danger: false, icon: "🛡️" },
];

export default function SeasonsManager() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    reset_coins: true,
    reset_xp: true,
    reset_wins: true,
    reset_avatars: false,
    reset_chat: true,
    reset_tournaments: true,
    reset_clans: false,
  });
  const [confirmText, setConfirmText] = useState("");

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

  const startNewSeason = async () => {
    if (!form.name.trim() || submitting || confirmText !== "CONFIRMER") return;
    setSubmitting(true);
    setResult(null);
    try {
      // Canonical call — matches the single start_new_season(text,integer,text,bool×8) function.
      // All 11 params are named explicitly so PostgREST never hits an ambiguity.
      const { data, error } = await supabase.rpc("start_new_season", {
        p_name:              form.name.trim(),
        p_number:            null,                        // auto-computed by the function
        p_description:       form.description.trim() || null,
        p_reset_coins:       form.reset_coins,
        p_reset_xp:          form.reset_xp,
        p_reset_stats:       form.reset_wins,             // merged with p_reset_wins inside SQL
        p_reset_wins:        form.reset_wins,
        p_reset_avatars:     form.reset_avatars,
        p_reset_chat:        form.reset_chat,
        p_reset_tournaments: form.reset_tournaments,
        p_reset_clans:       form.reset_clans,
      });

      if (error) throw new Error(error.message);
      if (data?.success === false) throw new Error(data?.error || "Erreur inconnue");

      setResult({ ok: true, msg: `✅ Saison ${data?.season_number} lancée avec succès` });
      setShowModal(false);
      setConfirmText("");
      setForm({ ...form, name: "", description: "" });
      fetchData();
    } catch (err) {
      setResult({ ok: false, msg: err.message || "Erreur lors de la création de la saison" });
    } finally {
      setSubmitting(false);
    }
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
            Gestion des Saisons 👑
          </h1>
          <p className="font-handwritten text-2xl text-zinc-500 mt-1">
            Lance une nouvelle saison et choisis ce qui doit être réinitialisé ✨
          </p>
        </div>
      </div>

      {result?.ok === false && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-red-100 border-2 border-red-500 text-red-700 font-handwritten text-2xl flex items-center gap-4 rotate-[-1deg] shadow-[4px_4px_0px_0px] shadow-red-500"
        >
          <AlertTriangle size={32} /> {result.msg}
        </motion.div>
      )}
      {result?.ok && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-green-100 border-2 border-green-500 text-green-700 font-handwritten text-2xl flex items-center gap-4 rotate-[1deg] shadow-[4px_4px_0px_0px] shadow-green-500"
        >
          <CheckCircle2 size={32} /> {result.msg}
        </motion.div>
      )}

      {/* Active season card */}
      <div className="card-creative p-8 bg-white dark:bg-zinc-900 rotate-[0.5deg]" data-testid="active-season-card">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border-2 border-zinc-900 dark:border-white bg-green-400 text-zinc-900 font-handwritten text-xl rotate-[-2deg] mb-4">
              <Zap size={20} /> SAISON ACTIVE
            </div>
            {active ? (
              <>
                <h2 className="text-4xl md:text-6xl font-handwritten font-bold text-zinc-900 dark:text-white leading-tight">
                  Saison {active.number} · <span className="text-blue-500 underline decoration-wavy">{active.name}</span>
                </h2>
                {active.description && (
                  <p className="font-handwritten text-2xl text-zinc-600 dark:text-zinc-400 mt-4 max-w-2xl">{active.description}</p>
                )}
                <div className="flex items-center gap-6 mt-6 text-xl font-handwritten text-zinc-500">
                  <span className="flex items-center gap-2"><Calendar size={20} /> Lancée le {new Date(active.start_date).toLocaleDateString("fr-FR")}</span>
                </div>
              </>
            ) : (
              <p className="font-handwritten text-3xl text-zinc-400">Aucune saison active. Crée-en une ! 🛸</p>
            )}
          </div>
          <button
            data-testid="start-season-btn"
            onClick={() => setShowModal(true)}
            className="btn-creative bg-amber-400 text-zinc-900 hover:bg-amber-300 text-2xl px-8 py-4 rotate-2"
          >
            🚀 Lancer une nouvelle saison
          </button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-6">
        <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Trophy size={32} className="text-amber-500" /> Historique 📜
        </h3>
        {loading ? (
          <p className="font-handwritten text-2xl text-zinc-400 italic">Chargement… 📡</p>
        ) : seasons.filter(s => s.status === "completed").length === 0 ? (
          <p className="font-handwritten text-2xl text-zinc-400 italic">Aucune saison passée 🌌</p>
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
                    {new Date(s.start_date).toLocaleDateString("fr-FR")} → {s.end_date ? new Date(s.end_date).toLocaleDateString("fr-FR") : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL : Start new season ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
          onClick={() => setShowModal(false)}
          data-testid="start-season-modal"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, rotate: -2 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.9, y: 20, rotate: 2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-white rounded-[2rem] p-8 max-h-[92vh] overflow-y-auto shadow-[12px_12px_0px_0px] shadow-zinc-900 dark:shadow-white relative"
          >
            <div className="absolute -top-6 -right-6 text-6xl rotate-12 drop-shadow-lg">✨</div>
            <div className="absolute -bottom-6 -left-6 text-6xl -rotate-12 drop-shadow-lg">✏️</div>

            <h2 className="text-4xl font-handwritten font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-3">
              🚀 Nouvelle Saison 
            </h2>
            <p className="font-handwritten text-xl text-zinc-600 dark:text-zinc-400 mb-8">
              ⚠️ Cette action <span className="text-red-500 font-bold underline decoration-wavy">termine la saison actuelle</span> et démarre une nouvelle.
              Les stats actuelles seront sauvegardées dans les archives. 📦
            </p>

            <div className="space-y-8">
              <div>
                <label className="block font-handwritten text-2xl text-zinc-900 dark:text-white mb-3">Nom de la saison *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Saison 2 — Cyber Wars"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-white rounded-xl px-6 py-4 font-handwritten text-2xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-handwritten text-2xl text-zinc-900 dark:text-white mb-3">Description (optionnel) 📝</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Le thème, les objectifs, les nouveautés…"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-white rounded-xl px-6 py-4 font-handwritten text-2xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block font-handwritten text-2xl text-zinc-900 dark:text-white mb-4">Ce qui sera réinitialisé 🧹</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {RESET_OPTIONS.map((opt, idx) => (
                    <label
                      key={opt.key}
                      className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all",
                        form[opt.key]
                          ? "bg-amber-100 border-amber-500 dark:bg-amber-900/30"
                          : "bg-zinc-50 dark:bg-zinc-800 border-transparent hover:border-zinc-900 dark:hover:border-white",
                        idx % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form[opt.key]}
                        onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                        className="mt-1 w-6 h-6 accent-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-handwritten text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          {opt.icon} {opt.label}
                          {opt.danger && form[opt.key] && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                              DANGER
                            </span>
                          )}
                        </p>
                        <p className="font-handwritten text-lg text-zinc-500 mt-1">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-500 rotate-[-1deg]">
                <p className="font-handwritten text-2xl font-bold text-red-600 mb-4">
                  ⚠️ Pour confirmer, écris "CONFIRMER" :
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Tape CONFIRMER"
                  className="w-full bg-white dark:bg-zinc-900 border-2 border-red-500 rounded-xl px-6 py-4 font-handwritten text-2xl text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-6 pt-4">
                <button
                  onClick={() => { setShowModal(false); setConfirmText(""); }}
                  className="flex-1 btn-creative bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rotate-[-2deg] text-2xl py-4"
                >
                  Annuler
                </button>
                <button
                  onClick={startNewSeason}
                  disabled={!form.name.trim() || confirmText !== "CONFIRMER" || submitting}
                  className={cn(
                    "flex-[2] btn-creative text-2xl py-4 rotate-2",
                    form.name.trim() && confirmText === "CONFIRMER" && !submitting
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none"
                  )}
                >
                  {submitting ? "Lancement…" : "🚀 Démarrer la saison !"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

