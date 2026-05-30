import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import GamingLogin from "../components/ui/GamingLogin";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
    const navigate = useNavigate();
    const { refreshCurrentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleRegister = async ({ email, username, password }) => {
        setLoading(true);
        setError(null);
        try {
            const redirectUrl = `${window.location.origin}/email-confirmed`;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: { username },
                },
            });
            if (authError) throw authError;

            if (authData.user) {
                // identities is empty when email already exists in Supabase (no error returned)
                if (authData.user.identities?.length === 0) {
                    throw new Error("Un compte avec cet email existe déjà.");
                }

                // session is null when email confirmation is required (user not yet confirmed).
                // Profile/wallet are created by the DB trigger on auth.users insert.
                // Only run client-side upsert if we have an active session (confirmation disabled).
                if (authData.session) {
                    try {
                        await supabase.from('profiles').upsert({
                            id: authData.user.id,
                            username,
                            email,
                            role: 'user',
                        }, { onConflict: 'id' });

                        await supabase.from('wallets').upsert({
                            user_id: authData.user.id,
                            balance: 50,
                        }, { onConflict: 'user_id' });

                        await refreshCurrentUser?.(authData.user.id);
                    } catch (profileErr) {
                        console.warn('Profile setup after signup:', profileErr.message);
                    }
                }
            }

            // Always redirect to verify-email after successful signUp
            navigate("/verify-email", { state: { email } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-obsidian-deep">
            <GamingLogin.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-20 w-full max-w-md"
            >
                <GamingLogin.LoginForm 
                    onSubmit={handleRegister} 
                    isRegister={true}
                    title="REGISTER SPEC"
                    subtitle="Initialize your combat profile"
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
