import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Upload, CheckCircle, AlertCircle, Users, X, Clock, Shield, Trophy, Crosshair, ImageIcon } from "lucide-react";

const BR_PTS = { 1:15, 2:12, 3:10, 4:8, 5:7, 6:6, 7:5, 8:4, 9:3, 10:2 };
const calcPoints = (rank, kills) => {
  const r = parseInt(rank);
  const placePts = r >= 1 && r <= 10 ? (BR_PTS[r] || 0) : r > 10 ? 1 : 0;
  return placePts + (parseInt(kills) || 0);
};

async function hashFile(file) {
  try {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
  } catch { return null; }
}

function useDeadlineCountdown(deadline) {
  const [secs, setSecs] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = Math.max(0, Math.round((new Date(deadline) - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return secs;
}

export default function SubmitResultPanel({
  tournamentId, userId, matchId, deadline, matchNumber, onClose, onSubmitted, mandatory = false,
}) {
  const [tournament, setTournament] = useState(null);
  const [placement, setPlacement]   = useState("");
  const [kills, setKills]           = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);
  const [existing, setExisting]     = useState(null);
  const [progress, setProgress]     = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [expectedCount, setExpectedCount]     = useState(0);
  const [verifying, setVerifying]   = useState(false);
  const [fetchedMatchId, setFetchedMatchId] = useState(null);
  const fileRef = useRef(null);

  // When matchId isn't passed (participant's browser), fetch the active match from DB
  useEffect(() => {
    if (matchId || !tournamentId) return;
    supabase
      .from("tournament_matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data?.id) setFetchedMatchId(data.id); });
  }, [tournamentId, matchId]);

  const effectiveMatchId = matchId || fetchedMatchId;

  const secsLeft = useDeadlineCountdown(deadline);
  const isExpired = deadline && secsLeft === 0;

  useEffect(() => {
    if (!tournamentId) return;
    supabase.from("tournaments").select("id,name,game_type,mode,max_players").eq("id", tournamentId).maybeSingle()
      .then(({ data }) => { if (data) setTournament(data); });
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId || !userId) return;
    supabase.from("match_results").select("id,placement,kills,points,status,submitted_at")
      .eq("tournament_id", tournamentId).eq("user_id", userId)
      .then(({ data }) => {
        const row = effectiveMatchId ? data?.find(r => r.match_id === effectiveMatchId) : data?.[0];
        if (row) { setExisting(row); setDone(true); }
      });

    Promise.all([
      supabase.from("match_results").select("*", { count:"exact", head:true }).eq("tournament_id", tournamentId),
      supabase.from("room_members").select("*", { count:"exact", head:true }).eq("tournament_id", tournamentId),
    ]).then(([subs, members]) => {
      setSubmissionCount(subs.count || 0);
      setExpectedCount(members.count || tournament?.max_players || 0);
    });

    const ch = supabase.channel("submit_" + tournamentId)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"match_results",
        filter: `tournament_id=eq.${tournamentId}` }, () => setSubmissionCount(n => n + 1))
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"tournaments",
        filter: `id=eq.${tournamentId}` }, ({ new: t }) => {
          if (["auto_verified","completed"].includes(t?.status)) setVerifying(false);
          if (t?.status === "verifying") setVerifying(true);
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [tournamentId, userId, matchId]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("Max file size: 10MB"); return; }
    if (!["image/jpeg","image/png","image/webp"].includes(f.type))
      return setError("PNG, JPG or WebP only");
    setScreenshot(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    const pNum = parseInt(placement);
    const kNum = parseInt(kills);
    const maxP = tournament?.max_players || 12;
    if (!pNum || pNum < 1 || pNum > maxP) return setError(`Rank must be 1–${maxP}`);
    if (kills === "" || kNum < 0 || kNum > 99) return setError("Kills: 0–99");
    if (!screenshot) return setError("Screenshot is required");
    if (isExpired) return setError("Submission deadline has passed");

    setLoading(true); setProgress(10);
    try {
      const hash = await hashFile(screenshot);
      const ext  = screenshot.name.split(".").pop() || "jpg";
      const path = `${tournamentId}/${userId}_${effectiveMatchId || "m0"}_${Date.now()}.${ext}`;
      setProgress(30);

      const { error: upErr } = await supabase.storage.from("screenshots")
        .upload(path, screenshot, { upsert: true, contentType: screenshot.type });
      if (upErr) throw new Error("Upload failed: " + upErr.message);
      setProgress(65);

      const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
      const url = urlData?.publicUrl;
      if (!url) throw new Error("Could not get screenshot URL");

      const { data: result, error: rpcErr } = await supabase.rpc("submit_match_result", {
        p_tournament_id:  tournamentId,
        p_rank:           pNum,
        p_kills:          kNum,
        p_screenshot_url: url,
        p_match_id:       effectiveMatchId || null,
        p_image_hash:     hash || null,
      });
      setProgress(100);

      if (rpcErr) throw new Error(rpcErr.message);
      if (result && !result.success) {
        if (result.already_submitted) { setDone(true); return; }
        throw new Error(result.error || "Submission failed");
      }

      setDone(true);
      if (result?.submitted) setSubmissionCount(result.submitted);
      if (result?.expected)  setExpectedCount(result.expected);
      if (result?.all_submitted) setVerifying(true);
      if (onSubmitted) onSubmitted(result);
    } catch (e) {
      setError(e.message || "Submission failed. Try again.");
    } finally {
      setLoading(false); setProgress(0);
    }
  };

  const pts   = calcPoints(placement, kills);
  const maxP  = tournament?.max_players || 12;
  const pct   = expectedCount > 0 ? (submissionCount / expectedCount) * 100 : 0;
  const fmtSecs = (s) => s == null ? null : `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const urgency = secsLeft != null ? secsLeft < 120 ? "#ef4444" : secsLeft < 300 ? "#f59e0b" : "#10b981" : "#10b981";

  // ── Submitted / Verifying state ──────────────────────────────────
  if (done || existing) {
    const st = existing?.status || "pending";
    return (
      <div style={S.ovl} onClick={mandatory ? undefined : onClose}>
        <motion.div initial={{ scale:.9,opacity:0 }} animate={{ scale:1,opacity:1 }}
          style={S.mod} onClick={e => e.stopPropagation()}>
          {!mandatory && <button onClick={onClose} style={S.close}><X size={14}/></button>}
          <div style={{ textAlign:"center", padding:"28px 16px" }}>
            {verifying ? (
              <>
                <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1.4, ease:"linear" }}
                  style={{ width:52,height:52,border:"3px solid rgba(99,102,241,0.2)",borderTop:"3px solid #6366f1",borderRadius:"50%",margin:"0 auto 16px" }}/>
                <div style={{ fontSize:17,fontWeight:800,color:"#818cf8" }}>Verifying Results…</div>
                <div style={{ color:"#52525b",fontSize:12,marginTop:6 }}>System is comparing all player screenshots</div>
              </>
            ) : (
              <>
                <CheckCircle size={48} color="#10b981" style={{ margin:"0 auto 14px",display:"block" }}/>
                <div style={{ fontSize:19,fontWeight:800,color:"#10b981" }}>Result Submitted!</div>
                <div style={{ color:"#6b7280",fontSize:13,marginTop:6 }}>
                  {st==="auto_verified" ? "✅ Auto-verified by the system"
                   : st==="disputed"    ? "⚠️ Under review by admin"
                   : "⏳ Waiting for verification"}
                </div>
                {existing && (
                  <div style={{ marginTop:14,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
                    <Chip label={`Rank #${existing.placement}`} color="#f59e0b"/>
                    <Chip label={`${existing.kills} kills`} color="#06b6d4"/>
                    <Chip label={`${existing.points} pts`} color="#8b5cf6"/>
                  </div>
                )}
              </>
            )}
            {/* Progress */}
            <div style={{ marginTop:22,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"14px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
                <span style={{ fontSize:10,color:"#52525b",fontWeight:700,letterSpacing:1 }}>SUBMISSIONS</span>
                <span style={{ fontSize:12,fontWeight:700,color:"#a1a1aa" }}>{submissionCount} / {expectedCount||"?"}</span>
              </div>
              <div style={{ height:5,borderRadius:4,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
                <motion.div animate={{ width:`${pct}%` }}
                  style={{ height:"100%",borderRadius:4,background:"linear-gradient(90deg,#6366f1,#10b981)" }}/>
              </div>
              {submissionCount >= expectedCount && expectedCount > 0 && (
                <div style={{ fontSize:11,color:"#10b981",marginTop:5,fontWeight:600 }}>✓ All submitted — verifying now</div>
              )}
            </div>
            {!mandatory && (
              <button onClick={onClose} style={{ ...S.btn,marginTop:14,background:"rgba(255,255,255,0.06)" }}>Close</button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Submission Form ───────────────────────────────────────────────
  return (
    <div style={S.ovl} onClick={mandatory ? undefined : onClose}>
      <motion.div initial={{ scale:.92,opacity:0,y:20 }} animate={{ scale:1,opacity:1,y:0 }}
        style={S.mod} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <Trophy size={15} color="#f59e0b"/>
              <span style={{ fontSize:15,fontWeight:800,color:"#f4f4f5" }}>
                Submit Result {matchNumber ? `— Match ${matchNumber}` : ""}
              </span>
            </div>
            {tournament?.name && <div style={{ fontSize:11,color:"#52525b",marginTop:2 }}>{tournament.name}</div>}
          </div>
          {!mandatory && <button onClick={onClose} style={S.close}><X size={14}/></button>}
        </div>

        {/* Deadline banner */}
        {deadline && secsLeft != null && (
          <div style={{ marginBottom:14,padding:"9px 13px",borderRadius:9,
            background: isExpired ? "rgba(239,68,68,0.1)" : `${urgency}12`,
            border:`1px solid ${isExpired ? "rgba(239,68,68,0.3)" : urgency+"30"}`,
            display:"flex",alignItems:"center",gap:8 }}>
            <Clock size={13} color={isExpired ? "#ef4444" : urgency}/>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:12,fontWeight:700,color:isExpired?"#ef4444":urgency }}>
                {isExpired ? "⛔ Deadline Passed" : `⏱ ${fmtSecs(secsLeft)} left to submit`}
              </span>
              {!isExpired && secsLeft < 120 && (
                <span style={{ fontSize:10,color:"#ef4444",marginLeft:8 }}>Hurry!</span>
              )}
            </div>
          </div>
        )}

        {/* Expired */}
        {isExpired && (
          <div style={{ textAlign:"center",padding:"24px 0",color:"#52525b" }}>
            <Clock size={36} style={{ margin:"0 auto 10px",opacity:.4,display:"block" }}/>
            <div style={{ fontSize:14,fontWeight:700,color:"#ef4444" }}>Submission Window Closed</div>
            <div style={{ fontSize:12,marginTop:5 }}>The 15-minute window for this match has passed.</div>
          </div>
        )}

        {!isExpired && (<>
          {/* Anti-cheat notice */}
          <div style={{ marginBottom:14,padding:"7px 11px",borderRadius:8,background:"rgba(99,102,241,0.06)",
            border:"1px solid rgba(99,102,241,0.14)",display:"flex",alignItems:"center",gap:7 }}>
            <Shield size={11} color="#6366f1"/>
            <span style={{ fontSize:10.5,color:"#818cf8" }}>
              Screenshots are verified & cross-checked. Each player must upload their own.
            </span>
          </div>

          {/* Submission progress */}
          <div style={{ marginBottom:16,background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"11px 13px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ fontSize:10,color:"#52525b",fontWeight:700,letterSpacing:1 }}>SUBMISSIONS</span>
              <span style={{ fontSize:11,color:"#a1a1aa",fontWeight:700 }}>{submissionCount} / {expectedCount||maxP}</span>
            </div>
            <div style={{ height:4,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${pct}%`,borderRadius:3,background:"#6366f1",transition:"width .4s" }}/>
            </div>
          </div>

          {/* Rank grid */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10,color:"#52525b",fontWeight:700,letterSpacing:1,marginBottom:8 }}>🏆 YOUR PLACEMENT</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:5 }}>
              {Array.from({ length:Math.min(maxP,12) },(_,i)=>i+1).map(n => (
                <button key={n} onClick={() => setPlacement(String(n))} style={{
                  padding:"8px 4px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,
                  background: placement===String(n) ? n===1?"rgba(245,158,11,0.25)":"rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                  color: placement===String(n) ? n===1?"#f59e0b":"#818cf8" : "#52525b",
                  outline: placement===String(n) ? `1px solid ${n===1?"rgba(245,158,11,0.4)":"rgba(99,102,241,0.35)"}` : "none",
                  transition:"all .1s",
                }}>
                  {n===1?"🥇":n===2?"🥈":n===3?"🥉":`#${n}`}
                </button>
              ))}
            </div>
          </div>

          {/* Kills */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10,color:"#52525b",fontWeight:700,letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:5 }}>
              <Crosshair size={10}/> KILLS
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <button onClick={() => setKills(k=>String(Math.max(0,(parseInt(k)||0)-1)))} style={S.killBtn}>−</button>
              <input type="number" min="0" max="99" value={kills} onChange={e=>setKills(e.target.value)}
                placeholder="0"
                style={{ flex:1,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,
                  padding:"10px",color:"#e2e8f0",fontSize:20,fontWeight:800,outline:"none",textAlign:"center",boxSizing:"border-box" }}/>
              <button onClick={() => setKills(k=>String(Math.min(99,(parseInt(k)||0)+1)))} style={S.killBtn}>+</button>
            </div>
          </div>

          {/* Points preview */}
          {placement && kills !== "" && (
            <motion.div initial={{ opacity:0,y:-5 }} animate={{ opacity:1,y:0 }}
              style={{ marginBottom:14,padding:"11px 14px",borderRadius:9,
                background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.18)" }}>
              <div style={{ display:"flex",justifyContent:"space-around",marginBottom:8 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"#f59e0b" }}>{pts}</div>
                  <div style={{ fontSize:9,color:"#52525b",letterSpacing:1 }}>TOTAL PTS</div>
                </div>
                <div style={{ width:1,background:"rgba(255,255,255,0.06)" }}/>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"#10b981" }}>+{pts*10}</div>
                  <div style={{ fontSize:9,color:"#52525b",letterSpacing:1 }}>EST. CP</div>
                </div>
              </div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,0.25)",textAlign:"center" }}>
                {(() => {
                  const r = parseInt(placement);
                  const placePts = r <= 10 ? (BR_PTS[r] || 0) : 1;
                  const kPts = parseInt(kills) || 0;
                  return `#${r} placement (${placePts} pts) + ${kPts} kills (${kPts} pts)`;
                })()}
              </div>
            </motion.div>
          )}

          {/* Screenshot upload */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10,color:"#52525b",fontWeight:700,letterSpacing:1,marginBottom:6,display:"flex",alignItems:"center",gap:5 }}>
              <ImageIcon size={10}/> FREE FIRE SCREENSHOT (REQUIRED)
            </div>
            <div style={{ marginBottom:8,padding:"7px 10px",borderRadius:7,background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.18)",display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:14 }}>🔫</span>
              <span style={{ fontSize:10,color:"#fbbf24" }}>Must be your Free Fire end-of-match results screen. Other screenshots will be rejected.</span>
            </div>
            <div onClick={() => fileRef.current?.click()} style={{
              border:`2px dashed ${preview?"rgba(16,185,129,0.5)":"rgba(99,102,241,0.3)"}`,
              borderRadius:10,padding:preview?12:20,textAlign:"center",
              background:"rgba(0,0,0,0.15)",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              minHeight:preview?80:90,transition:"border-color .15s",
            }}>
              {preview ? (
                <div style={{ width:"100%",position:"relative" }}>
                  <img src={preview} alt="" style={{ maxHeight:130,borderRadius:7,objectFit:"contain",maxWidth:"100%",display:"block",margin:"0 auto" }}/>
                  <button onClick={e=>{e.stopPropagation();setScreenshot(null);setPreview(null);}}
                    style={{ position:"absolute",top:-8,right:-8,width:22,height:22,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <X size={10}/>
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={22} color="#6366f1" style={{ marginBottom:7 }}/>
                  <div style={{ color:"#52525b",fontSize:13 }}>Tap to upload screenshot</div>
                  <div style={{ color:"#3f3f46",fontSize:10,marginTop:3 }}>Max 10MB · PNG, JPG, WebP</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} style={{ display:"none" }}/>
          </div>

          {/* Upload progress bar */}
          {loading && progress > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ height:4,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
                <motion.div animate={{ width:`${progress}%` }}
                  style={{ height:"100%",background:"linear-gradient(90deg,#6366f1,#10b981)",borderRadius:3 }}/>
              </div>
              <div style={{ fontSize:10,color:"#52525b",marginTop:3,textAlign:"center" }}>
                {progress<65?"Uploading screenshot…":"Submitting result…"}
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity:0,y:-5 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",
                  borderRadius:8,padding:"9px 13px",color:"#fca5a5",fontSize:12,marginBottom:10,
                  display:"flex",alignItems:"center",gap:7 }}>
                <AlertCircle size={13}/>{error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button onClick={handleSubmit}
            disabled={loading || !placement || kills==="" || !screenshot}
            style={{ ...S.btn, opacity:(loading||!placement||kills===""||!screenshot)?0.5:1,
              cursor:(loading||!placement||kills===""||!screenshot)?"not-allowed":"pointer" }}>
            {loading ? "Submitting…" : "🚀 Submit Result"}
          </button>

          <p style={{ textAlign:"center",fontSize:10,color:"#3f3f46",marginTop:8 }}>
            Results are cross-verified. Image hash is recorded to detect duplicates.
          </p>
        </>)}
      </motion.div>
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <div style={{ padding:"4px 11px",borderRadius:20,background:`${color}18`,border:`1px solid ${color}30`,
      fontSize:11,fontWeight:700,color }}>
      {label}
    </div>
  );
}

const S = {
  ovl:   { position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"16px 12px" },
  mod:   { background:"linear-gradient(160deg,#0f0f1a,#0c0c18)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:18,padding:22,width:460,maxWidth:"100%",maxHeight:"93vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.8)" },
  close: { background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,width:28,height:28,color:"#6b7280",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 },
  btn:   { width:"100%",padding:"13px 0",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",fontWeight:800,fontSize:14,boxShadow:"0 4px 20px rgba(99,102,241,0.3)",cursor:"pointer" },
  killBtn: { width:36,height:36,borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#a1a1aa",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" },
};
