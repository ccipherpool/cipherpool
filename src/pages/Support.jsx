import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Plus, Send, ChevronLeft, Search, AlertCircle,
  HelpCircle, Trophy, Coins, ShieldCheck, Bug, X, CheckCheck, Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   CipherPool Support — Professional helpdesk (mobile-first)
   - Mobile: 2-pane navigation (list → detail slide-in)
   - Desktop: split view (list left, conversation right)
   - Status badges, category icons, smart timestamps
   - Quick-action FAQ cards for first-time users
   ───────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { value: "general",     label: "Question générale",  icon: HelpCircle,  color: "#06b6d4" },
  { value: "tournament",  label: "Tournois",            icon: Trophy,     color: "#f59e0b" },
  { value: "billing",     label: "Pièces & Achats",     icon: Coins,      color: "#a855f7" },
  { value: "account",     label: "Compte & Sécurité",   icon: ShieldCheck, color: "#10b981" },
  { value: "bug",         label: "Bug / Anomalie",      icon: Bug,        color: "#ef4444" },
];

const STATUS_STYLES = {
  open:    { label: "Ouvert",   color: "#10b981", bg: "rgba(16,185,129,.15)" },
  pending: { label: "En cours", color: "#f59e0b", bg: "rgba(245,158,11,.15)" },
  closed:  { label: "Fermé",    color: "#64748b", bg: "rgba(100,116,139,.15)" },
};

