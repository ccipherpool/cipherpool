import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { Crown, Calendar, Trophy, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   SuperAdmin → SeasonsManager
   - View current active season + history
   - Start new season with reset preferences (modal)
   - Super admin only (route protected)
   ───────────────────────────────────────────────────────────── */

const RESET_OPTIONS = [
  { key: "reset_coins",       label: "Pièces (CP)",          desc: "Tous les wallets reviennent à 0", danger: true },
  { key: "reset_xp",          label: "XP & Niveaux",         desc: "Tous les joueurs reviennent au level 1", danger: true },
  { key: "reset_wins",        label: "Victoires & Points",   desc: "Wins, K/D, points de classement", danger: true },
  { key: "reset_tournaments", label: "Tournois en cours",    desc: "Archive les tournois actifs", danger: true },
  { key: "reset_chat",        label: "Chat Global",          desc: "Efface tous les messages du chat", danger: false },
  { key: "reset_avatars",     label: "Avatars équipés",      desc: "Retire les avatars achetés", danger: false },
  { key: "reset_clans",       label: "Stats des Clans",      desc: "Points/wins des clans à 0", danger: false },
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
    const { data, error } = await supabase.rpc("start_new_season", {
      p_name: form.name.trim(),
      p_description: form.description.trim() || null,
      p_reset_coins:       form.reset_coins,
      p_reset_xp:          form.reset_xp,
      p_reset_wins:        form.reset_wins,
      p_reset_avatars:     form.reset_avatars,
      p_reset_chat:        form.reset_chat,
      p_reset_tournaments: form.reset_tournaments,
      p_reset_clans:       form.reset_clans,
    });
    setSubmitting(false);
    if (error || data?.success === false) {
      setResult({ ok: false, msg: error?.message || data?.error || "Erreur inconnue" });
    } else {
      setResult({ ok: true, msg: `✅ Saison ${data?.season_number} lancée avec succès` });
      setShowModal(false);
      setConfirmText("");
      setForm({ ...form, name: "", description: "" });
      fetchData();
    }
  };

  return (
    <div className="space-y-6" data-testid="seasons-manager">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/super-admin")}
          className="w-9 h-9 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center hover:text-white"
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black text-white uppercase tracking-tight">
            <Crown className="inline -mt-1 mr-2 text-orange-400" size={26} />
            Gestion des Saisons
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Lance une nouvelle saison et choisis ce qui doit être réinitialisé
          </p>
        </div>
      </div>

      {result?.ok === false && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={18} /> {result.msg}
        </div>
      )}
      {result?.ok && (
        <div className="p-4 rounded-xl bg-mint/10 border border-mint/30 text-mint text-sm flex items-center gap-2">
          <CheckCircle2 size={18} /> {result.msg}
        </div>
      )}

      {/* Active season card */}
      <div className="rounded-2xl border border-mint/20 p-6 bg-gradient-to-br from-mint/5 to-transparent" data-testid="active-season-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-mint mb-2">SAISON ACTIVE</p>
            {active ? (
              <>
                <h2 className="text-3xl font-heading font-black text-white">
                  Saison {active.number} · {active.name}
                </h2>
                {active.description && (
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl">{active.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Lancée le {new Date(active.starts_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </>
            ) : (
              <p className="text-slate-500">Aucune saison active. Crée-en une !</p>
            )}
          </div>
          <button
            data-testid="start-season-btn"
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-2xl bg-orange-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_30px_-8px_rgba(249,115,22,.6)] active:scale-95 transition-transform shrink-0"
          >
            🚀 Lancer une nouvelle saison
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">Historique</h3>
        {loading ? (
          <p className="text-slate-500 text-sm">Chargement…</p>
        ) : seasons.filter(s => s.status === "ended").length === 0 ? (
          <p className="text-slate-500 text-sm italic">Aucune saison passée</p>
        ) : (
          <div className="space-y-2">
            {seasons.filter(s => s.status === "ended").map(s => (
              <div key={s.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">Saison {s.number} · {s.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(s.starts_at).toLocaleDateString("fr-FR")} → {s.ended_at ? new Date(s.ended_at).toLocaleDateString("fr-FR") : "—"}
                  </p>
                </div>
                <Trophy size={18} className="text-cyber-gold" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL : Start new season ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
          data-testid="start-season-modal"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-2xl bg-[#0a0a1f] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 max-h-[92vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-white mb-1">🚀 Nouvelle Saison</h2>
            <p className="text-xs text-slate-500 mb-5">
              ⚠️ Cette action <strong>termine la saison actuelle</strong> et démarre une nouvelle.
              Les stats actuelles seront sauvegardées dans les snapshots.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Nom de la saison *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Saison 2 — Cyber Wars"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Description (optionnel)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Le thème, les objectifs, les nouveautés…"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Ce qui sera réinitialisé</label>
                <div className="space-y-2">
                  {RESET_OPTIONS.map(opt => (
                    <label
                      key={opt.key}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        form[opt.key]
                          ? "bg-orange-500/5 border-orange-500/30"
                          : "bg-white/[0.02] border-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form[opt.key]}
                        onChange={(e) => setForm({ ...form, [opt.key]: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          {opt.label}
                          {opt.danger && form[opt.key] && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                              DESTRUCTIF
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-xs font-bold text-red-300 mb-2">
                  ⚠️ Pour confirmer, écris "CONFIRMER" :
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Tape CONFIRMER"
                  className="w-full bg-white/[0.03] border border-red-500/30 rounded-xl px-4 py-2 text-sm text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowModal(false); setConfirmText(""); }}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 font-bold text-xs uppercase tracking-widest"
                >
                  Annuler
                </button>
                <button
                  onClick={startNewSeason}
                  disabled={!form.name.trim() || confirmText !== "CONFIRMER" || submitting}
                  className={`flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    form.name.trim() && confirmText === "CONFIRMER" && !submitting
                      ? "bg-orange-500 text-white shadow-[0_0_24px_-8px_rgba(249,115,22,.6)] active:scale-95"
                      : "bg-white/5 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {submitting ? "Lancement…" : "🚀 Démarrer la saison"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
