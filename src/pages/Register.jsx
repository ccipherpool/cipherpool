"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Mail, Lock, User, Hash, AlertCircle, ChevronLeft, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const FormInput = ({ icon, type, placeholder, value, onChange, required }) => (
    <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            {icon}
        </div>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full pl-10 pr-3 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-mint/50 focus:bg-white/[0.08] transition-all duration-200 text-sm"
        />
    </div>
);

const VideoBackground = ({ videoUrl }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    }, []);
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-10" />
            <video ref={videoRef} className="absolute inset-0 min-w-full min-h-full object-cover w-auto h-auto" autoPlay loop muted playsInline>
                <source src={videoUrl} type="video/mp4" />
            </video>
        </div>
    );
};

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', email: '', password: '', ffid: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });
            if (authError) throw authError;
            if (authData.user) {
                const { error: profileError } = await supabase.from('profiles').insert([{
                    id: authData.user.id,
                    username: formData.username,
                    email: formData.email,
                    free_fire_id: formData.ffid,
                    role: 'user'
                }]);
                if (profileError) throw profileError;
            }
            navigate("/dashboard");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#020617]">
            <VideoBackground videoUrl="https://assets.mixkit.co/videos/preview/mixkit-abstract-blue-and-purple-smoke-background-30043-large.mp4" />

            {/* Accent glows */}
            <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-mint/[0.08] rounded-full blur-[100px] z-10 pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-500/[0.08] rounded-full blur-[80px] z-10 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-20 w-full max-w-md"
            >
                {/* Back link */}
                <div className="mb-5 flex justify-center">
                    <Link to="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/70 transition-colors group">
                        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Retour à l'accueil</span>
                    </Link>
                </div>

                <div className="p-8 rounded-2xl backdrop-blur-2xl bg-black/50 border border-white/10 shadow-2xl">
                    {/* Header */}
                    <div className="mb-6 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 rotate-3 mx-auto"
                            style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)", boxShadow: "0 0 30px rgba(16,185,129,0.25)" }}>
                            <Gamepad2 className="text-white -rotate-3" size={26} />
                        </div>

                        <h2 className="text-3xl font-black mb-1 relative inline-block group">
                            <span className="absolute -inset-2 bg-gradient-to-r from-indigo-600/25 via-mint/25 to-indigo-500/25 blur-2xl opacity-70 group-hover:opacity-100 transition-all duration-500 animate-pulse rounded-full" />
                            <span className="relative text-white">
                                CIPHER<span className="text-mint">POOL</span>
                            </span>
                        </h2>

                        <div className="mt-2 flex flex-col items-center gap-0.5">
                            <span className="text-sm text-white/60 animate-pulse">Créer un compte</span>
                            <span className="text-[11px] text-white/30">[Rejoins l'arène et domine]</span>
                            <div className="flex gap-2 mt-1.5 text-sm opacity-60">
                                <span className="animate-pulse">⚔️</span>
                                <span className="animate-bounce">🎮</span>
                                <span className="animate-pulse">🏆</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <FormInput
                            icon={<User size={17} />}
                            type="text"
                            placeholder="Nom d'utilisateur"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                        <FormInput
                            icon={<Mail size={17} />}
                            type="email"
                            placeholder="Adresse email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                        <FormInput
                            icon={<Hash size={17} />}
                            type="text"
                            placeholder="Free Fire ID (optionnel)"
                            value={formData.ffid}
                            onChange={(e) => setFormData({ ...formData, ffid: e.target.value })}
                        />
                        <div className="relative">
                            <FormInput
                                icon={<Lock size={17} />}
                                type={showPassword ? "text" : "password"}
                                placeholder="Mot de passe"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs"
                                >
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                style={{
                                    background: loading
                                        ? 'rgba(16,185,129,0.4)'
                                        : 'linear-gradient(135deg, #4f46e5, #10b981)',
                                    boxShadow: loading ? 'none' : '0 0 20px rgba(16,185,129,0.2), 0 4px 15px rgba(79,70,229,0.2)',
                                }}
                            >
                                {loading ? 'Création...' : 'Créer mon compte'}
                            </button>
                        </div>
                    </form>

                    <p className="mt-7 text-center text-sm text-white/40">
                        Déjà un compte?{' '}
                        <Link to="/login" className="font-bold text-mint hover:text-mint/70 transition-colors">
                            Se connecter
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
