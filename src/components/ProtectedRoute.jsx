import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * ProtectedRoute v3 — AUTH ONLY, aucun appel DB.
 * Le check de rôle est géré par chaque page admin.
 * Non connecté → redirige vers / (landing page).
 */
export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (user === undefined) {
    return (
      <div style={{ minHeight:"100vh", background:"#050508", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid #7c3aed33", borderTop:"3px solid #7c3aed", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Non connecté → landing page
  if (!user) return <Navigate to="/" replace />;

  return children;
}