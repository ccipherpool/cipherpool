import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useVerification } from "../hooks/useVerification";
import VerificationBanner from "../components/VerificationBanner";

export default function TournamentDetails() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [requesting,setRequesting]= useState(false);
  const [profile,  setProfile]    = useState(null);
  const [isApproved, setIsApproved] = useState(false);

  // ── Vérification ──────────────────────────────────────────────
  const { canInteract, requireVerified } = useVerification(profile);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: userData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      setProfile(userData);
    }

    const { data: t, error } = await supabase
      .from("tournaments").select("*").eq("id", id).single();

    if (error || !t) { navigate("/tournaments"); return; }
    setTournament(t);

    if (user) {
      const { data: req } = await supabase
        .from("tournament_participants")
        .select("*").eq("tournament_id", id).eq("user_id", user.id).maybeSingle();
      setUserRequest(req);
      setIsApproved(req?.status === "approved");
    }

    setLoading(false);
  };

  // ── Join ──────────────────────────────────────────────────────
  const requestToJoin = () => {
    if (!profile) { navigate("/login"); return; }
    // ✅ Bloque si compte non approuvé
    requireVerified(() => _doJoin());
  };

  const _doJoin = async () => {
    if (tournament.status !== "open")                          { alert("❌ Ce tournoi n'est pas ouvert."); return; }
    if (tournament.current_players >= tournament.max_players)  { alert("❌ Ce tournoi est complet."); return; }

    setRequesting(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase
        .from("tournament_participants")
        .insert([{ tournament_id: id, user_id: user.id, status: "pending" }])
        .select();

      if (error) {
        if (error.code === "23505") alert("Tu as déjà demandé à rejoindre ce tournoi.");
        else alert("Erreur: " + error.message);
      } else {
        alert("✅ Demande envoyée !");
        navigate(`/tournaments/${id}/waiting`);
      }
    } catch (err) {
      alert("Erreur inattendue.");
    }
    setRequesting(false);
  };

  const goToRoom = () => navigate(`/tournaments/${id}/room`);

  if (loading) return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <div className="text-white/40">Chargement...</div>
    </div>
  );

  const isOrganizer = tournament?.created_by === profile?.id ||
    ["admin", "fondateur", "super_admin", "founder"].includes(profile?.role);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">

      {/* Hero */}
      <div className="bg-cover bg-center relative" style={{ height:"clamp(140px,30vw,384px)", backgroundImage: tournament?.banner_url ? `url(${tournament.banner_url})` : `linear-gradient(135deg,${tournament?.background_color||"#6D28D9"},#4C1D95)` }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="max-w-7xl mx-auto">
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

            <h1 className="text-5xl font-bold text-white mb-3">{tournament?.name}</h1>
            <p className="text-xl text-white/80 max-w-3xl">{tournament?.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">

        {/* ✅ Bannière de vérification pour les non-approuvés */}
        <VerificationBanner profile={profile} />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {[
            { label:"Type",       value: tournament?.game_type === "battle_royale" ? "Battle Royale" : "Clash Squad" },
            { label:"Mode",       value: tournament?.mode },
            { label:"Joueurs",    value: `${tournament?.current_players}/${tournament?.max_players}` },
            { label:"Prix",       value: `${tournament?.prize_coins} Coins`, colored: true },
            { label:"Inscription",value: `${tournament?.entry_fee} Coins` },
          ].map(s => (
            <div key={s.label} className="bg-[#11151C] border border-white/5 rounded-xl p-6">
              <p className="text-sm text-white/40 mb-2">{s.label}</p>
              <p className={`text-xl font-bold ${s.colored ? "" : "text-white"}`}
                style={s.colored ? { color: tournament?.background_color || "#6D28D9" } : {}}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">

          {/* Zone action principale */}
          <div className="md:col-span-2">
            <div className="bg-[#11151C] border border-white/5 rounded-xl p-8">
              {profile ? (<>

                {/* Organisateur */}
                {isOrganizer && (
                  <div className="rounded-xl p-8 text-center border-2" style={{ borderColor:"#7c3aed" }}>
                    <div className="text-6xl mb-4">🛡️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Accès Organisateur</h2>
                    <p className="text-white/40 mb-6">Vous gérez ce tournoi.</p>
                    <button onClick={goToRoom} className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-lg transition">
                      ⚡ Gérer la salle
                    </button>
                  </div>
                )}

                {/* Approuvé dans ce tournoi */}
                {!isOrganizer && isApproved && (
                  <div className="rounded-xl p-8 text-center border-2" style={{ borderColor: tournament?.background_color || "#6D28D9" }}>
                    <div className="text-6xl mb-4">🎮</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Votre place est réservée !</h2>
                    <p className="text-white/40 mb-6">Rejoignez la salle dès maintenant.</p>
                    <button onClick={goToRoom}
                      className="inline-block px-8 py-4 rounded-lg font-medium text-lg transition hover:scale-105"
                      style={{ backgroundColor: tournament?.background_color || "#7c3aed", color:"#fff" }}>
                      🔥 Rejoindre la salle
                    </button>
                  </div>
                )}

                {/* Pas encore de demande */}
                {!isOrganizer && !isApproved && !userRequest && tournament?.current_players < tournament?.max_players && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Rejoindre le tournoi</h2>
                    {/* ✅ Bouton bloqué si non-vérifié */}
                    <button
                      onClick={requestToJoin}
                      disabled={requesting}
                      className="px-8 py-4 rounded-lg font-medium text-lg transition bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      {requesting ? "Envoi..." : "Demander à rejoindre"}
                    </button>
                    {/* Message si compte en attente */}
                    {!canInteract && (
                      <p className="mt-3 text-sm" style={{ color:"#f59e0b" }}>
                        ⏳ Ton compte doit être validé par un admin pour rejoindre des tournois.
                      </p>
                    )}
                  </div>
                )}

                {/* Tournoi complet */}
                {!isOrganizer && !isApproved && !userRequest && tournament?.current_players >= tournament?.max_players && (
                  <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400">❌ Ce tournoi est complet.</p>
                  </div>
                )}

                {/* Demande existante */}
                {!isOrganizer && !isApproved && userRequest && (
                  <div className={`p-6 rounded-lg ${
                    userRequest.status === "pending"  ? "bg-yellow-500/10 border border-yellow-500/30" :
                    userRequest.status === "approved" ? "bg-green-500/10 border border-green-500/30" :
                    "bg-red-500/10 border border-red-500/30"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl ${
                        userRequest.status === "pending"  ? "text-yellow-400" :
                        userRequest.status === "approved" ? "text-green-400" :
                        "text-red-400"
                      }`}>
                        {userRequest.status === "pending" ? "⏳" : userRequest.status === "approved" ? "✅" : "❌"}
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold mb-1 ${
                          userRequest.status === "pending"  ? "text-yellow-400" :
                          userRequest.status === "approved" ? "text-green-400" : "text-red-400"
                        }`}>
                          {userRequest.status === "pending" && "Demande en attente"}
                          {userRequest.status === "approved" && "Approuvé !"}
                          {userRequest.status === "rejected" && "Demande refusée"}
                        </h3>
                        <p className="text-white/60 text-sm">
                          {userRequest.status === "pending" && "En attente de validation par l'organisateur."}
                          {userRequest.status === "approved" && "Tu peux maintenant participer."}
                          {userRequest.status === "rejected" && "Ta demande a été déclinée."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </>) : (
                <div className="text-center">
                  <p className="text-white/60 mb-4">Connecte-toi pour rejoindre ce tournoi</p>
                  <Link to="/login" className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition">
                    Connexion
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Info rapide */}
          <div className="bg-[#11151C] border border-white/5 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Informations</h3>
            <div className="space-y-4">
              {tournament?.start_date && (
                <div>
                  <p className="text-sm text-white/40">Date de début</p>
                  <p className="text-white font-medium">{new Date(tournament.start_date).toLocaleDateString("fr-FR")}</p>
                </div>
              )}
              <div className="pt-4 border-t border-white/5">
                <p className="text-sm text-white/40 mb-2">Inscriptions</p>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300 rounded-full"
                    style={{ width:`${(tournament?.current_players/tournament?.max_players)*100}%`, backgroundColor:tournament?.background_color||"#6D28D9" }}/>
                </div>
                <p className="text-xs text-white/40 mt-2 text-right">
                  {tournament?.current_players}/{tournament?.max_players} places
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Règles */}
        <div className="bg-[#11151C] border border-white/5 rounded-xl p-8">
          <h3 className="text-xl font-bold text-white mb-4">Règlement</h3>
          <ul className="space-y-3 text-white/60">
            {["Tous les joueurs doivent avoir un compte vérifié.",
              "Le fair-play est obligatoire — tout triche entraîne un ban permanent.",
              "Les joueurs doivent être prêts 15 minutes avant le début."].map((r,i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-purple-400 mt-1">•</span><span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}