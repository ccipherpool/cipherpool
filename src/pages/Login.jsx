import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import GamingLogin from "../components/ui/GamingLogin";
import { motion } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (email, password, remember) => {
    setError("");
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      if (remember) {
        localStorage.setItem("remember_me", email);
      } else {
        localStorage.removeItem("remember_me");
      }

      // If email not confirmed, redirect to verify page
      if (data.user && !data.user.email_confirmed_at) {
        navigate("/verify-email", { state: { email } });
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      // Friendly message for unconfirmed email
      if (err.message?.includes("Email not confirmed")) {
        setError("Please verify your email before logging in.");
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 bg-obsidian-deep">
      <GamingLogin.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 w-full max-w-md"
      >
        <GamingLogin.LoginForm 
          onSubmit={handleLogin} 
          title="COMMAND CENTER" 
          subtitle="Authorize access to the grid"
        />
        
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.5em] z-20">
        © 2026 CIPHERPOOL ARENA. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
