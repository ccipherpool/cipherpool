"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { 
    Eye, 
    EyeOff, 
    Mail, 
    Lock, 
    Globe, 
    MessageSquare, 
    Gamepad2,
    ChevronLeft,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

// FormInput Component
const FormInput = ({ icon, type, placeholder, value, onChange, required }) => {
    return (
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                {icon}
            </div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:border-mint/50 focus:bg-white/[0.06] transition-all duration-500 font-mono tracking-widest uppercase text-sm"
            />
        </div>
    );
};

// SocialButton Component
const SocialButton = ({ icon }) => {
    return (
        <button type="button" className="flex items-center justify-center p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white/40 hover:bg-white/[0.08] hover:text-white transition-all duration-300">
            {icon}
        </button>
    );
};

// ToggleSwitch Component
const ToggleSwitch = ({ checked, onChange, id }) => {
    return (
        <div className="relative inline-block w-10 h-5 cursor-pointer" onClick={onChange}>
            <input
                type="checkbox"
                id={id}
                className="sr-only"
                checked={checked}
                readOnly
            />
            <div className={`absolute inset-0 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-mint' : 'bg-white/10'}`}>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${checked ? 'transform translate-x-5' : ''}`} />
            </div>
        </div>
    );
};

// VideoBackground Component
const VideoBackground = ({ videoUrl }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(error => {
                console.error("Video autoplay failed:", error);
            });
        }
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
            <div className="absolute inset-0 bg-obsidian/60 backdrop-blur-[2px] z-10" />
            <video
                ref={videoRef}
                className="absolute inset-0 min-w-full min-h-full object-cover w-auto h-auto opacity-40"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
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
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

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
                className="relative z-20 w-full max-w-lg"
            >
                {/* Back to Home */}
                <div className="mb-8 flex justify-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group">
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return to HQ</span>
                    </Link>
                </div>

                <div className="ultra-glass p-10 border-white/5">
                    <div className="mb-10 text-center">
                        <h2 className="text-4xl font-heading font-black mb-2 relative group text-white">
                            NEXUS<span className="text-mint">GATE</span>
                        </h2>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] flex flex-col items-center space-y-1">
                            <span className="animate-pulse">Initialize Secure Uplink</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <FormInput
                            icon={<Mail size={18} />}
                            type="email"
                            placeholder="EMAIL_HASH"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <div className="relative">
                            <FormInput
                                icon={<Lock size={18} />}
                                type={showPassword ? "text" : "password"}
                                placeholder="ACCESS_SEQUENCE"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <ToggleSwitch
                                    checked={remember}
                                    onChange={() => setRemember(!remember)}
                                    id="remember-me"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="text-[10px] font-black uppercase tracking-widest text-white/60 cursor-pointer hover:text-white transition-colors"
                                >
                                    Persistent
                                </label>
                            </div>
                            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                                Reset Key?
                            </a>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <AlertCircle size={16} />
                                    <span>Access Denied: {error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 rounded-2xl bg-mint text-obsidian font-heading font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'SYNCHRONIZING...' : 'ESTABLISH LINK'}
                        </button>
                    </form>

                    <div className="mt-10">
                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-white/5 absolute w-full"></div>
                            <div className="bg-transparent px-4 relative text-white/20 text-[8px] font-black uppercase tracking-[0.4em]">
                                Alternative Protocol
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-4">
                            <SocialButton icon={<Globe size={20} />} name="Google" />
                            <SocialButton icon={<MessageSquare size={20} />} name="X" />
                            <SocialButton icon={<Gamepad2 size={20} />} name="Discord" />
                        </div>
                    </div>

                    <p className="mt-10 text-center text-[10px] font-black uppercase tracking-widest text-white/40">
                        Unregistered Unit?{' '}
                        <Link to="/register" className="text-mint hover:text-white transition-colors">
                            Initialize Profile
                        </Link>
                    </p>
                </div>

                {/* Footer Decor */}
                <div className="mt-8 flex justify-center opacity-20">
                    <div className="flex items-center gap-6 text-[8px] font-mono tracking-[0.4em] text-white uppercase">
                        <span>AES-256_RSA</span>
                        <div className="w-1 h-1 bg-mint rounded-full" />
                        <span>SSL_ENCRYPTED</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
