import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "../components/AnnouncementModal";
import TermsModal from "../components/TermsModal";
import LiquidCursor from "../components/ui/LiquidCursor";
import { BackgroundBeams } from "../components/ui/BackgroundBeams";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (prof) {
      setProfile(prof);
    }
    return user;
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-obsidian-deep">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-2 border-mint/10 rounded-[2rem] rotate-45" />
            <div className="absolute inset-0 border-2 border-mint rounded-[2rem] animate-spin [animation-duration:3s]" />
            <div className="absolute inset-4 border-2 border-cyber-gold rounded-full animate-ping" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-black text-xl tracking-[0.2em] text-white">CIPHERPOOL</h2>
            <p className="font-mono text-[10px] tracking-[0.4em] text-mint uppercase animate-pulse">Establishing Secure Uplink</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-deep text-white flex overflow-hidden">
      {/* 2026 Interactive Elements */}
      <LiquidCursor />
      <div className="noise-overlay" />
      <div className="scan-line" />
      
      {/* Sidebar - Fixed Ultra Premium */}
      <Sidebar profile={profile} />

      {/* Main Content Area */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen relative z-10">
        {/* Navbar - Floating Glass */}
        <Navbar profile={profile} />

        {/* Dynamic Page Content */}
        <main className="flex-1 pt-24 relative overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-[1800px] mx-auto min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(10px)", y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet context={{ profile, refreshProfile: fetchProfile }} />
              </motion.div>
            </AnimatePresence>
          </div>
          
          <footer className="p-12 border-t border-white/5 mt-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-opacity duration-500">
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase">CipherPool v4.0.0-PRO</p>
                <p className="text-[9px] font-medium text-slate-500">Global Infrastructure Layer // Casablanca Node</p>
              </div>
              <div className="flex items-center gap-10 text-[10px] font-black uppercase tracking-widest">
                <button className="hover:text-mint transition-colors">Audit</button>
                <button className="hover:text-mint transition-colors">Privacy</button>
                <button className="hover:text-mint transition-colors">Protocol</button>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <BackgroundBeams className="opacity-20" />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-mint/5 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-purple/5 blur-[150px] rounded-full animate-pulse-slow [animation-delay:2s]" />
      </div>

      <TermsModal />
      <AnnouncementModal />
    </div>
  );
}
