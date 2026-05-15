import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Search, X, AlertCircle, CheckCircle, Send, Coins } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

export default function GiftModal({ onClose, senderId }) {
  const { refreshCurrentUser, refreshEconomyData } = useAuth();
  const [step, setStep]         = useState("select"); // select → compose → sent
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [receiver, setReceiver] = useState(null);
  const [amount, setAmount]     = useState("");
  const [message, setMessage]   = useState("");
  const [senderBalance, setSenderBalance] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!senderId) return;
    supabase.from("wallets").select("balance").eq("user_id", senderId).maybeSingle()
      .then(({ data }) => setSenderBalance(data?.balance || 0));
  }, [senderId]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, fair_play_score, is_verified")
        .neq("id", senderId)
        .ilike("username", `%${query}%`)
        .eq("role", "user")
        .limit(8);
      setResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, senderId]);

  const handleSend = async () => {
    setError("");
    const amt = parseInt(amount);
    if (!amt || amt < 10)    return setError("Minimum gift is 10 CP");
    if (amt > 10000)         return setError("Maximum gift is 10,000 CP");
    if (amt > senderBalance) return setError(`Insufficient balance (you have ${senderBalance} CP)`);
    if (!receiver)           return setError("Select a recipient first");

    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("send_gift", {
        p_receiver_id: receiver.id,
        p_amount:      amt,
        p_message:     message.trim() || null,
      });
      if (rpcErr) throw rpcErr;
      if (!data?.success) throw new Error(data?.error || "Failed to send gift");
      setSenderBalance(prev => Math.max(0, prev - amt));
      await Promise.all([refreshEconomyData?.(), refreshCurrentUser?.(senderId)]);
      setStep("sent");
    } catch (err) {
      setError(err.message || "Failed to send gift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{ background: "linear-gradient(160deg, #0f0f1a, #0c0c18)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 18, padding: 24, width: 440, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(236,72,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gift size={16} color="#ec4899" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5" }}>Send a Gift</div>
              <div style={{ fontSize: 11, color: "#52525b" }}>Balance: {senderBalance.toLocaleString()} CP</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} />
          </button>
        </div>

        {/* ─── SENT SUCCESS ─── */}
        {step === "sent" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              <CheckCircle size={56} color="#10b981" style={{ margin: "0 auto 16px", display: "block" }} />
            </motion.div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>Gift Sent! 🎁</div>
            <div style={{ color: "#52525b", fontSize: 13, marginTop: 8 }}>
              @{receiver?.username} will be notified to claim {parseInt(amount).toLocaleString()} CP
            </div>
            <div style={{ fontSize: 12, color: "#3f3f46", marginTop: 6 }}>Gift expires in 7 days if unclaimed (you'll be refunded)</div>
            <button onClick={onClose} style={{ marginTop: 20, padding: "12px 32px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.06)", color: "#a1a1aa", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Close
            </button>
          </div>
        )}

        {/* ─── SELECT RECIPIENT ─── */}
        {step === "select" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>FIND PLAYER</div>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#52525b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search username…"
                  autoFocus
                  style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px 10px 36px", color: "#f4f4f5", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {searching && (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#52525b", fontSize: 13 }}>Searching…</div>
            )}

            {results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map(p => (
                  <div key={p.id}
                    onClick={() => { setReceiver(p); setStep("compose"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(236,72,153,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "rgba(99,102,241,0.15)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{p.username?.[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>
                        @{p.username}
                        {p.is_verified && <span style={{ marginLeft: 4, fontSize: 11, color: "#06b6d4" }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#52525b" }}>FP: {p.fair_play_score ?? 100}</div>
                    </div>
                    <ChevronIcon />
                  </div>
                ))}
              </div>
            )}

            {query.length >= 2 && !searching && results.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#52525b", fontSize: 13 }}>No players found</div>
            )}
          </>
        )}

        {/* ─── COMPOSE GIFT ─── */}
        {step === "compose" && receiver && (
          <>
            {/* Recipient display */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.15)", marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {receiver.avatar_url
                  ? <img src={receiver.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{receiver.username?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>@{receiver.username}</div>
                <div style={{ fontSize: 11, color: "#ec4899" }}>Gift recipient</div>
              </div>
              <button onClick={() => { setReceiver(null); setStep("select"); }} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={12} />
              </button>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>AMOUNT (CP)</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[50, 100, 250, 500, 1000].map(n => (
                  <button key={n} onClick={() => setAmount(String(n))}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: amount === String(n) ? "1px solid rgba(236,72,153,0.4)" : "1px solid rgba(255,255,255,0.06)", background: amount === String(n) ? "rgba(236,72,153,0.12)" : "rgba(255,255,255,0.03)", color: amount === String(n) ? "#ec4899" : "#52525b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number" min="10" max="10000" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Custom amount (10–10,000)"
                style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center" }}
              />
              {amount && parseInt(amount) > senderBalance && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>⚠️ Insufficient balance</div>
              )}
            </div>

            {/* Message */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: "#52525b", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>MESSAGE (optional)</div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={200}
                placeholder="Add a message with your gift…"
                rows={3}
                style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#f4f4f5", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }}
              />
              <div style={{ textAlign: "right", fontSize: 10, color: "#3f3f46" }}>{message.length}/200</div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertCircle size={13} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary */}
            {amount && parseInt(amount) >= 10 && parseInt(amount) <= senderBalance && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#52525b" }}>Your balance after sending</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }}>
                  {(senderBalance - parseInt(amount)).toLocaleString()} CP
                </span>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={loading || !amount || parseInt(amount) < 10 || parseInt(amount) > senderBalance}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
                background: loading || !amount || parseInt(amount) < 10 || parseInt(amount) > senderBalance
                  ? "rgba(255,255,255,0.04)"
                  : "linear-gradient(135deg, #ec4899, #be185d)",
                color: loading || !amount || parseInt(amount) < 10 || parseInt(amount) > senderBalance
                  ? "#3f3f46" : "#fff",
                fontWeight: 800, fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? "Sending…" : <><Send size={15} /> Send {amount && parseInt(amount) > 0 ? `${parseInt(amount).toLocaleString()} CP` : "Gift"}</>}
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#3f3f46", marginTop: 10 }}>
              Coins are held securely until the recipient claims the gift
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
