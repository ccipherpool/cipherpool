import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trophy, Users, Coins, Clock, Map as MapIcon, ChevronRight, Zap, Filter } from "lucide-react";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [tournaments, searchTerm, filterStatus]);

  const fetchTournaments = async () => {
    try {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTournaments = () => {
    let filtered = tournaments;
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }
    setFilteredTournaments(filtered);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "active":
      case "in_progress":
        return { label: "EN COURS", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
      case "upcoming":
      case "registration_open":
      case "open":
        return { label: "INSCRIPTIONS", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" };
      case "completed":
        return { label: "TERMINÉ", color: "text-neutral-500", bg: "bg-neutral-500/10", border: "border-neutral-500/20" };
      default:
        return { label: "À VENIR", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" };
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <Trophy className="text-purple-400" size={24} />
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Tournois</h1>
          </div>
          <p className="text-neutral-500 font-medium max-w-md">Découvre les compétitions les plus intenses et gagne des récompenses exclusives.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-purple-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f0f1a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-[#0f0f1a] border border-white/5 rounded-2xl py-4 pl-12 pr-10 text-white font-bold text-sm uppercase tracking-widest outline-none focus:border-purple-500/50 transition-all cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="active">En cours</option>
              <option value="upcoming">À venir</option>
              <option value="completed">Terminés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredTournaments.map((t, i) => {
              const status = getStatusInfo(t.status);
              return (
                <motion.div
                  layout
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative bg-[#0f0f1a] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-purple-500/30 transition-all duration-500 shadow-2xl"
                >
                  {/* Card Image/Overlay */}
                  <div className="h-48 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 relative overflow-hidden">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-transparent to-transparent" />
                     
                     {/* Status Badge */}
                     <div className={`absolute top-6 right-6 px-4 py-1.5 rounded-full ${status.bg} ${status.border} ${status.color} text-[10px] font-black tracking-[0.2em] backdrop-blur-md`}>
                        {status.label}
                     </div>

                     <div className="absolute bottom-4 left-8">
                        <div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">
                           <MapIcon size={12} />
                           {t.mode || "Bermuda"}
                        </div>
                        <h3 className="text-2xl font-black tracking-tighter uppercase italic text-white group-hover:text-purple-400 transition-colors leading-none">
                           {t.name}
                        </h3>
                     </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-8 pt-4 space-y-6">
                     <p className="text-neutral-500 text-sm font-medium line-clamp-2 leading-relaxed">
                        {t.description || "Rejoins ce tournoi épique et montre tes talents au monde entier. La gloire t'attend."}
                     </p>

                     {/* Info Bar */}
                     <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5">
                        <div className="text-center">
                           <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Prize</p>
                           <div className="flex items-center justify-center gap-1 text-yellow-400 font-black tracking-tighter">
                              <Coins size={14} />
                              {t.prize_coins || 0}
                           </div>
                        </div>
                        <div className="text-center border-x border-white/5">
                           <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Slots</p>
                           <div className="flex items-center justify-center gap-1 text-blue-400 font-black tracking-tighter">
                              <Users size={14} />
                              {t.current_players || 0}/{t.max_players || 48}
                           </div>
                        </div>
                        <div className="text-center">
                           <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Entrée</p>
                           <div className="flex items-center justify-center gap-1 text-purple-400 font-black tracking-tighter">
                              <Zap size={14} />
                              {t.entry_fee || 0}
                           </div>
                        </div>
                     </div>

                     {/* Action Button */}
                     <button 
                       disabled={t.status === "completed"}
                       className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                         t.status === "completed" 
                         ? "bg-white/5 text-neutral-600 cursor-not-allowed" 
                         : "bg-white text-black hover:bg-purple-600 hover:text-white shadow-xl shadow-black/20"
                       }`}
                     >
                        {t.status === "completed" ? "Tournoi Terminé" : "S'inscrire Maintenant"}
                        {t.status !== "completed" && <ChevronRight size={16} />}
                     </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTournaments.length === 0 && (
        <div className="text-center py-40 bg-[#0f0f1a] border border-white/5 rounded-[3rem]">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <Trophy size={40} className="text-neutral-700" />
          </div>
          <h3 className="text-2xl font-black tracking-tighter uppercase italic mb-2">Aucun tournoi trouvé</h3>
          <p className="text-neutral-500 font-medium">Reviens plus tard pour de nouvelles compétitions.</p>
        </div>
      )}
    </div>
  );
}
