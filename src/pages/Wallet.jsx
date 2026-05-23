import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, BarChart2, Trophy, ShoppingBag, ArrowUpRight, ArrowDownLeft, ShoppingCart, AlertTriangle, Gamepad2, Medal, Gift, RotateCcw, Crown, Key, ArrowRightLeft } from "lucide-react";

const TX_CONFIG = {
  purchase:    { icon: ShoppingCart,  color: "#ef4444", label: "Store Purchase"    },
  reward:      { icon: Trophy,        color: "#f59e0b", label: "Reward"           },
  penalty:     { icon: AlertTriangle, color: "#ef4444", label: "Penalty"          },
  debit:       { icon: TrendingDown,  color: "#ef4444", label: "Debit"            },
  credit:      { icon: TrendingUp,    color: "#10b981", label: "Credit"           },
  tournament:  { icon: Gamepad2,      color: "#10b981", label: "Tournament"       },
  prize:       { icon: Medal,         color: "#f59e0b", label: "Prize"            },
  daily:       { icon: Gift,          color: "#06b6d4", label: "Daily Reward"     },
  refund:      { icon: RotateCcw,     color: "#10b981", label: "Refund"           },
  admin_grant: { icon: Crown,         color: "#a855f7", label: "Admin Grant"      },
  fee:         { icon: Key,           color: "#ef4444", label: "Entry Fee"        },
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
  { key: "all",   label: "All"     },
  { key: "plus",  label: "Received" },
  { key: "moins", label: "Spent"   },
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

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-2 mb-1">
          <WalletIcon size={13} className="text-[#f59e0b]" />
          <span className="text-[9px] font-black text-[rgba(245,158,11,0.7)] uppercase tracking-[0.2em]">
            Economy
          </span>
        </div>
        <h1 className="text-[2rem] md:text-[2.6rem] font-heading font-black text-white uppercase tracking-tighter leading-[0.9]">
          My <span style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Wallet</span>
        </h1>
      </motion.div>

      {/* ── BALANCE CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[20px] p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(20,10,50,0.9) 0%, rgba(13,18,32,0.95) 100%)",
          border: "1px solid rgba(245,158,11,0.2)",
          boxShadow: "0 20px 60px rgba(245,158,11,0.08)",
        }}
      >
        {/* grid bg */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* glow */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, rgba(245,158,11,0.12), transparent 60%)" }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[9px] font-black text-[rgba(255,255,255,0.35)] uppercase tracking-[0.3em] mb-2">
              Current Balance
            </p>
            <div className="flex items-end gap-3">
              <AnimatePresence mode="wait">
                <motion.span
                  key={balance}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-[3.5rem] md:text-[4.5rem] font-heading font-black leading-none tracking-tighter"
                  style={{ color: "#f59e0b" }}
                >
                  {balance.toLocaleString()}
                </motion.span>
              </AnimatePresence>
              <span className="text-[1rem] font-black text-[rgba(245,158,11,0.5)] uppercase pb-2">CP</span>
            </div>

            <AnimatePresence>
              {balanceChange && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-[12px] font-black mt-1"
                  style={{ color: balanceChange > 0 ? "#10b981" : "#ef4444" }}
                >
                  {balanceChange > 0 ? "+" : ""}{balanceChange.toLocaleString()} coins
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.18)]">
              <ArrowUpRight size={13} className="text-[#10b981]" />
              <div>
                <p className="text-[8px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Received</p>
                <p className="text-[13px] font-black text-[#10b981]">+{totalIn.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.18)]">
              <ArrowDownLeft size={13} className="text-[#ef4444]" />
              <div>
                <p className="text-[8px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Spent</p>
                <p className="text-[13px] font-black text-[#ef4444]">-{totalOut.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.18)]">
              <BarChart2 size={13} className="text-cp-indigo" />
              <div>
                <p className="text-[8px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Total Txs</p>
                <p className="text-[13px] font-black text-cp-indigo">{transactions.length}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── QUICK ACTIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-3"
      >
        <Link to="/tournaments">
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 p-4 rounded-[16px] transition-all duration-[220ms] cursor-pointer"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
          >
            <Trophy size={22} className="text-[#10b981] flex-shrink-0" />
            <div>
              <p className="text-[11px] font-black text-[#10b981] uppercase tracking-wider">Tournaments</p>
              <p className="text-[9px] text-[rgba(255,255,255,0.3)]">Earn up to 500 CP</p>
            </div>
          </motion.div>
        </Link>

        <Link to="/store">
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 p-4 rounded-[16px] transition-all duration-[220ms] cursor-pointer"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}
          >
            <ShoppingBag size={22} className="text-cp-indigo flex-shrink-0" />
            <div>
              <p className="text-[11px] font-black text-cp-indigo uppercase tracking-wider">Store</p>
              <p className="text-[9px] text-[rgba(255,255,255,0.3)]">Spend your coins</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── TRANSACTIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="cp-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
          <span className="text-[10px] font-black text-[rgba(255,255,255,0.5)] uppercase tracking-[0.2em]">
            Transaction History
          </span>
          <div className="flex items-center gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all duration-[220ms] ${
                  filter === f.key
                    ? "bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] text-[#818cf8]"
                    : "bg-transparent border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {txLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="cp-skeleton h-14 rounded-xl" style={{ animationDelay: `${i * 0.04}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <TrendingDown size={22} style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
            <p className="text-[10px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-[0.2em]">
              No transactions yet
            </p>
            <p className="text-[9px] text-[rgba(255,255,255,0.12)] mt-1">
              Join tournaments to earn coins!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {filtered.map((tx, i) => {
              const cfg = getTxCfg(tx.type);
              const credit = !isDebit(tx);
              const amt = Math.abs(tx.amount || 0);

              return (
                <motion.div
                  key={tx.id || i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.3 }}
                  className="group flex items-center gap-3 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-[220ms]"
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}
                  >
                    <cfg.icon size={16} style={{ color: cfg.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white truncate">
                      {tx.description || cfg.label}
                    </p>
                    <p className="text-[8px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-widest mt-0.5">
                      {timeAgo(tx.created_at)} · {cfg.label}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-[13px] font-black tabular-nums"
                      style={{ color: credit ? "#10b981" : "#ef4444" }}
                    >
                      {credit ? "+" : "-"}{amt.toLocaleString()}
                    </p>
                    <p className="text-[7px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">CP</p>
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
