import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Trophy, Users, Coins, Clock, Shield, Map as MapIcon, ChevronLeft, Info, Zap, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(userData);
    }

    const { data: tournamentData, error: tournamentError } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (tournamentError || !tournamentData) { navigate("/tournaments"); return; }
    setTournament(tournamentData);

    if (user) {
      const { data: requestData } = await supabase.from("tournament_participants").select("*").eq("tournament_id", id).eq("user_id", user.id).maybeSingle();
      setUserRequest(requestData);
      setIsApproved(requestData?.status === "approved");
    }
    setLoading(false);
  };

  const requestToJoin = async () => {
    if (!profile) { navigate("/login"); return; }
    if (tournament.status !== "open") { alert("❌ Inscriptions fermées."); return; }
    if (tournament.current_players >= tournament.max_players) { alert("❌ Tournoi complet."); return; }

    setRequesting(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const { error } = await supabase.from("tournament_participants").insert([{ tournament_id: id, user_id: user.id, status: "pending" }]);
      if (error) {
        if (error.code === '23505') alert("Déjà inscrit.");
        else alert("Erreur: " + error.message);
      } else {
        alert("✅ Demande envoyée !");
        navigate(`/tournaments/${id}/waiting`);
      }
    } catch (err) { alert("Une erreur est survenue."); }
    setRequesting(false);
  };

  if (loading) return <div className="min-h-screen bg-[#f4f7f9] flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const status = tournament.status === "open" ? { label: "INSCRIPTIONS OUVERTES", class: "bg-blue-100 text-blue-700" } : { label: "TERMINÉ", class: "bg-slate-100 text-slate-500" };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Back Button */}
      <button onClick={() => navigate("/tournaments")} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors">
        <ChevronLeft size={16} /> Retour aux tournois
      </button>

      {/* Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-48 md:h-64 bg-[#1e293b] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
          <div className="absolute bottom-8 left-8 md:left-12">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest mb-4 inline-block ${status.class}`}>{status.label}</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic">{tournament.name}</h1>
          </div>
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Prize Pool", val: `${tournament.prize_coins} CP`, icon: Coins, color: "text-blue-600" },
                { label: "Entrée", val: `${tournament.entry_fee} CP`, icon: Zap, color: "text-orange-500" },
                { label: "Format", val: tournament.mode || "Squad", icon: Users, color: "text-slate-600" },
                { label: "Map", val: "Bermuda", icon: MapIcon, color: "text-slate-600" },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                  <div className="flex items-center gap-2">
                    <item.icon size={16} className={item.color} />
                    <span className="font-black text-slate-900">{item.val}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Info size={18} className="text-blue-600" /> Description
              </h3>
              <p className="text-slate-600 font-medium leading-relaxed">{tournament.description || "Aucune description fournie pour ce tournoi."}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" /> Règlement
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 font-medium">
                <li className="flex items-start gap-2">• Pas de triche ni d'émulateurs autorisés.</li>
                <li className="flex items-start gap-2">• Soyez présents 15 minutes avant le début.</li>
                <li className="flex items-start gap-2">• Les résultats sont validés manuellement par le staff.</li>
              </ul>
            </div>
          </div>

          {/* Registration Card */}
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inscriptions</p>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-900">{tournament.current_players} / {tournament.max_players}</span>
                  <span className="text-xs font-bold text-slate-500">Joueurs</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${(tournament.current_players / tournament.max_players) * 100}%` }} />
                </div>
              </div>

              {isApproved ? (
                <Link to={`/tournaments/${id}/room`} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
                  <Zap size={18} /> Accéder à la salle
                </Link>
              ) : userRequest?.status === "pending" ? (
                <div className="w-full py-4 bg-orange-100 text-orange-700 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border border-orange-200">
                  <Clock size={18} /> Demande en attente
                </div>
              ) : (
                <button 
                  onClick={requestToJoin}
                  disabled={requesting || tournament.status !== "open"}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {requesting ? "Traitement..." : "S'inscrire au tournoi"}
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date du match</p>
                <p className="font-black text-slate-900">Bientôt annoncé</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
