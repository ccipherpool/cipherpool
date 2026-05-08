import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "../components/AnnouncementModal";
import TermsModal from "../components/TermsModal";

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
      <div className="h-screen flex items-center justify-center bg-obsidian">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-mint/20 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-mint border-t-transparent rounded-2xl animate-spin" />
          </div>
          <p className="font-heading font-black text-xs tracking-[0.3em] uppercase text-mint animate-pulse">
            System Initializing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-white flex">
      {/* Sidebar - Fixed */}
      <Sidebar profile={profile} />

      {/* Main Content Area */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen relative">
        {/* Navbar - Fixed to top of content area */}
        <Navbar profile={profile} />

        {/* Dynamic Page Content */}
        <main className="flex-1 pt-20 relative z-10">
          <div className="p-8 max-w-[1600px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Outlet context={{ profile, refreshProfile: fetchProfile }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Global Footer (Optional - Simple for dashboard) */}
        <footer className="p-8 border-t border-white/5 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs font-medium">
            <p>© 2026 CIPHERPOOL. All system protocols operational.</p>
            <div className="flex items-center gap-6">
              <button className="hover:text-mint transition-colors">Security Audit</button>
              <button className="hover:text-mint transition-colors">Privacy Policy</button>
              <button className="hover:text-mint transition-colors">Terms of Service</button>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      <TermsModal />
      <AnnouncementModal />
      
      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-mint/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-cyber-gold/5 blur-[100px] rounded-full" />
      </div>
    </div>
  );
}
