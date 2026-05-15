import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Plus, X, RefreshCw, Edit2, Trash2,
  Info, AlertTriangle, CheckCircle, AlertOctagon, Settings, Zap, Pin,
} from "lucide-react";

const C = {
  surface:  "rgba(23,23,32,0.95)",
  surface2: "rgba(30,30,42,0.95)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  accent:   "#6366f1",
  green:    "#10b981",
  red:      "#ef4444",
  amber:    "#f59e0b",
  purple:   "#8b5cf6",
  cyan:     "#06b6d4",
  text:     "#f4f4f5",
  text2:    "#a1a1aa",
  text3:    "#52525b",
  font:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

const TYPE_CONFIG = {
  info:        { label: "Info",        color: C.cyan,   icon: Info,         bg: "rgba(6,182,212,0.1)"   },
  warning:     { label: "Warning",     color: C.amber,  icon: AlertTriangle, bg: "rgba(245,158,11,0.1)" },
  success:     { label: "Success",     color: C.green,  icon: CheckCircle,  bg: "rgba(16,185,129,0.1)"  },
  danger:      { label: "Danger",      color: C.red,    icon: AlertOctagon, bg: "rgba(239,68,68,0.1)"   },
  maintenance: { label: "Maintenance", color: C.amber,  icon: Settings,     bg: "rgba(245,158,11,0.08)" },
  update:      { label: "Update",      color: C.accent, icon: Zap,          bg: "rgba(99,102,241,0.1)"  },
};

const EMPTY_FORM = {
  title: "", content: "", type: "info", priority: 0,
  is_pinned: false, action_label: "", action_url: "", expires_at: "",
};

export default function AnnouncementsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const showMsg = (ok, text) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setForm({ title: item.title, content: item.content, type: item.type, priority: item.priority, is_pinned: item.is_pinned, action_label: item.action_label || "", action_url: item.action_url || "", expires_at: item.expires_at ? item.expires_at.split("T")[0] : "" }); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      priority: Number(form.priority) || 0,
      is_pinned: form.is_pinned,
      action_label: form.action_label.trim() || null,
      action_url: form.action_url.trim() || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("announcements").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("announcements").insert([{ ...payload, is_active: true }]));
    }
    setSaving(false);
    if (error) { showMsg(false, error.message); return; }
    showMsg(true, editing ? "Announcement updated" : "Announcement published");
    setShowForm(false);
    fetchData();
  };

  const toggleActive = async (item) => {
    const { error } = await supabase.from("announcements").update({ is_active: !item.is_active }).eq("id", item.id);
    if (error) { showMsg(false, error.message); return; }
    fetchData();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { showMsg(false, error.message); return; }
    showMsg(true, "Deleted");
    fetchData();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ fontFamily: C.font, color: C.text }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Megaphone size={18} color={C.accent} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Announcements</h2>
            <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>Broadcast messages to all or specific users</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchData} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={openCreate} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.accent}, #818cf8)`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <Plus size={13} /> New Announcement
          </button>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: msg.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${msg.ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, color: msg.ok ? "#34d399" : "#f87171", fontSize: 13, fontWeight: 600 }}
          >
            {msg.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: C.text3 }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: C.text3 }}>
          <Megaphone size={40} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14 }}>No announcements yet. Create your first one.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
            return (
              <div key={item.id} style={{ padding: "16px 18px", borderRadius: 10, background: item.is_active ? C.surface : "rgba(15,15,22,0.5)", border: `1px solid ${item.is_active ? C.border : "rgba(255,255,255,0.04)"}`, display: "flex", alignItems: "flex-start", gap: 14, opacity: item.is_active ? 1 : 0.5 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <cfg.icon size={16} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.title}</span>
                    {item.is_pinned && <Pin size={11} color={C.amber} />}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>
                    {!item.is_active && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "rgba(82,82,91,0.2)", color: C.text3 }}>Inactive</span>}
                    {item.expires_at && new Date(item.expires_at) < new Date() && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "rgba(239,68,68,0.1)", color: C.red }}>Expired</span>}
                  </div>
                  <p style={{ fontSize: 12, color: C.text2, margin: "0 0 6px", lineHeight: 1.5 }}>{item.content}</p>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.text3 }}>
                    <span>Priority: {item.priority}</span>
                    {item.expires_at && <span>Expires: {new Date(item.expires_at).toLocaleDateString("en-GB")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(item)} title={item.is_active ? "Deactivate" : "Activate"} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: item.is_active ? C.green : C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle size={13} />
                  </button>
                  <button onClick={() => openEdit(item)} title="Edit" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => remove(item.id)} title="Delete" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={() => setShowForm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 560, background: "#111119", border: `1px solid ${C.border2}`, borderRadius: 16, padding: "24px", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{editing ? "Edit Announcement" : "New Announcement"}</h3>
                <button onClick={() => setShowForm(false)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Content *</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder="Announcement message..." style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, resize: "vertical", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none" }}>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Priority</label>
                    <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} placeholder="0" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Expires At (optional)</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: "#0c0c15", color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box", colorScheme: "dark" }} />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} style={{ accentColor: C.accent }} />
                  <span style={{ fontSize: 13, color: C.text2 }}>Pin this announcement (appears first)</span>
                </label>

                <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={save} disabled={saving || !form.title.trim() || !form.content.trim()} style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: form.title.trim() && form.content.trim() && !saving ? `linear-gradient(135deg, ${C.accent}, #818cf8)` : "rgba(30,30,42,0.9)", color: form.title.trim() && form.content.trim() && !saving ? "#fff" : C.text3, fontSize: 13, fontWeight: 700, cursor: form.title.trim() && form.content.trim() && !saving ? "pointer" : "not-allowed" }}>
                    {saving ? "Saving..." : editing ? "Update" : "Publish"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
