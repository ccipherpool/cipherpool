"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Mail, Lock, Send, AlertCircle, ChevronLeft, Gamepad2 } from 'lucide-react';
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

const ToggleSwitch = ({ checked, onChange, id }) => (
    <div className="relative inline-block w-9 h-5 cursor-pointer flex-shrink-0" onClick={onChange}>
        <input type="checkbox" id={id} className="sr-only" checked={checked} readOnly />
        <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${checked ? 'bg-mint' : 'bg-white/20'}`}>
            <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow ${checked ? 'translate-x-4' : ''}`} />
        </div>
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

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
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
            <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-mint/[0.08] rounded-full blur-[100px] z-10 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/[0.08] rounded-full blur-[80px] z-10 pointer-events-none" />

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
                    <div className="mb-7 text-center">
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
                            <span className="text-sm text-white/60 animate-pulse">Connexion au serveur</span>
                            <span className="text-[11px] text-white/30">[Appuie Entrée pour rejoindre l'arène]</span>
                            <div className="flex gap-2 mt-1.5 text-sm opacity-60">
                                <span className="animate-pulse">⚔️</span>
                                <span className="animate-bounce">🎮</span>
                                <span className="animate-pulse">🏆</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInput
                            icon={<Mail size={17} />}
                            type="email"
                            placeholder="Adresse email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="relative">
                            <FormInput
                                icon={<Lock size={17} />}
                                type={showPassword ? "text" : "password"}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                        <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-2.5">
                                <ToggleSwitch checked={remember} onChange={() => setRemember(!remember)} id="remember-me" />
                                <label htmlFor="remember-me" className="text-sm text-white/60 cursor-pointer hover:text-white transition-colors select-none" onClick={() => setRemember(!remember)}>
                                    Se souvenir
                                </label>
                            </div>
                            <a href="#" className="text-sm text-white/50 hover:text-mint transition-colors">
                                Mot de passe oublié?
                            </a>
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
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="mt-7 mb-5 flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/[0.07]" />
                        <span className="text-white/30 text-xs">Rejoindre via</span>
                        <div className="flex-1 h-px bg-white/[0.07]" />
                    </div>

                    {/* Social buttons */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <a href="https://t.me/cipherpool" target="_blank" rel="noopener noreferrer"
                            className="flex flex-col items-center gap-1.5 p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/50 hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all">
                            <Send size={17} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Telegram</span>
                        </a>
                        <a href="https://discord.gg/cipherpool" target="_blank" rel="noopener noreferrer"
                            className="flex flex-col items-center gap-1.5 p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/50 hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.093.12 18.128.15 18.15a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                            <span className="text-[8px] font-black uppercase tracking-widest">Discord</span>
                        </a>
                        <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/50 hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all cursor-pointer">
                            <span className="text-base leading-none">🔥</span>
                            <span className="text-[8px] font-black uppercase tracking-widest">Free Fire</span>
                        </div>
                    </div>

                    <p className="mt-7 text-center text-sm text-white/40">
                        Pas encore de compte?{' '}
                        <Link to="/register" className="font-bold text-mint hover:text-mint/70 transition-colors">
                            S'inscrire
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
