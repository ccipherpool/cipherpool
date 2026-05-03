import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Search, Trophy, Users, Coins, ChevronRight, Map as MapIcon } from "lucide-react";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    const filtered = tournaments.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredTournaments(filtered);
  }, [tournaments, searchTerm]);

  const fetchTournaments = async () => {
    try {
      const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
      setTournaments(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getStatus = (status) => {
    if (status === "active" || status === "in_progress") return { label: "EN COURS", class: "bg-emerald-100 text-emerald-700" };
    if (status === "completed") return { label: "TERMINÉ", class: "bg-slate-100 text-slate-500" };
    return { label: "OUVERT", class: "bg-blue-100 text-blue-700" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tournois</h1>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTournaments.map((t) => {
            const status = getStatus(t.status);
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${status.class}`}>{status.label}</span>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase"><MapIcon size={12}/> {t.mode || "Squad"}</div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{t.name}</h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6">{t.description || "Participez et gagnez des prix incroyables."}</p>
                  
                  <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50 mb-6">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prize</p>
                      <div className="flex items-center justify-center gap-1 text-blue-600 font-bold text-sm"><Coins size={14}/> {t.prize_coins || 0}</div>
                    </div>
                    <div className="text-center border-x border-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Joueurs</p>
                      <div className="flex items-center justify-center gap-1 text-slate-700 font-bold text-sm"><Users size={14}/> {t.current_players || 0}/{t.max_players || 48}</div>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrée</p>
                      <div className="text-slate-700 font-bold text-sm">{t.entry_fee || 0} CP</div>
                    </div>
                  </div>

                  <button className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${t.status === "completed" ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/10"}`}>
                    {t.status === "completed" ? "Terminé" : "S'inscrire"} <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