const FAQS = [
  { q: "Comment rejoindre un tournoi ?", a: "Va dans la section Tournois, choisis un tournoi 'Ouvert', et clique 'Rejoindre'. Les frais d'inscription seront déduits de ton wallet." },
  { q: "Comment retirer mes pièces ?",   a: "Pour le moment, les pièces CP sont utilisables uniquement dans la boutique CipherPool. Le retrait via partenaires sera bientôt disponible." },
  { q: "Mon résultat n'a pas été validé", a: "Les résultats sont vérifiés manuellement par nos admins sous 24h. Si plus de 24h se sont écoulées, crée un ticket avec ta preuve (screenshot)." },
  { q: "J'ai été banni par erreur",      a: "Crée un ticket dans 'Compte & Sécurité' avec ton ID Free Fire et explique ta situation. Nous reviendrons vers toi sous 48h." },
];

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `Il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff/3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff/86400)}j`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function timeShort(d) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Support() {
  const { profile } = useOutletContext() || {};
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "general", body: "" });
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (profile?.id) fetchTickets(); /* eslint-disable-next-line */ }, [profile?.id]);
  useEffect(() => { if (selected) fetchMessages(selected.id); }, [selected]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const fetchMessages = async (ticketId) => {
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id, ticket_id, sender_id, message, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (!msgs?.length) { setMessages([]); return; }
    const ids = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, username, full_name, role, avatar_url").in("id", ids)
      : { data: [] };
    const pm = Object.fromEntries((profs || []).map(p => [p.id, p]));
    setMessages(msgs.map(m => ({ ...m, sender: pm[m.sender_id] || null })));
  };

  const createTicket = async () => {
    if (!form.subject.trim() || creating) return;
    setCreating(true);
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert([{
        user_id: profile.id,
        subject: form.subject.trim(),
        category: form.category,
        status: "open",
      }])
      .select()
      .single();

    if (!error && ticket) {
      if (form.body.trim()) {
        await supabase.from("support_messages").insert([{
          ticket_id: ticket.id,
          sender_id: profile.id,
          message: form.body.trim(),
        }]);
      }
      setShowCreate(false);
      setForm({ subject: "", category: "general", body: "" });
      await fetchTickets();
      setSelected(ticket);
    }
    setCreating(false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected || sending) return;
    setSending(true);
    const txt = newMsg.trim();
    setNewMsg("");
    const { error } = await supabase.from("support_messages").insert([{
      ticket_id: selected.id,
      sender_id: profile.id,
      message: txt,
    }]);
    if (!error) await fetchMessages(selected.id);
    setSending(false);
  };

  const filteredTickets = tickets.filter(t =>
    !search || t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const getCategory = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[0];

  return (
    <div data-testid="support-page" className="flex flex-col gap-4 md:gap-6">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-heading font-black text-white uppercase tracking-tight">
            Centre de <span className="text-mint">support</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            On est là pour t'aider · Réponse sous 24h
          </p>
        </div>
        <button
          data-testid="new-ticket-btn"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-mint text-obsidian font-black text-xs uppercase tracking-widest shadow-neon-mint active:scale-95 transition-transform shrink-0"
        >
          <Plus size={16} strokeWidth={3} />
          <span className="hidden sm:inline">Nouveau ticket</span>
          <span className="sm:hidden">Ticket</span>
        </button>
      </div>

      {/* ── FAQ Quick Cards (only when no ticket selected on mobile) ── */}
      {!selected && tickets.length === 0 && (
        <div data-testid="faq-section" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 hover:border-mint/20 transition-colors"
            >
              <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                <span className="text-sm font-bold text-white">{f.q}</span>
                <span className="text-mint text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-xs text-slate-400 leading-relaxed mt-3 pt-3 border-t border-white/5">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      )}

      {/* ── MAIN — Tickets list + conversation ── */}
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 md:min-h-[60vh]">

        {/* ── TICKETS LIST ── */}
        <div
          data-testid="ticket-list"
          className={`flex flex-col gap-3 ${selected ? "hidden md:flex" : "flex"}`}
        >
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un ticket…"
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/30"
            />
          </div>

          {/* List */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[70vh] pr-1">
            {loading && (
              <div className="text-center py-8 text-slate-500 text-xs">Chargement…</div>
            )}

            {!loading && filteredTickets.length === 0 && (
              <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl">
                <MessageSquare size={32} className="mx-auto text-slate-700 mb-3" />
                <p className="text-sm font-bold text-white mb-1">Aucun ticket</p>
                <p className="text-xs text-slate-500 px-4">
                  Crée ton premier ticket si tu as besoin d'aide
                </p>
              </div>
            )}

            {filteredTickets.map(t => {
              const cat = getCategory(t.category);
              const st = STATUS_STYLES[t.status] || STATUS_STYLES.open;
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`ticket-card-${t.id}`}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    active
                      ? "bg-mint/10 border-mint/30 shadow-[0_0_24px_-8px_rgba(16,185,129,0.4)]"
                      : "bg-white/[0.03] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}
                    >
                      <cat.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm truncate">{t.subject}</h4>
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ background: st.bg, color: st.color }}
                        >{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{cat.label}</span>
                        <span>·</span>
                        <Clock size={10} />
                        <span>{timeAgo(t.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CONVERSATION ── */}
        <div
          data-testid="ticket-conversation"
          className={`flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden ${
            selected ? "flex" : "hidden md:flex"
          }`}
          style={{ minHeight: "60vh", maxHeight: "calc(100vh - 12rem)" }}
        >
          {selected ? (
            <>
              {/* Conversation header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02] sticky top-0 z-10">
                <button
                  onClick={() => setSelected(null)}
                  className="md:hidden w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white"
                  aria-label="Retour"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{selected.subject}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                      style={{
                        background: STATUS_STYLES[selected.status]?.bg,
                        color: STATUS_STYLES[selected.status]?.color,
                      }}
                    >{STATUS_STYLES[selected.status]?.label}</span>
                    <span className="text-[10px] text-slate-500">{getCategory(selected.category).label}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="ticket-messages">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Notre équipe va te répondre rapidement. Continue à donner plus de détails ↓
                  </div>
                )}
                {messages.map((m) => {
                  const isMe = m.sender_id === profile?.id;
                  const isStaff = m.sender?.role && m.sender.role !== "user";
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && isStaff && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-mint mb-1 px-2">
                            🛡 Équipe CipherPool
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMe
                              ? "bg-mint text-obsidian rounded-br-md"
                              : isStaff
                              ? "bg-mint/10 border border-mint/20 text-white rounded-bl-md"
                              : "bg-white/5 border border-white/5 text-white rounded-bl-md"
                          }`}
                        >
                          {m.message}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-2">
                          <span className="text-[10px] text-slate-500">{timeShort(m.created_at)}</span>
                          {isMe && <CheckCheck size={11} className="text-mint" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              {selected.status !== "closed" ? (
                <div className="p-3 border-t border-white/5 bg-white/[0.02] sticky bottom-0">
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-2 pl-4"
                  >
                    <textarea
                      data-testid="ticket-message-input"
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Écris ta réponse…"
                      rows={1}
                      className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder:text-slate-600 py-1.5 max-h-24"
                    />
                    <button
                      type="submit"
                      data-testid="ticket-send-btn"
                      disabled={!newMsg.trim() || sending}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                        newMsg.trim()
                          ? "bg-mint text-obsidian shadow-neon-mint active:scale-95"
                          : "bg-white/5 text-slate-600"
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-4 border-t border-white/5 text-center text-xs text-slate-500 bg-white/[0.02]">
                  Ce ticket est fermé. Crée un nouveau ticket si tu as besoin d'aide.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
                <MessageSquare size={36} className="text-slate-700" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sélectionne un ticket</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Choisis un ticket dans la liste pour voir la conversation, ou crée-en un nouveau.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE TICKET MODAL ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
            className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/70 backdrop-blur-sm"
            data-testid="create-ticket-modal"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:max-w-lg bg-[#0a0a1f] border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">Nouveau ticket</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Catégorie
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => {
                      const active = form.category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm({ ...form, category: c.value })}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                            active
                              ? "bg-mint/10 border-mint/40"
                              : "bg-white/[0.03] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <c.icon size={16} style={{ color: c.color }} />
                          <span className="text-xs font-bold text-white">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Sujet *
                  </label>
                  <input
                    data-testid="ticket-subject-input"
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Ex: Mon résultat n'est pas validé"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    data-testid="ticket-body-input"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Donne le plus de détails possible…"
                    rows={4}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/40 resize-none"
                  />
                </div>

                <button
                  data-testid="ticket-submit-btn"
                  onClick={createTicket}
                  disabled={!form.subject.trim() || creating}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    form.subject.trim() && !creating
                      ? "bg-mint text-obsidian shadow-neon-mint active:scale-[0.98]"
                      : "bg-white/5 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {creating ? "Création…" : "Créer le ticket"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
