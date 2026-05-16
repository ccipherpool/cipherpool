// src/services/walletService.js
// Never mutate wallets directly — all mutations go through RPCs or
// wallet_transactions inserts that trigger balance updates server-side.

import { supabase } from '../lib/supabase';
import { WALLET_TX_TYPE } from '../lib/schema';

export async function getWallet(userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('balance, updated_at')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getTransactionHistory(userId, { limit = 30, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id, amount, type, reason, reference, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Admin: grant/deduct coins
export async function adminAdjustCoins(targetUserId, amount, reason) {
  const { data, error } = await supabase.rpc('grant_coins', {
    target_user: targetUserId,
    amount,
    reason,
  });
  if (error) throw error;
  return data;
}

// Admin: bulk stats for dashboard
export async function getWalletStats() {
  const { data, error } = await supabase
    .from('wallets')
    .select('balance')
    .order('balance', { ascending: false });

  if (error) throw error;

  const total     = data.reduce((s, w) => s + w.balance, 0);
  const nonZero   = data.filter(w => w.balance > 0).length;
  const top10Pct  = data.slice(0, Math.max(1, Math.floor(data.length * 0.1)));
  const top10Sum  = top10Pct.reduce((s, w) => s + w.balance, 0);

  return {
    totalCirculation: total,
    activeWallets:    nonZero,
    top10Pct:         top10Sum,
    gini:             total > 0 ? (top10Sum / total).toFixed(2) : 0,
  };
}

export { WALLET_TX_TYPE };
