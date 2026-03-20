import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function TournamentWaiting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  // ✅ FIX: subscription séparée — dépend de currentUserId pour éviter le stale closure
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`waiting-${id}`) // channel unique par tournoi
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "tournament_participants",
        filter: `tournament_id=eq.${id}`
      }, (payload) => {
        // Vérifie si c'est notre demande (par userRequest state)
        setUserRequest(prev => {
          if (!prev || payload.new.user_id !== prev.user_id) return prev;
          if (payload.new.status === "approved") {
            navigate(`/tournaments/${id}/room`);
          }
          return payload.new;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id, navigate]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    // جلب البطولة
    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    setTournament(tournamentData);

    // جلب طلب المستخدم
    const { data: requestData } = await supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", id)
      .eq("user_id", user.id)
      .single();

    if (!requestData) {
      navigate(`/tournaments/${id}`);
      return;
    }

    setUserRequest(requestData);
    setLoading(false);

    // إذا كان مقبولاً، نوجه للروم
    if (requestData.status === "approved") {
      navigate(`/tournaments/${id}/room`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12 text-center">
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

        
        {/* Status Icon */}
        <div className="text-8xl mb-8 animate-pulse">
          {userRequest?.status === "pending" ? "⏳" : 
           userRequest?.status === "approved" ? "✅" : "❌"}
        </div>

        <h1 className="text-4xl font-bold mb-4">
          {userRequest?.status === "pending" && "Request Pending"}
          {userRequest?.status === "approved" && "Approved!"}
          {userRequest?.status === "rejected" && "Request Rejected"}
        </h1>

        <p className="text-xl text-white/60 mb-8">
          {userRequest?.status === "pending" && 
            "Your request has been sent to the tournament organizer. You'll be notified once approved."}
          {userRequest?.status === "approved" && 
            "Redirecting to tournament room..."}
          {userRequest?.status === "rejected" && 
            "Your request was declined by the organizer."}
        </p>

        {userRequest?.status === "pending" && (
          <div className="space-y-4">
            <div className="bg-[#11151C] border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">{tournament?.name}</h3>
              <p className="text-white/40">Waiting for organizer approval</p>
            </div>
            
            <Link
              to={`/tournaments/${id}`}
              className="inline-block px-6 py-3 border border-white/10 hover:border-white/30 rounded-lg transition"
            >
              ← Back to Tournament
            </Link>
          </div>
        )}

        {userRequest?.status === "rejected" && (
          <Link
            to="/tournaments"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
          >
            Browse Other Tournaments
          </Link>
        )}
      </div>
    </div>
  );
}