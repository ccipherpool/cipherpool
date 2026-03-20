import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

export default function PlayerProfilePanel({ player, onClose, accentColor }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!player?.user_id) return;
    supabase
      .from("player_stats")
      .select("kills, wins, tournaments_played, kd_ratio, total_points, best_position")
      .eq("user_id", player.user_id)
      .maybeSingle()
      .then(({ data }) => setStats(data));
  }, [player?.user_id]);

  if (!player) return null;

  const matches  = stats?.tournaments_played || 0;
  const wins     = stats?.wins               || 0;
  const kills    = stats?.kills              || 0;
  const winRate  = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const ac       = accentColor || "#7C3AED";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        exit={{ x: 300 }}
        transition={{ type:"spring", damping:25, stiffness:200 }}
        className="fixed right-0 top-0 h-full w-80 bg-[#11151F] border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
        style={{ boxShadow: `-5px 0 30px ${ac}20` }}
      >
        <div className="p-6 border-b border-white/10">
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-2 transition">
            ← Fermer
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">

          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl overflow-hidden"
            style={{ background:`linear-gradient(135deg,${ac},#4C1D95)`, boxShadow:`0 10px 25px ${ac}40` }}
          >
            {player.profiles?.avatar_url
              ? <img src={player.profiles.avatar_url} alt="" className="w-full h-full object-cover"/>
              : player.profiles?.full_name?.charAt(0) || "U"}
          </div>

          <h2 className="text-xl font-bold text-white text-center">
            {player.profiles?.full_name}
          </h2>

          <div className="bg-[#1A1F2B] rounded-lg px-4 py-2 w-full text-center">
            <p className="text-xs text-white/40">Free Fire ID</p>
            <p className="text-sm font-mono" style={{ color: ac }}>
              {player.profiles?.free_fire_id || "N/A"}
            </p>
          </div>

          {/* Stats réelles */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-[#1A1F2B] p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-white">{matches}</p>
              <p className="text-xs text-white/40">Matchs</p>
            </div>
            <div className="bg-[#1A1F2B] p-4 rounded-lg text-center">
              <p className="text-xl font-bold text-white">{wins}</p>
              <p className="text-xs text-white/40">Victoires</p>
            </div>
            <div className="bg-[#1A1F2B] p-4 rounded-lg text-center">
              <p className="text-xl font-bold" style={{ color:"#ef4444" }}>{kills}</p>
              <p className="text-xs text-white/40">Kills</p>
            </div>
            <div className="bg-[#1A1F2B] p-4 rounded-lg text-center">
              <p className="text-xl font-bold" style={{ color:"#00d4ff" }}>{winRate}%</p>
              <p className="text-xs text-white/40">Win Rate</p>
            </div>
          </div>

          {/* Win rate bar */}
          <div className="bg-[#1A1F2B] p-4 rounded-lg w-full">
            <p className="text-xs text-white/40 mb-2">Win Rate</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: ac }}>{winRate}%</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width:`${winRate}%`, backgroundColor: ac }} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg text-sm font-medium transition">
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}