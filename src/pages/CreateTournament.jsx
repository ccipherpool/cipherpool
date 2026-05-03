import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const inputCls = "w-full rounded-xl py-3 px-4 text-white text-sm outline-none transition-all";
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" };
const focusStyle = "rgba(6,182,212,0.4)";

export default function CreateTournament() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "", description: "", game_type: "battle_royale", mode: "solo",
    cs_format: "2v2", max_players: 50, entry_fee: 0, prize_coins: 500,
    start_date: "", banner_url: "", background_color: "#06b6d4"
  });

  const CS_FORMATS = {
    "1v1": { players: 2,  teams: 2, per_team: 1, label: "1 vs 1" },
    "2v2": { players: 4,  teams: 2, per_team: 2, label: "2 vs 2" },
    "4v4": { players: 8,  teams: 2, per_team: 4, label: "4 vs 4" },
  };

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleGameTypeChange = (game_type) => {
    if (game_type === "cs") {
      const fmt = CS_FORMATS[formData.cs_format];
      setFormData(p => ({ ...p, game_type, mode: "squad", max_players: fmt.players }));
    } else {
      setFormData(p => ({ ...p, game_type, mode: "solo", max_players: 50 }));
    }
  };

  const handleCsFormatChange = (cs_format) => {
    const fmt = CS_FORMATS[cs_format];
    setFormData(p => ({ ...p, cs_format, max_players: fmt.players, mode: cs_format }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("❌ Image trop grande (max 5MB)"); return; }
    if (!file.type.startsWith("image/")) { alert("❌ Veuillez uploader une image"); return; }
    setUploading(true); setUploadProgress(0);
    const interval = setInterval(() => setUploadProgress(p => p >= 90 ? (clearInterval(interval), 90) : p + 10), 200);
    const ext = file.name.split(".").pop();
    const path = `tournament-banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const { error } = await supabase.storage.from("tournament-banners").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      clearInterval(interval);
      if (error) { alert("Erreur upload: " + error.message); setUploading(false); setUploadProgress(0); return; }
      setUploadProgress(100);
      const { data } = supabase.storage.from("tournament-banners").getPublicUrl(path);
      set("banner_url", data.publicUrl);
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);
    } catch (err) { alert("Erreur inattendue"); setUploading(false); setUploadProgress(0); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { alert("❌ Le nom du tournoi est requis"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    let startDate = null;
    if (formData.start_date) {
      try { const d = new Date(formData.start_date); if (!isNaN(d.getTime())) startDate = d.toISOString(); } catch {}
    }
    const data = {
      name: formData.name.trim(), description: formData.description?.trim() || null,
      game_type: formData.game_type, mode: formData.game_type === "cs" ? formData.cs_format : formData.mode,
      cs_format: formData.game_type === "cs" ? formData.cs_format : null,
      team_size: formData.game_type === "cs" ? CS_FORMATS[formData.cs_format]?.per_team : null,
      max_players: formData.game_type === "cs" ? CS_FORMATS[formData.cs_format]?.players : parseInt(formData.max_players) || 50,
      entry_fee: parseInt(formData.entry_fee) || 0, prize_coins: parseInt(formData.prize_coins) || 500,
      start_date: startDate, banner_url: formData.banner_url || null,
      background_color: formData.background_color || "#06b6d4",
      created_by: user.id, status: "open", room_status: "registration", current_players: 0,
    };
    try {
      const { error } = await supabase.from("tournaments").insert([data]);
      if (error) alert("Erreur: " + error.message);
      else { alert("✅ Tournoi créé avec succès !"); navigate("/tournaments"); }
    } catch { alert("Erreur inattendue"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-2 font-mono">⚡ ADMIN</p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Créer un <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Tournoi</span>
        </h1>
      </motion.div>

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onSubmit={handleSubmit} className="space-y-5 rounded-2xl p-6"
        style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Name */}
        <div className="group">
          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 group-focus-within:text-cyan-500 transition-colors">Nom du tournoi *</label>
          <input value={formData.name} onChange={e => set("name", e.target.value)} required placeholder="Ex: Grand Tournoi Saison 3"
            className={inputCls} style={inputStyle}
            onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}/>
        </div>

        {/* Description */}
        <div className="group">
          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 group-focus-within:text-cyan-500 transition-colors">Description</label>
          <textarea value={formData.description} onChange={e => set("description", e.target.value)} placeholder="Règles, conditions, informations..." rows={3}
            className={inputCls} style={{ ...inputStyle, resize: "vertical" }}
            onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}/>
        </div>

        {/* Game Type */}
        <div>
          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Type de jeu *</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "battle_royale", label: "⚔️ Battle Royale", desc: "Tous contre tous" },
              { val: "cs",            label: "🛡️ Clash Squad",   desc: "Équipe vs Équipe" },
            ].map(gt => (
              <button key={gt.val} type="button" onClick={() => handleGameTypeChange(gt.val)}
                className="p-4 rounded-xl text-left transition-all"
                style={{
                  border: `1px solid ${formData.game_type === gt.val ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: formData.game_type === gt.val ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.02)",
                }}>
                <p className="text-white font-bold text-sm">{gt.label}</p>
                <p className="text-white/35 text-xs mt-1">{gt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Clash Squad Format */}
        {formData.game_type === "cs" && (
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Format Clash Squad *</label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(CS_FORMATS).map(([fmt, info]) => (
                <button key={fmt} type="button" onClick={() => handleCsFormatChange(fmt)}
                  className="p-4 rounded-xl text-center transition-all"
                  style={{
                    border: `1px solid ${formData.cs_format === fmt ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.08)"}`,
                    background: formData.cs_format === fmt ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.02)",
                  }}>
                  <p className="font-black text-2xl" style={{ color: formData.cs_format === fmt ? "#06b6d4" : "rgba(255,255,255,0.4)" }}>{info.label}</p>
                  <p className="text-white/35 text-xs mt-1">{info.teams} équipes</p>
                  <p className="text-xs font-bold mt-1" style={{ color: formData.cs_format === fmt ? "#06b6d4" : "rgba(255,255,255,0.25)" }}>{info.players} joueurs</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode (Battle Royale only) */}
        {formData.game_type === "battle_royale" && (
          <div className="group">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Mode Battle Royale *</label>
            <select value={formData.mode} onChange={e => set("mode", e.target.value)}
              className={inputCls} style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}>
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="squad">Squad (4)</option>
            </select>
          </div>
        )}

        {/* Numbers */}
        <div className="grid grid-cols-3 gap-4">
          {/* Max Players */}
          <div className="group">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Max Joueurs</label>
            {formData.game_type !== "cs" ? (
              <input type="number" value={formData.max_players} onChange={e => set("max_players", e.target.value)} min="2" max="100"
                className={inputCls} style={inputStyle}
                onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}/>
            ) : (
              <div className="py-3 px-4 rounded-xl text-center font-bold font-mono" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}>
                {formData.max_players} (auto)
              </div>
            )}
          </div>
          {/* Entry Fee */}
          <div className="group">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Frais d'entrée</label>
            <input type="number" value={formData.entry_fee} onChange={e => set("entry_fee", e.target.value)} min="0"
              className={inputCls} style={inputStyle}
              onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}/>
          </div>
          {/* Prize */}
          <div className="group">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Prize Pool *</label>
            <input type="number" value={formData.prize_coins} onChange={e => set("prize_coins", e.target.value)} min="1" required
              className={inputCls} style={inputStyle}
              onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}/>
          </div>
        </div>

        {/* Date */}
        <div className="group">
          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Date de début (optionnel)</label>
          <input type="datetime-local" value={formData.start_date} onChange={e => set("start_date", e.target.value)}
            className={inputCls} style={{ ...inputStyle, colorScheme: "dark" }}
            onFocus={e => e.target.style.borderColor = focusStyle} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}/>
        </div>

        {/* Banner */}
        <div>
          <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Bannière</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} disabled={uploading}
                className="w-full text-sm text-white/40 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:text-black file:cursor-pointer disabled:opacity-50"
                style={{ fileBackground: "linear-gradient(135deg,#06b6d4,#0891b2)" }}/>
              {uploading && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-cyan-400 font-mono">Upload... {uploadProgress}%</p>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg,#06b6d4,#0891b2)" }}/>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Couleur accent</label>
              <div className="flex items-center gap-3">
                <input type="color" value={formData.background_color} onChange={e => set("background_color", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ background: "none" }}/>
                <div className="flex gap-2">
                  {["#06b6d4", "#f97316", "#10b981", "#818cf8", "#f43f5e"].map(c => (
                    <button key={c} type="button" onClick={() => set("background_color", c)}
                      className="w-7 h-7 rounded-full border-2 transition hover:scale-110"
                      style={{ backgroundColor: c, borderColor: formData.background_color === c ? "#fff" : "transparent" }}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {formData.banner_url && !uploading && (
            <div className="relative mt-3">
              <img src={formData.banner_url} alt="Preview" className="w-full h-28 object-cover rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}/>
              <button type="button" onClick={() => set("banner_url", "")}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition"
                style={{ background: "rgba(244,63,94,0.8)" }}>✕</button>
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || uploading}
          className="w-full py-4 rounded-xl font-bold text-sm font-mono tracking-widest transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", color: "#000", boxShadow: "0 8px 30px rgba(6,182,212,0.3)" }}>
          {loading ? "Création en cours..." : uploading ? `Upload ${uploadProgress}%...` : "CRÉER LE TOURNOI"}
        </button>
      </motion.form>
    </div>
  );
}
