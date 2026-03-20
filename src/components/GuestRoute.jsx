import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * GuestRoute — réservé aux visiteurs non connectés.
 * Si l'utilisateur est connecté → redirige vers /dashboard.
 */
export default function GuestRoute({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Loading
  if (user === undefined) {
    return (
      <div style={{ minHeight:"100vh", background:"#050508", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid #7c3aed33", borderTop:"3px solid #7c3aed", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Connecté → dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}