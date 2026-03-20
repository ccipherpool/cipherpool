import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTournaments();

    // ✅ Real-time: mise à jour automatique quand un tournoi change
    const channel = supabase
      .channel("tournaments-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tournaments"
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTournaments(prev => [payload.new, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setTournaments(prev =>
            prev.map(t => t.id === payload.new.id ? payload.new : t)
          );
        } else if (payload.eventType === "DELETE") {
          setTournaments(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    setTournaments(data || []);
    setLoading(false);
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12">
      <style>{`
        @media (max-width: 768px) {
          .max-w-7xl, .max-w-3xl { padding-left: 12px !important; padding-right: 12px !important; }
          .px-8 { padding-left: 14px !important; padding-right: 14px !important; }
          .py-12 { padding-top: 24px !important; padding-bottom: 24px !important; }
          .p-8 { padding: 16px !important; }
          .p-6 { padding: 14px !important; }
          .grid-cols-2 { grid-template-columns: 1fr !important; }
          .md\:grid-cols-2 { grid-template-columns: 1fr !important; }
          .md\:grid-cols-3 { grid-template-columns: 1fr !important; }
          .lg\:grid-cols-5 { grid-template-columns: 1fr 1fr !important; }
          .sm\:grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
          .text-5xl { font-size: 28px !important; }
          .text-4xl { font-size: 22px !important; }
          .text-3xl { font-size: 20px !important; }
          .h-96 { height: 200px !important; }
          .p-12 { padding: 16px !important; }
          .gap-8 { gap: 14px !important; }
          .mb-12 { margin-bottom: 24px !important; }
          .mb-8 { margin-bottom: 16px !important; }
          table { font-size: 12px !important; }
          th, td { padding: 6px 8px !important; }
          .overflow-x-auto { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
        }
        @media (max-width: 480px) {
          .lg\:grid-cols-5 { grid-template-columns: 1fr 1fr !important; }
          .grid-cols-2 { grid-template-columns: 1fr !important; }
        }
`}</style>

      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
        <p className="text-white/40">Compete in professional Free Fire tournaments</p>
      </div>

      {/* Filters */}
      {tournaments.length > 0 && (
        <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium transition ${
              filter === "all" 
                ? "text-purple-400 border-b-2 border-purple-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            All Tournaments
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`px-4 py-2 text-sm font-medium transition ${
              filter === "open" 
                ? "text-green-400 border-b-2 border-green-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("full")}
            className={`px-4 py-2 text-sm font-medium transition ${
              filter === "full" 
                ? "text-yellow-400 border-b-2 border-yellow-400" 
                : "text-white/40 hover:text-white"
            }`}
          >
            Full
          </button>
        </div>
      )}

      {/* Tournaments Grid */}
      {filteredTournaments.length === 0 ? (
        <div className="text-center py-20 bg-[#11151C] border border-white/5 rounded-xl">
          <p className="text-white/40 mb-4">No tournaments available</p>
          <Link
            to="/create-tournament"
            className="text-purple-400 hover:text-purple-300 transition"
          >
            Create your first tournament →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredTournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="block group"
            >
              <div 
                className="bg-[#11151C] border border-white/5 rounded-xl overflow-hidden hover:border-purple-500/50 transition relative"
                style={{
                  background: `linear-gradient(135deg, ${tournament.background_color || '#6D28D9'}15, #11151C)`,
                  borderLeft: `4px solid ${tournament.background_color || '#6D28D9'}`
                }}
              >
                {/* Banner Image */}
                {tournament.banner_url && (
                  <div className="h-32 overflow-hidden">
                    <img 
                      src={tournament.banner_url} 
                      alt={tournament.name}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#11151C] to-transparent"></div>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition">
                        {tournament.name}
                      </h3>
                      <p className="text-sm text-white/40 line-clamp-2">
                        {tournament.description || "No description"}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      tournament.status === "open" ? "bg-green-500/20 text-green-400" :
                      tournament.status === "full" ? "bg-yellow-500/20 text-yellow-400" :
                      tournament.status === "ongoing" ? "bg-blue-500/20 text-blue-400" :
                      tournament.status === "live" ? "bg-red-500/20 text-red-400" :
                      "bg-purple-500/20 text-purple-400"
                    }`}>
                      {tournament.status}
                    </span>
                  </div>

                  {/* Tournament Info Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Game Type</p>
                      <p className="text-sm font-medium text-white">
                        {tournament.game_type === "battle_royale" ? "Battle Royale" : "Clash Squad"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Mode</p>
                      <p className="text-sm font-medium text-white">{tournament.mode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Prize</p>
                      <p className="text-sm font-medium" style={{ color: tournament.background_color || '#6D28D9' }}>
                        {tournament.prize_coins} Coins
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Players</p>
                      <p className="text-sm font-medium text-white">{tournament.current_players}/{tournament.max_players}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Registration</span>
                      <span className="text-white/60">
                        {Math.round((tournament.current_players / tournament.max_players) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ 
                          width: `${(tournament.current_players / tournament.max_players) * 100}%`,
                          backgroundColor: tournament.background_color || '#6D28D9'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Join Button (only if open) */}
                  {tournament.status === "open" && (
                    <div className="mt-4">
                      <span className="inline-block w-full px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm font-medium text-center group-hover:bg-purple-600/30 transition">
                        View Tournament →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}