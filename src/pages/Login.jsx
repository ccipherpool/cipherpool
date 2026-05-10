"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Mail, Lock, Send, AlertCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const FormInput = ({ icon, type, placeholder, value, onChange, required }) => (
    <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
            {icon}
        </div>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-mint/50 transition-colors"
        />
    </div>
);

const ToggleSwitch = ({ checked, onChange, id }) => (
    <div className="relative inline-block w-10 h-5 cursor-pointer" onClick={onChange}>
        <input type="checkbox" id={id} className="sr-only" checked={checked} readOnly />
        <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${checked ? 'bg-mint' : 'bg-white/20'}`}>
            <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
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
            <div className="absolute inset-0 bg-black/30 z-10" />
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
        <div className="relative min-h-screen bg-obsidian flex items-center justify-center p-6 overflow-hidden">
            <VideoBackground videoUrl="https://assets.mixkit.co/videos/preview/mixkit-abstract-blue-and-purple-smoke-background-30043-large.mp4" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-20 w-full max-w-md"
            >
                <div className="mb-6 flex justify-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Retour à l'accueil</span>
                    </Link>
                </div>

                <div className="p-8 rounded-2xl backdrop-blur-sm bg-black/50 border border-white/10">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 rotate-3 mx-auto"
                            style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)", boxShadow: "0 0 24px rgba(16,185,129,0.25)" }}>
                            <span className="text-white font-black text-base -rotate-3">CP</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-2 relative group">
                            <span className="absolute -inset-1 bg-gradient-to-r from-indigo-600/30 via-mint/30 to-indigo-500/30 blur-xl opacity-75 group-hover:opacity-100 transition-all duration-500 animate-pulse" />
                            <span className="relative inline-block text-3xl font-bold text-white">
                                CIPHER<span className="text-mint">POOL</span>
                            </span>
                        </h2>
                        <p className="text-white/80 flex flex-col items-center space-y-1">
                            <span className="relative inline-block animate-pulse text-sm">Connexion au serveur</span>
                            <span className="text-xs text-white/50 animate-pulse">[Appuie Entrée pour rejoindre]</span>
                            <div className="flex space-x-2 text-xs text-white/40">
                                <span className="animate-pulse">⚔️</span>
                                <span className="animate-bounce">🎮</span>
                                <span className="animate-pulse">🏆</span>
                            </div>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <FormInput
                            icon={<Mail size={18} />}
                            type="email"
                            placeholder="Adresse email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="relative">
                            <FormInput
                                icon={<Lock size={18} />}
                                type={showPassword ? "text" : "password"}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors focus:outline-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <ToggleSwitch checked={remember} onChange={() => setRemember(!remember)} id="remember-me" />
                                <label htmlFor="remember-me" className="text-sm text-white/80 cursor-pointer hover:text-white transition-colors" onClick={() => setRemember(!remember)}>
                                    Se souvenir
                                </label>
                            </div>
                            <a href="#" className="text-sm text-white/80 hover:text-mint transition-colors">
                                Mot de passe oublié?
                            </a>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-xs"
                                >
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-lg bg-mint hover:bg-mint/80 text-obsidian font-bold transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-mint/50 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-mint/20 hover:shadow-mint/40"
                        >
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-white/10 absolute w-full" />
                            <div className="bg-transparent px-4 relative text-white/60 text-sm">Rejoindre via</div>
                        </div>
                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <a href="https://t.me/cipherpool" target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                                <Send size={18} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Telegram</span>
                            </a>
                            <a href="https://discord.gg/cipherpool" target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.093.12 18.128.15 18.15a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                                </svg>
                                <span className="text-[8px] font-black uppercase tracking-widest">Discord</span>
                            </a>
                            <div className="flex flex-col items-center gap-1.5 p-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                <span className="text-lg leading-none">🔥</span>
                                <span className="text-[8px] font-black uppercase tracking-widest">Free Fire</span>
                            </div>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-sm text-white/60">
                        Pas encore de compte?{' '}
                        <Link to="/register" className="font-medium text-white hover:text-mint transition-colors">
                            S'inscrire
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
