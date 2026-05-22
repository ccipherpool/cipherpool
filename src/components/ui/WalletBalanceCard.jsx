import { useCountUp } from '../../hooks/useCountUp';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Coins, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function WalletBalanceCard({ balance = 0, previousBalance, currency = 'CP', onTopUp, onWithdraw, className = '' }) {
  const { ref, visible } = useScrollReveal();
  const animated = useCountUp(balance, { duration: 1600, enabled: visible });

  const change = previousBalance != null ? balance - previousBalance : null;
  const changePct = change != null && previousBalance > 0
    ? ((change / previousBalance) * 100).toFixed(1)
    : null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('wallet-card', className)}
    >
      {/* Label */}
      <p className="text-[9px] font-black tracking-[0.4em] uppercase text-yellow-400/50 mb-3">
        {currency} Balance
      </p>

      {/* Main value */}
      <div className="flex items-end gap-3 mb-1">
        <span className="font-heading text-4xl font-black tracking-tight text-white leading-none">
          {animated.toLocaleString()}
        </span>
        <span className="text-base font-bold text-white/30 mb-1">{currency}</span>
      </div>

      {/* Change indicator */}
      {changePct != null && (
        <div className={cn(
          'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-4',
          change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        )}>
          {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {change >= 0 ? '+' : ''}{changePct}% this week
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {onTopUp && (
          <button
            onClick={onTopUp}
            className="flex-1 cyber-btn cyber-btn-gold cyber-btn-sm"
          >
            <Coins size={12} />
            Top Up
          </button>
        )}
        {onWithdraw && (
          <button
            onClick={onWithdraw}
            className="flex-1 cyber-btn cyber-btn-ghost cyber-btn-sm"
          >
            <ArrowUpRight size={12} />
            Withdraw
          </button>
        )}
      </div>
    </motion.div>
  );
}
