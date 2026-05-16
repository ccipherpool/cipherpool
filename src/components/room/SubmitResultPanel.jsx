import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Upload, Trophy, Crosshair, CheckCircle, Clock, AlertCircle, Users, X } from "lucide-react";

// BR placement points table
const BR_PTS = { 1:12, 2:9, 3:8, 4:7, 5:6, 6:5, 7:4, 8:3, 9:2, 10:1 };

function calcPoints(rank, kills) {
  const r = parseInt(rank) || 0;
  const k = parseInt(kills) || 0;
  return (BR_PTS[r] || 0) + k;
}

export default function SubmitResultPanel({ tournament, tournamentId, userId, onClose, onSubmitted, mandatory = false }) {
  const [tData, setTData]     = useState(tournament || null);
  const [placement, setPlacement] = useState("");
  const [kills, setKills]     = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);
  const [existing, setExisting] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [expectedCount, setExpectedCount]   = useState(0);
  const [verifying, setVerifying] = useState(false);

  const tid = tData?.id || tournamentId;

  // Fetch tournament data
  useEffect(() => {
    if (tData?.id) return;
    if (!tid) return;
    supabase.from("tournaments").select("id,name,game_type,mode,max_players,cs_format,prize_coins")
      .eq("id", tid).maybeSingle()
      .then(({ data }) => { if (data) setTData(data); });
  }, [tid]);

  // Check if already submitted + get submission count
  useEffect(() => {
    if (!tid || !userId) return;
    // Check own submission
    supabase.from("match_results").select("id,placement,kills,points,status,submitted_at")
      .eq("tournament_id", tid).eq("user_id", userId).maybeSingle()
      .then(({ data }) => {
        if (data) { setExisting(data); setDone(true); }
      });

    // Get submission progress
    Promise.all([
      supabase.from("match_results").select("*", { count: "exact", head: true }).eq("tournament_id", tid),
      supabase.from("room_members").select("*", { count: "exact", head: true }).eq("tournament_id", tid),
    ]).then(([subs, members]) => {
      setSubmissionCount(subs.count || 0);
      setExpectedCount(members.count || tData?.max_players || 0);
    });

    // Subscribe to new submissions
    const ch = supabase.channel("submissions_" + tid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_results",
        filter: `tournament_id=eq.${tid}` }, () => {
        setSubmissionCount(n => n + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments",
        filter: `id=eq.${tid}` }, (payload) => {
        if (["auto_verified","completed"].includes(payload.new?.status)) {
          setVerifying(false);
        }
        if (payload.new?.status === "verifying") setVerifying(true);
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [tid, userId]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError("Max file size: 8MB"); return; }
    if (!f.type.startsWith("image/")) { setError("Image files only"); return; }
    setScreenshot(f); setPreview(URL.createObjectURL(f)); setError("");
  };

  const handleSubmit = async () => {
    setError("");
    const pNum = parseInt(placement);
    const kNum = parseInt(kills);
    const maxP = tData?.max_players || 12;

    if (!pNum || pNum < 1 || pNum > maxP)        return setError(`Rank must be 1–${maxP}`);
    if (kills === "" || kNum < 0 || kNum > 99)   return setError("Kills must be 0–99");
    if (!screenshot)                              return setError("Screenshot is required");

    setLoading(true);
    setUploadProgress(10);

    try {
      // Step 1: Upload screenshot to Supabase Storage
      const ext  = screenshot.name.split(".").pop();
      const path = `${tid}/${userId}_${Date.now()}.${ext}`;
      setUploadProgress(30);

      const { error: upErr } = await supabase.storage
        .from("screenshots")
        .upload(path, screenshot, { upsert: true, contentType: screenshot.type });
      if (upErr) throw new Error("Upload failed: " + upErr.message);
      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
      const screenshotUrl = urlData?.publicUrl;
      if (!screenshotUrl) throw new Error("Could not get screenshot URL");

      // Step 2: Call server-authoritative RPC
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("submit_match_result", {
        p_tournament_id:  tid,
        p_rank:           pNum,
        p_kills:          kNum,
        p_screenshot_url: screenshotUrl,
      });
      setUploadProgress(100);

      if (rpcErr) throw new Error(rpcErr.message);
      if (rpcResult && !rpcResult.success) {
        if (rpcResult.already_submitted) {
          setDone(true);
          return;
        }
        throw new Error(rpcResult.error || "Submission failed");
      }

      setDone(true);
      setSubmissionCount(rpcResult?.submitted || submissionCount + 1);
      setExpectedCount(rpcResult?.expected || expectedCount);
      if (rpcResult?.all_submitted) setVerifying(true);
      if (onSubmitted) onSubmitted(rpcResult);
    } catch (e) {
      setError(e.message || "Submission failed. Try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const pts    = calcPoints(placement, kills);
  const coins  = pts * 10;
  const maxP   = tData?.max_players || 12;
  const progress = expectedCount > 0 ? (submissionCount / expectedCount) * 100 : 0;

  // ─── Already submitted / verifying state ──────────────────
  if (done || existing) {
    const st = existing?.status || "pending";
    return (
      <div style={OVL} onClick={mandatory ? undefined : onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={MOD} onClick={e => e.stopPropagation()}
        >
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            {verifying ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  style={{ width: 56, height: 56, border: "3px solid #6366f130", borderTop: "3px solid #6366f1", borderRadius: "50%", margin: "0 auto 16px" }} />
                <div style={{ fontSize: 18, fontWeight: 800, color: "#818cf8" }}>Verifying All Results…</div>
                <div style={{ color: "#52525b", fontSize: 12, marginTop: 8 }}>
                  System is comparing all player submissions
                </div>
              </>
            ) : (
              <>
                <CheckCircle size={52} color="#10b981" style={{ margin: "0 auto 16px", display: "block" }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>Result Submitted!</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
                  {st === "auto_verified"
                    ? "✅ Auto-verified by the system"
                    : st === "disputed"
                    ? "⚠️ Under review by admin"
                    : "Waiting for admin verification"}
                </div>
                {existing && (
                  <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
                    <Chip label={`Rank #${existing.placement}`} color="#f59e0b" />
                    <Chip label={`${existing.kills} kills`} color="#06b6d4" />
                    <Chip label={`${existing.points} pts`} color="#8b5cf6" />
                  </div>
                )}
              </>
            )}

            {/* Submission progress */}
            <div style={{ marginTop: 24, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#52525b", fontWeight: 600 }}>PLAYER SUBMISSIONS</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a1a1aa" }}>
                  {submissionCount} / {expectedCount || "?"}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #6366f1, #10b981)" }}
                />
              </div>
              {submissionCount >= expectedCount && expectedCount > 0 && (
                <div style={{ fontSize: 11, color: "#10b981", marginTop: 6, fontWeight: 600 }}>
                  ✓ All players submitted — verifying now
                </div>
              )}
            </div>

            {!mandatory && (
              <button onClick={onClose} style={{ ...BTN, marginTop: 16, background: "rgba(255,255,255,0.06)" }}>
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Submission Form ──────────────────────────────────────
  return (
    <div style={OVL} onClick={mandatory ? undefined : onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        style={MOD} onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
              {mandatory ? "⚠️ REQUIRED" : "Optional"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", marginTop: 2 }}>
              Submit Match Result
            </div>
            {tData?.name && <div style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>{tData.name}</div>}
          </div>
          {!mandatory && (
            <button onClick={onClose} style={CBTN}><X size={14} /></button>
          )}
        </div>

        {mandatory && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} color="#ef4444" />
            <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 600 }}>
              Submit your result to unlock access to tournaments and rewards
            </span>
          </div>
        )}

        {/* Submission Progress Bar */}
        <div style={{ marginBottom: 20, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={12} color="#52525b" />
              <span style={{ fontSize: 11, color: "#52525b", fontWeight: 600 }}>SUBMISSIONS</span>
            </div>
            <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 700 }}>
              {submissionCount} / {expectedCount || maxP}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, borderRadius: 3, background: "#6366f1", transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Rank */}
        <Field label={`🏆 YOUR RANK (1–${maxP})`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {Array.from({ length: Math.min(maxP, 12) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPlacement(String(n))}
                style={{
                  padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                  background: placement === String(n)
                    ? n === 1 ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)"
                    : "rgba(255,255,255,0.04)",
                  color: placement === String(n)
                    ? n === 1 ? "#f59e0b" : "#818cf8"
                    : "#52525b",
                  borderColor: placement === String(n)
                    ? n === 1 ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.4)"
                    : "transparent",
                  outline: placement === String(n) ? `1px solid ${n === 1 ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.4)"}` : "none",
                }}
              >
                {n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : `#${n}`}
              </button>
            ))}
          </div>
        </Field>

        {/* Kills */}
        <Field label="🔫 KILLS">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setKills(k => String(Math.max(0, (parseInt(k) || 0) - 1)))}
              style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#a1a1aa", cursor: "pointer", fontSize: 18 }}>
              −
            </button>
            <input
              type="number" min="0" max="99" value={kills}
              onChange={e => setKills(e.target.value)}
              placeholder="0"
              style={{ ...INP, flex: 1, textAlign: "center", fontSize: 20, fontWeight: 800 }}
            />
            <button onClick={() => setKills(k => String(Math.min(99, (parseInt(k) || 0) + 1)))}
              style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#a1a1aa", cursor: "pointer", fontSize: 18 }}>
              +
            </button>
          </div>
        </Field>

        {/* Points Preview */}
        {placement && kills !== "" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}
          >
            <div style={{ fontSize: 10, color: "#52525b", marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>PREVIEW</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{pts}</div>
                <div style={{ fontSize: 10, color: "#52525b" }}>POINTS</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>+{coins}</div>
                <div style={{ fontSize: 10, color: "#52525b" }}>EST. CP</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Screenshot Upload */}
        <Field label="📸 SCREENSHOT (REQUIRED)">
          <div
            onClick={() => document.getElementById("ss-inp").click()}
            style={{
              border: `2px dashed ${preview ? "rgba(16,185,129,0.5)" : "rgba(99,102,241,0.3)"}`,
              borderRadius: 10, padding: 16, textAlign: "center",
              background: "rgba(0,0,0,0.2)", cursor: "pointer", minHeight: 90,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s",
            }}
          >
            {preview ? (
              <div style={{ width: "100%", position: "relative" }}>
                <img src={preview} alt="" style={{ maxHeight: 140, borderRadius: 8, objectFit: "contain", maxWidth: "100%" }} />
                <button
                  onClick={e => { e.stopPropagation(); setScreenshot(null); setPreview(null); }}
                  style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} color="#6366f1" style={{ marginBottom: 8 }} />
                <div style={{ color: "#52525b", fontSize: 13 }}>Click to upload screenshot</div>
                <div style={{ color: "#3f3f46", fontSize: 11, marginTop: 4 }}>Max 8MB · JPG, PNG, WebP</div>
              </>
            )}
          </div>
          <input id="ss-inp" type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </Field>

        {/* Upload progress */}
        {loading && uploadProgress > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${uploadProgress}%` }}
                style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", borderRadius: 3 }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#52525b", marginTop: 4, textAlign: "center" }}>
              {uploadProgress < 70 ? "Uploading screenshot…" : "Submitting to server…"}
            </div>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !placement || kills === "" || !screenshot}
          style={{
            ...BTN,
            opacity: (loading || !placement || kills === "" || !screenshot) ? 0.5 : 1,
            cursor: (loading || !placement || kills === "" || !screenshot) ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Submitting…" : "🚀 Submit Result"}
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: "#3f3f46", marginTop: 10 }}>
          Results are verified server-side. Cheating is detected automatically.
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <div style={{ padding: "4px 12px", borderRadius: 20, background: `${color}18`, border: `1px solid ${color}30`, fontSize: 12, fontWeight: 700, color }}>
      {label}
    </div>
  );
}

const OVL = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999,
  display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 };
const MOD = { background: "linear-gradient(160deg, #0f0f1a, #0c0c18)", border: "1px solid rgba(99,102,241,0.25)",
  borderRadius: 18, padding: 24, width: 480, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
  boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.08)" };
const INP  = { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 16, outline: "none", boxSizing: "border-box" };
const BTN  = { width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: 800, fontSize: 15,
  boxShadow: "0 4px 20px rgba(99,102,241,0.3)" };
const CBTN = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, width: 28, height: 28, color: "#6b7280", cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center", flexShrink: 0 };
