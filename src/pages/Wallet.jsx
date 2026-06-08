import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet as WalletIcon, TrendingUp, TrendingDown, BarChart2,
  Trophy, ShoppingBag, ArrowUpRight, ArrowDownLeft, ShoppingCart,
  AlertTriangle, Gamepad2, Medal, Gift, RotateCcw, Crown, Key,
  ArrowRightLeft, Coins, Zap,
} from "lucide-react";

const TX_CONFIG = {
  purchase:    { icon: ShoppingCart,  color: "#ef4444", label: "Store Purchase" },
  reward:      { icon: Trophy,        color: "#f59e0b", label: "Reward"         },
  penalty:     { icon: AlertTriangle, color: "#ef4444", label: "Penalty"        },
  debit:       { icon: TrendingDown,  color: "#ef4444", label: "Debit"          },
  credit:      { icon: TrendingUp,    color: "#10b981", label: "Credit"         },
  tournament:  { icon: Gamepad2,      color: "#10b981", label: "Tournament"     },
  prize:       { icon: Medal,         color: "#f59e0b", label: "Prize"          },
  daily:       { icon: Gift,          color: "#06b6d4", label: "Daily Reward"   },
  refund:      { icon: RotateCcw,     color: "#10b981", label: "Refund"         },
  admin_grant: { icon: Crown,         color: "#a855f7", label: "Admin Grant"    },
  fee:         { icon: Key,           color: "#ef4444", label: "Entry Fee"      },
};

function getTxCfg(type) {
  if (!type) return { icon: ArrowRightLeft, color: "#6b7280", label: "Transaction" };
  const key = Object.keys(TX_CONFIG).find(k => type.toLowerCase().includes(k));
  return key ? TX_CONFIG[key] : { icon: ArrowRightLeft, color: "#6b7280", label: type };
}

function timeAgo(date) {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)     return "Just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB");
}

const FILTERS = [
  { key: "all",   label: "All"      },
  { key: "plus",  label: "Received" },
  { key: "moins", label: "Spent"    },
];

export default function Wallet() {
  const { profile, balance: ctxBalance } = useOutletContext() || {};
  const [balance, setLocalBalance] = useState(ctxBalance || 0);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [balanceChange, setBalanceChange] = useState(null);

  useEffect(() => {
    if (ctxBalance !== undefined && ctxBalance !== balance) {
      const diff = ctxBalance - balance;
      if (diff !== 0 && balance !== 0) {
        setBalanceChange(diff);
        setTimeout(() => setBalanceChange(null), 3000);
      }
      setLocalBalance(ctxBalance);
    }
  }, [ctxBalance]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      setTxLoading(true);
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions(data || []);
      setTxLoading(false);
    })();
  }, [profile?.id]);

  const isDebit = (tx) => ["purchase", "penalty", "debit", "fee"].some(k => tx.type?.toLowerCase().includes(k));

  const filtered = filter === "all"
    ? transactions
    : transactions.filter(tx => filter === "plus" ? !isDebit(tx) : isDebit(tx));

  const totalIn  = transactions.filter(tx => !isDebit(tx)).reduce((s, tx) => s + (tx.amount || 0), 0);
  const totalOut = transactions.filter(tx =>  isDebit(tx)).reduce((s, tx) => s + Math.abs(tx.amount || 0), 0);

  return (
    <div className="space-y-5">

      {/* ── Balance Card (Hero) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(15,7,36,0.98) 0%, rgba(10,12,26,0.98) 60%, rgba(8,10,22,0.98) 100%)",
          border: "1px solid rgba(245,158,11,0.18)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(245,158,11,0.06)",
        }}
      >
        {/* Aurora orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 -left-12 w-72 h-72 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #f59e0b, transparent 65%)", filter: "blur(40px)" }} />
          <div className="absolute top-0 right-16 w-48 h-48 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #7C3AED, transparent 65%)", filter: "blur(32px)" }} />
          <div className="absolute bottom-0 right-0 w-56 h-40 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #06B6D4, transparent 65%)", filter: "blur(28px)" }} />
          {/* grid overlay */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(245,158,11,1) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,1) 1px,transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
        </div>

        <div className="relative z-10 px-6 md:px-8 py-7">
          {/* Label */}
          <div className="flex items-center gap-2 mb-4">
            <WalletIcon size={12} style={{ color: "rgba(245,158,11,0.7)" }} />
            <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(245,158,11,0.6)" }}>
              Current Balance
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Big number */}
            <div>
              <div className="flex items-end gap-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={balance}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-[3.8rem] md:text-[5rem] font-black leading-none tracking-tighter tabular-nums"
                    style={{ color: "#f59e0b" }}
                  >
                    {balance.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
                <span
                  className="text-base font-black uppercase pb-2"
                  style={{ color: "rgba(245,158,11,0.45)" }}
                >
                  CP
                </span>
              </div>

              <AnimatePresence>
                {balanceChange && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-sm font-bold mt-1.5 flex items-center gap-1"
                    style={{ color: balanceChange > 0 ? "#10b981" : "#ef4444" }}
                  >
                    {balanceChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                    {balanceChange > 0 ? "+" : ""}{balanceChange.toLocaleString()} coins
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Stat pills */}
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
              >
                <ArrowUpRight size={13} style={{ color: "#10b981" }} />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>Received</p>
                  <p className="text-sm font-black" style={{ color: "#10b981" }}>+{totalIn.toLocaleString()}</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
              >
                <ArrowDownLeft size={13} style={{ color: "#ef4444" }} />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>Spent</p>
                  <p className="text-sm font-black" style={{ color: "#ef4444" }}>-{totalOut.toLocaleString()}</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)" }}
              >
                <BarChart2 size={13} style={{ color: "#A78BFA" }} />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>Total Txs</p>
                  <p className="text-sm font-black" style={{ color: "#A78BFA" }}>{transactions.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-3"
      >
        <Link to="/tournaments" className="block">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200"
            style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <Trophy size={18} style={{ color: "#10b981" }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#10b981" }}>Tournaments</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>Earn up to 500 CP</p>
            </div>
          </motion.div>
        </Link>

        <Link to="/store" className="block">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.15)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <ShoppingBag size={18} style={{ color: "#A78BFA" }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#A78BFA" }}>Store</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>Spend your coins</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Transaction History ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(10,12,26,0.95)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Transaction History
          </span>
          <div className="flex items-center gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all duration-200"
                style={filter === f.key
                  ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#A78BFA" }
                  : { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.28)" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skeleton */}
        {txLoading && (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-36 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-2 w-20 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
                <div className="h-4 w-16 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!txLoading && filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <TrendingDown size={22} style={{ color: "rgba(255,255,255,0.18)" }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.22)" }}>
              No transactions yet
            </p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.12)" }}>
              Join tournaments to earn coins!
            </p>
          </div>
        )}

        {/* Rows */}
        {!txLoading && filtered.length > 0 && (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {filtered.map((tx, i) => {
              const cfg = getTxCfg(tx.type);
              const credit = !isDebit(tx);
              const amt = Math.abs(tx.amount || 0);

              return (
                <motion.div
                  key={tx.id || i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.022, 0.25), duration: 0.32 }}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.018]"
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: `${cfg.color}14`, border: `1px solid ${cfg.color}28` }}
                  >
                    <cfg.icon size={15} style={{ color: cfg.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {tx.description || cfg.label}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                      {timeAgo(tx.created_at)} · {cfg.label}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-black tabular-nums"
                      style={{ color: credit ? "#10b981" : "#ef4444" }}
                    >
                      {credit ? "+" : "-"}{amt.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.18)" }}>CP</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
