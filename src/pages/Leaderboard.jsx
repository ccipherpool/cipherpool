import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [period,  setPeriod]  = useState("alltime");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel("leaderboard-realtime")
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"player_stats" }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [period]); // ← period dans les deps pour re-fetch à chaque changement

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let statsData;

      if (period === "alltime") {
        // ── All time — utilise player_stats (données cumulées) ──
        const { data } = await supabase
          .from("player_stats")
          .select("user_id, total_points, kills, tournaments_played, wins, best_position")
          .gt("tournaments_played", 0)
          .order("total_points", { ascending: false });
        statsData = data;

      } else {
        // ── Weekly / Monthly — agrège depuis match_results filtrés par date ──
        const days   = period === "weekly" ? 7 : 30;
        const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: results } = await supabase
          .from("match_results")
          .select("user_id, kills, points, estimated_coins, placement")
          .eq("status", "verified")
          .gte("submitted_at", since);

        if (!results?.length) { setPlayers([]); setLoading(false); return; }

        // Agréger par user
        const agg = {};
        results.forEach(r => {
          if (!agg[r.user_id]) {
            agg[r.user_id] = { user_id:r.user_id, total_points:0, kills:0, tournaments_played:0, wins:0, best_position:null };
          }
          agg[r.user_id].total_points     += (r.points || 0);
          agg[r.user_id].kills            += (r.kills || 0);
          agg[r.user_id].tournaments_played += 1;
          if (r.placement === 1) agg[r.user_id].wins += 1;
          if (!agg[r.user_id].best_position || r.placement < agg[r.user_id].best_position) {
            agg[r.user_id].best_position = r.placement;
          }
        });

        statsData = Object.values(agg).sort((a, b) => b.total_points - a.total_points);
      }

      if (!statsData?.length) { setPlayers([]); setLoading(false); return; }

      const ids = statsData.map(s => s.user_id);

      const [{ data: profiles }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, free_fire_id, avatar_url").in("id", ids).not("role", "eq", "banned"),
        supabase.from("wallets").select("user_id, balance").in("user_id", ids),
      ]);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const walletMap  = Object.fromEntries((wallets  || []).map(w => [w.user_id, w.balance || 0]));
      const statsMap   = Object.fromEntries(statsData.map(s => [s.user_id, s]));

      const result = ids
        .filter(id => profileMap[id])
        .map(id => ({
          id,
          name:    profileMap[id]?.full_name    || "Joueur",
          ffId:    profileMap[id]?.free_fire_id || "—",
          avatar:  profileMap[id]?.avatar_url,
          coins:   walletMap[id] || 0,
          points:  statsMap[id]?.total_points || 0,
          kills:   statsMap[id]?.kills || 0,
          matches: statsMap[id]?.tournaments_played || 0,
          wins:    statsMap[id]?.wins || 0,
          best:    statsMap[id]?.best_position || null,
        }))
        .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coins - a.coins)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      setPlayers(result);
    } catch(e) {
      console.error("leaderboard error:", e);
    }
    setLoading(false);
  };

  const getRankBadge = rank => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  const PERIODS = [
    { key:"weekly",  label:"CETTE SEMAINE" },
    { key:"monthly", label:"CE MOIS" },
    { key:"alltime", label:"TOUT LE TEMPS" },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center">
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030014] text-white cyber-grid p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

      <style>{`
        @media (max-width: 768px) {
          .max-w-7xl { padding-left: 12px !important; padding-right: 12px !important; }
          .p-8 { padding: 16px !important; }
          .p-6 { padding: 14px !important; }
          .gap-8 { gap: 16px !important; }
          .gap-6 { gap: 12px !important; }
          .grid-cols-7, .lg\:grid-cols-7 { grid-template-columns: repeat(4,1fr) !important; }
          .md\:grid-cols-3 { grid-template-columns: 1fr !important; }
          .md\:grid-cols-2 { grid-template-columns: 1fr !important; }
          .md\:grid-cols-4 { grid-template-columns: 1fr 1fr !important; }
          .lg\:grid-cols-8 { grid-template-columns: repeat(4,1fr) !important; }
          .text-3xl { font-size: 20px !important; }
          .text-4xl { font-size: 24px !important; }
          .mb-8 { margin-bottom: 16px !important; }
          .overflow-x-auto { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          table { font-size: 12px !important; }
          th, td { padding: 6px 8px !important; }
        }
        @media (max-width: 480px) {
          .grid-cols-7, .lg\:grid-cols-7, .lg\:grid-cols-8 { grid-template-columns: repeat(2,1fr) !important; }
          .md\:grid-cols-4 { grid-template-columns: 1fr 1fr !important; }
          .flex-row { flex-direction: column !important; }
        }
      `}</style>


        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
            📊 CLASSEMENT
          </h1>
          <p className="text-white/40">Les meilleurs joueurs de la plateforme</p>
        </div>

        {/* Period tabs */}
        <div className="flex gap-4 mb-8 border-b border-[rgba(124,58,237,0.2)] pb-4">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 text-sm font-medium transition ${period === p.key ? "text-[#7c3aed] border-b-2 border-[#7c3aed]" : "text-white/40 hover:text-white"}`}>
              {p.label}
            </button>
          ))}
        </div>

        {players.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl">
            <p className="text-white/40 text-lg">Aucun joueur dans cette période</p>
            <p className="text-white/20 text-sm mt-2">Les résultats apparaîtront quand des matchs seront joués</p>
          </div>
        ) : (<>

          {/* Top 3 */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {players.slice(0, 3).map((player, index) => (
              <motion.div key={player.id}
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:index*.1 }}
                className={`bg-[#0a0a1a] border rounded-2xl p-6 text-center ${player.rank===1?"border-yellow-500/30":player.rank===2?"border-gray-400/30":"border-orange-700/30"}`}>
                <div className="text-5xl mb-3">{getRankBadge(player.rank)}</div>
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center text-2xl font-bold overflow-hidden">
                  {player.avatar ? <img src={player.avatar} alt={player.name} className="w-full h-full object-cover rounded-full"/> : player.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{player.name}</h3>
                <p className="text-sm text-[#7c3aed] mb-3">FF: {player.ffId}</p>
                <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
                  <div style={{ textAlign:"center" }}>
                    <p className="text-2xl font-bold text-white">{player.points.toLocaleString()}</p>
                    <p style={{ fontSize:11, color:"#6b7280" }}>POINTS</p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p className="text-lg font-bold" style={{ color:"#00d4ff" }}>{player.coins.toLocaleString()}</p>
                    <p style={{ fontSize:11, color:"#6b7280" }}>PIÈCES</p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p className="text-lg font-bold" style={{ color:"#ef4444" }}>{player.kills}</p>
                    <p style={{ fontSize:11, color:"#6b7280" }}>KILLS</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Full table */}
          <div className="bg-[#0a0a1a] border border-[rgba(124,58,237,0.2)] rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[rgba(124,58,237,0.2)]">
              <h2 className="text-lg font-bold text-white">CLASSEMENT COMPLET</h2>
            </div>
            <div className="divide-y divide-[rgba(124,58,237,0.1)]">
              {players.map(player => (
                <div key={player.id} className="flex items-center justify-between p-4 hover:bg-[#11152b] transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${player.rank<=3?"bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-white":"bg-[#1a1f35] text-white/60"}`}>
                      {player.rank <= 3 ? getRankBadge(player.rank) : `#${player.rank}`}
                    </div>
                    <div>
                      <p className="font-medium text-white">{player.name}</p>
                      <p className="text-xs text-white/40">FF: {player.ffId}</p>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:20, alignItems:"center" }}>
                    <div style={{ textAlign:"center" }}>
                      <p className="font-bold text-[#a78bfa]">{player.points}</p>
                      <p className="text-xs text-white/40">pts</p>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p className="font-bold" style={{ color:"#00d4ff" }}>{player.coins.toLocaleString()}</p>
                      <p className="text-xs text-white/40">pièces</p>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p className="font-bold" style={{ color:"#ef4444" }}>{player.kills}</p>
                      <p className="text-xs text-white/40">kills</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </>)}
      </div>
    </div>
  );
}