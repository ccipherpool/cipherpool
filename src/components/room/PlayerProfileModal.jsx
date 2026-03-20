import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function PlayerProfileModal({ player, currentUser, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!player?.user_id) return;
    supabase
      .from("player_stats")
      .select("kills, wins, tournaments_played, kd_ratio")
      .eq("user_id", player.user_id)
      .maybeSingle()
      .then(({ data }) => setStats(data));
  }, [player?.user_id]);

  const matches = stats?.tournaments_played || 0;
  const wins    = stats?.wins               || 0;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] mx-4 bg-[#11151C] border border-purple-500/30 rounded-2xl p-4 sm:p-6 shadow-[0_0_40px_rgba(139,92,246,0.3)]"
        onClick={e => e.stopPropagation()}
        style={{ animation:"scaleIn .2s ease-out" }}
      >
        <div className="text-center">
          {/* Avatar */}
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-lg overflow-hidden">
            {player.profiles?.avatar_url
              ? <img src={player.profiles.avatar_url} alt="" className="w-full h-full object-cover"/>
              : player.profiles?.full_name?.charAt(0) || "U"}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {player.profiles?.full_name}
          </h2>
          <p className="text-purple-400 text-sm mb-4">
            FF: {player.profiles?.free_fire_id || "—"}
          </p>

          {/* Stats réelles */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#1A1F2B] p-3 rounded-lg">
              <p className="text-lg font-bold text-white">{matches}</p>
              <p className="text-xs text-white/40">Matchs</p>
            </div>
            <div className="bg-[#1A1F2B] p-3 rounded-lg">
              <p className="text-lg font-bold text-white">{wins}</p>
              <p className="text-xs text-white/40">Victoires</p>
            </div>
            <div className="bg-[#1A1F2B] p-3 rounded-lg">
              <p className="text-lg font-bold text-[#00d4ff]">{winRate}%</p>
              <p className="text-xs text-white/40">Win Rate</p>
            </div>
          </div>

          <div className="flex gap-3">
            {currentUser && currentUser.id !== player.user_id && (
              <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
                Profil
              </button>
            )}
            <button
              className="flex-1 px-4 py-2 border border-white/10 hover:border-white/30 rounded-lg text-sm font-medium transition"
              onClick={onClose}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* ✅ FIX: style normal (pas style jsx qui n'est pas installé) */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}