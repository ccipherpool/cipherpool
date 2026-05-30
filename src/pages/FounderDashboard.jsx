import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { usePermissions } from "../utils/permissions";
import { Crown, Gamepad2, ClipboardList, BarChart2, Plus, Trash2, Play, FolderOpen, Trophy, Users, Clock, CheckCircle } from "lucide-react";

export default function FounderDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingResults, setPendingResults] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    full: 0,
    ongoing: 0,
    completed: 0,
    totalPlayers: 0
  });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const { isFounder, isSuperAdmin } = usePermissions(profile);

  const [newTournament, setNewTournament] = useState({
    name: "",
    description: "",
    game_type: "battle_royale",
    mode: "solo",
    max_players: 50,
    entry_fee: 0,
    prize_coins: 500,
    start_date: "",
    banner_url: "",
    background_color: "#6D28D9"
  });

  useEffect(() => {
    checkFounder();
    supabase.from("match_results").select("id", { count: "exact" })
      .eq("status", "pending")
      .then(({ count }) => setPendingResults(count || 0));
  }, []);

  const checkFounder = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(userData);

    if (userData?.role !== "founder" && userData?.role !== "super_admin") {
      navigate("/dashboard");
    } else {
      fetchTournaments(user.id);
      fetchPendingRequestsCount(user.id);
    }
  };

  const fetchTournaments = async (userId) => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    setTournaments(data || []);

    if (data) {
      const totalPlayers = data.reduce((sum, t) => sum + (t.current_players || 0), 0);
      setStats({
        total: data.length,
        open: data.filter(t => t.status === "registration_open").length,
        full: data.filter(t => t.status === "full").length,
        ongoing: data.filter(t => t.status === "ongoing").length,
        completed: data.filter(t => t.status === "completed").length,
        totalPlayers
      });
    }

    setLoading(false);
  };

  const fetchPendingRequestsCount = async (userId) => {
    const { data: tData } = await supabase
      .from("tournaments")
      .select("id")
      .eq("created_by", userId);

    if (tData && tData.length > 0) {
      const tournamentIds = tData.map(t => t.id);

      const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .in("tournament_id", tournamentIds)
        .eq("status", "pending");

      setPendingRequests(count || 0);
    }
  };

  const createTournament = async (e) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("tournaments")
      .insert([{
        ...newTournament,
        name: newTournament.name.trim(),
        description: newTournament.description?.trim() || null,
        max_players: parseInt(newTournament.max_players, 10) || 50,
        entry_fee: parseInt(newTournament.entry_fee, 10) || 0,
        prize_coins: parseInt(newTournament.prize_coins, 10) || 500,
        start_date: newTournament.start_date ? new Date(newTournament.start_date).toISOString() : null,
        created_by: user.id,
        status: "draft",
        room_status: "registration",
        current_players: 0
      }]);

    if (error) {
      alert("Error creating tournament: " + error.message);
    } else {
      setShowCreateModal(false);
      setNewTournament({
        name: "",
        description: "",
        game_type: "battle_royale",
        mode: "solo",
        max_players: 50,
        entry_fee: 0,
        prize_coins: 500,
        start_date: "",
        banner_url: "",
        background_color: "#6D28D9"
      });
      fetchTournaments(user.id);
    }
  };

  const deleteTournament = async () => {
    if (!tournamentToDelete) return;

    const tournamentId = tournamentToDelete.id;
    const tournamentName = tournamentToDelete.name;

    try {
      const { error: rpcError } = await supabase.rpc('delete_tournament_complete', {
        tournament_id: tournamentId
      });

      if (rpcError) {
        console.warn("RPC failed, trying manual delete:", rpcError.message);

        const steps = [
          { table: "match_results", column: "tournament_id" },
          { table: "room_messages", column: "tournament_id" },
          { table: "room_members", column: "tournament_id" },
          { table: "tournament_participants", column: "tournament_id" },
        ];

        for (const step of steps) {
          const { error: stepError } = await supabase
            .from(step.table)
            .delete()
            .eq(step.column, tournamentId);

          if (stepError) {
            console.warn(`Warning deleting ${step.table}:`, stepError.message);
          }
        }

        const { error: deleteError } = await supabase
          .from("tournaments")
          .delete()
          .eq("id", tournamentId);

        if (deleteError) throw deleteError;
      }

      const { data: checkData } = await supabase
        .from("tournaments")
        .select("id")
        .eq("id", tournamentId)
        .maybeSingle();

      if (checkData) {
        throw new Error("Tournament still exists after delete. Check RLS policies in Supabase.");
      }

      setShowDeleteModal(false);
      setTournamentToDelete(null);

      const { data: { user } } = await supabase.auth.getUser();
      await fetchTournaments(user.id);
      await fetchPendingRequestsCount(user.id);

      alert(`"${tournamentName}" supprimé avec succès !`);

    } catch (error) {
      console.error("Error deleting tournament:", error);
      setShowDeleteModal(false);
      setTournamentToDelete(null);
      alert(`Échec de la suppression: ${error.message}\n\nSolution: Vérifie les RLS policies dans Supabase Dashboard.`);
    }
  };

  const startMatch = async (tournamentId) => {
    try {
      const { error } = await supabase.rpc('start_match', {
        tournament_id: tournamentId
      });

      if (error) throw error;

      alert("Match démarré avec succès !");
      fetchTournaments(profile.id);
    } catch (err) {
      console.error("Error starting match:", err);
      alert("Erreur lors du démarrage du match");
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const inputCls = "w-full px-4 py-3 rounded-lg text-white text-sm outline-none transition-colors border border-white/10 focus:border-purple-500/50";
  const inputStyle = { background: "var(--cp-surface-2)" };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-white space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--cp-base), var(--cp-surface-1))" }}>
        <div className="px-6 py-6 md:px-8 md:py-8">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                {isSuperAdmin
                  ? <><Crown size={28} className="text-yellow-400 flex-shrink-0" /> SUPER ADMIN TOURNAMENTS</>
                  : <><Gamepad2 size={28} className="text-purple-400 flex-shrink-0" /> FOUNDER DASHBOARD</>
                }
              </h1>
              <p className="text-white/40 text-sm">
                Welcome back, {profile?.full_name} · {profile?.free_fire_id || "No FF ID"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/founder/requests"
                className="px-4 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                style={{ background: "rgba(234,179,8,0.08)" }}
              >
                <ClipboardList size={16} />
                <span>PENDING REQUESTS</span>
                {pendingRequests > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full font-black">
                    {pendingRequests}
                  </span>
                )}
              </Link>
              <Link
                to="/admin/results"
                className="px-4 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 border border-green-500/20 text-green-400 hover:bg-green-500/10"
                style={{ background: "rgba(16,185,129,0.08)" }}
              >
                <BarChart2 size={16} />
                <span>RÉSULTATS</span>
                {pendingResults > 0 && (
                  <span className="px-2 py-0.5 bg-green-500 text-black text-xs rounded-full font-black">
                    {pendingResults}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-sm transition flex items-center gap-2"
              >
                <Plus size={16} />
                CREATE TOURNAMENT
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-white", icon: Trophy },
              { label: "Open", value: stats.open, color: "text-green-400", icon: CheckCircle },
              { label: "Full", value: stats.full, color: "text-yellow-400", icon: Users },
              { label: "Ongoing", value: stats.ongoing, color: "text-blue-400", icon: Play },
              { label: "Players", value: stats.totalPlayers, color: "text-purple-400", icon: Users },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border border-white/5" style={{ background: "var(--cp-surface-2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={12} className={s.color} />
                  <p className="text-xs text-white/40">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter + Grid */}
      <div>
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { key: "all", label: "All", activeClass: "bg-purple-600 text-white" },
            { key: "registration_open", label: "Open", activeClass: "bg-green-600 text-white" },
            { key: "full", label: "Full", activeClass: "bg-yellow-600 text-white" },
            { key: "ongoing", label: "Ongoing", activeClass: "bg-blue-600 text-white" },
            { key: "completed", label: "Completed", activeClass: "bg-purple-600 text-white" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm transition border ${
                filter === f.key
                  ? `${f.activeClass} border-transparent`
                  : "border-white/10 text-white/60 hover:text-white/80"
              }`}
              style={filter !== f.key ? { background: "var(--cp-surface-1)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredTournaments.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/5" style={{ background: "var(--cp-base)" }}>
            <Trophy size={40} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 mb-4">No tournaments found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-purple-400 hover:text-purple-300 transition text-sm"
            >
              Create your first tournament →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-2xl border border-white/5 overflow-hidden hover:border-purple-500/40 transition group"
                style={{
                  background: "linear-gradient(135deg, var(--cp-base), var(--cp-surface-1))",
                  borderLeft: `4px solid ${tournament.background_color || '#6D28D9'}`
                }}
              >
                {tournament.banner_url && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={tournament.banner_url}
                      alt={tournament.name}
                      className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition"
                    />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 truncate">{tournament.name}</h3>
                      <p className="text-sm text-white/40 line-clamp-2">{tournament.description || "No description"}</p>
                    </div>
                    <span className={`ml-3 px-2.5 py-1 text-[10px] font-black rounded-full shrink-0 ${
                      tournament.status === "registration_open" ? "bg-green-500/20 text-green-400" :
                      tournament.status === "full" ? "bg-yellow-500/20 text-yellow-400" :
                      tournament.status === "ongoing" ? "bg-blue-500/20 text-blue-400" :
                      "bg-purple-500/20 text-purple-400"
                    }`}>
                      {tournament.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">Type</p>
                      <p className="text-sm font-medium text-white">
                        {tournament.game_type === "battle_royale" ? "Battle Royale" : "Clash Squad"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">Mode</p>
                      <p className="text-sm font-medium text-white capitalize">{tournament.mode}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">Prize</p>
                      <p className="text-sm font-medium text-purple-400">{tournament.prize_coins} Coins</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-0.5 uppercase tracking-wider">Players</p>
                      <p className="text-sm font-medium text-white">{tournament.current_players}/{tournament.max_players}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        to={`/tournaments/${tournament.id}/manage`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20"
                        style={{ background: "rgba(168,85,247,0.08)" }}
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/tournaments/${tournament.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white/80 border border-white/10 transition"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        View
                      </Link>
                      {tournament.status === "registration_open" && tournament.current_players >= 2 && (
                        <button
                          onClick={() => startMatch(tournament.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                          style={{ background: "rgba(16,185,129,0.08)" }}
                        >
                          <Play size={11} />
                          Start
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setTournamentToDelete(tournament);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 border border-red-500/20 transition"
                      style={{ background: "rgba(239,68,68,0.08)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tournament Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10" style={{ background: "var(--cp-surface-1)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Tournament</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-white/40 hover:text-white transition">✕</button>
            </div>

            <form onSubmit={createTournament} className="space-y-5">
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Tournament Name</label>
                <input
                  type="text"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
                  className={inputCls}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={newTournament.description}
                  onChange={(e) => setNewTournament({...newTournament, description: e.target.value})}
                  className={`${inputCls} h-24 resize-none`}
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Banner Image</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2.5 rounded-xl text-white text-sm font-medium transition flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                      <FolderOpen size={16} />
                      <span>Choose Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const ext = file.name.split(".").pop();
                          const path = `banners/${Date.now()}.${ext}`;
                          const { error: upErr } = await supabase.storage.from("tournament-banners").upload(path, file, { upsert: true });
                          if (upErr) { alert("Upload error: " + upErr.message); return; }
                          const { data } = supabase.storage.from("tournament-banners").getPublicUrl(path);
                          setNewTournament(prev => ({ ...prev, banner_url: data.publicUrl }));
                        }}
                      />
                    </label>
                    {newTournament.banner_url ? (
                      <img src={newTournament.banner_url} alt="banner" className="h-10 w-16 object-cover rounded-lg border border-white/20" />
                    ) : (
                      <span className="text-white/30 text-xs">None selected</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Accent Color</label>
                  <input
                    type="color"
                    value={newTournament.background_color}
                    onChange={(e) => setNewTournament({...newTournament, background_color: e.target.value})}
                    className="w-full h-11 rounded-xl border border-white/10 cursor-pointer"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Game Type</label>
                  <select
                    value={newTournament.game_type}
                    onChange={(e) => setNewTournament({...newTournament, game_type: e.target.value})}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="battle_royale">Battle Royale</option>
                    <option value="cs">Clash Squad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Mode</label>
                  <select
                    value={newTournament.mode}
                    onChange={(e) => setNewTournament({...newTournament, mode: e.target.value})}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="solo">Solo</option>
                    <option value="duo">Duo</option>
                    <option value="squad">Squad</option>
                    <option value="4v4">4v4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Max Players</label>
                  <input type="number" value={newTournament.max_players}
                    onChange={(e) => setNewTournament({...newTournament, max_players: parseInt(e.target.value)})}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Entry Fee</label>
                  <input type="number" value={newTournament.entry_fee}
                    onChange={(e) => setNewTournament({...newTournament, entry_fee: parseInt(e.target.value)})}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Prize</label>
                  <input type="number" value={newTournament.prize_coins}
                    onChange={(e) => setNewTournament({...newTournament, prize_coins: parseInt(e.target.value)})}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Start Date</label>
                <input type="datetime-local" value={newTournament.start_date}
                  onChange={(e) => setNewTournament({...newTournament, start_date: e.target.value})}
                  className={inputCls} style={inputStyle} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-5 py-3 border border-white/10 hover:border-white/30 rounded-xl text-white/70 hover:text-white font-medium text-sm transition">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-5 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium text-sm transition flex items-center justify-center gap-2">
                  <Plus size={16} />
                  Create Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 md:p-8 max-w-md w-full border border-white/10" style={{ background: "var(--cp-surface-1)" }}>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Trash2 size={18} className="text-red-400" />
              Delete Tournament
            </h3>
            <p className="text-white/60 text-sm mb-6">
              Are you sure you want to delete <span className="text-white font-semibold">{tournamentToDelete?.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-5 py-2.5 border border-white/10 hover:border-white/30 rounded-xl text-white/70 hover:text-white text-sm font-medium transition">
                Cancel
              </button>
              <button
                onClick={deleteTournament}
                className="flex-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white text-sm font-medium transition flex items-center justify-center gap-2">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
