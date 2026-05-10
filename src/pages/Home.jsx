import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Shield, 
  Zap, 
  ArrowRight,
  Sparkles,
  Target,
  Medal,
  Flame,
  Globe,
  Crown,
  Sword,
  Play,
  Menu
} from "lucide-react";
import { ShaderBackground } from "../components/ui/ShaderBackground";
import { HeroGeometric } from "../components/ui/HeroGeometric";
import { Button } from "../components/ui/Button";
import { GooeyText } from "../components/ui/GooeyText";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-obsidian-deep overflow-hidden">
      {/* 2026 Background Engine */}
      <ShaderBackground className="!absolute inset-0 z-0 opacity-40" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] h-20 md:h-24 flex items-center px-6 md:px-12 justify-between bg-obsidian/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-mint rounded-2xl flex items-center justify-center text-obsidian shadow-neon-mint rotate-45 group hover:rotate-90 transition-transform duration-500">
            <Sparkles size={20} className="-rotate-45 group-hover:rotate-0 transition-transform duration-500" fill="currentColor" />
          </div>
          <span className="font-heading font-black text-xl md:text-2xl tracking-tighter text-white">
            CIPHER<span className="text-mint">POOL</span>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-12 bg-white/5 backdrop-blur-xl border border-white/10 px-10 py-3 rounded-full">
          {['Tournaments', 'Arena', 'Clans', 'Hall of Fame'].map(item => (
            <Link key={item} to={`/${item.toLowerCase().replace(/ /g, '-')}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-mint transition-colors">
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={() => navigate("/login")} className="text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-mint transition-colors px-2">Login</button>
          <Button variant="primary" size="sm" onClick={() => navigate("/register")} className="rounded-xl md:rounded-2xl px-4 md:px-8 py-2 md:py-3 text-[10px] md:text-xs">
            Join
          </Button>
          <button className="lg:hidden p-2 text-white/60 hover:text-white">
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="h-screen flex flex-col items-center justify-center">
          <HeroGeometric 
            badge="The Future of Moroccan Esports"
            title1="ASCEND TO"
            title2="DIGITAL GLORY"
          />

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-8 mt-12"
          >
            <Button variant="primary" size="xl" onClick={() => navigate("/register")} className="px-16 py-8 text-lg rounded-[2rem] group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-3">
                INITIALIZE COMBAT <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => navigate("/tournaments")} className="px-12 py-8 text-lg rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10">
              EXPLORE TOURNAMENTS
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.5, duration: 2 }}
            className="absolute bottom-12 flex flex-col items-center gap-4"
          >
            <div className="w-[1px] h-20 bg-gradient-to-b from-mint to-transparent" />
            <span className="font-mono text-[8px] tracking-[0.5em] uppercase text-mint">Scroll to Sync</span>
          </motion.div>
        </div>

        {/* Dynamic Headline Section */}
        <section className="py-40 px-12 border-y border-white/5 bg-obsidian-deep/50 backdrop-blur-3xl relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <GooeyText 
              texts={["COMPETE", "CONQUER", "DOMINATE", "EVOLVE"]} 
              className="h-40 w-full mb-12"
              textClassName="text-7xl md:text-9xl font-heading font-black tracking-tighter text-mint"
            />
            <p className="text-slate-400 font-medium text-xl max-w-3xl leading-relaxed mt-20">
              The highest fidelity tournament platform in the MENA region. 
              Real-time synchronization, anti-cheat protocols, and immediate rewards.
            </p>
          </div>
          
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
             <div className="absolute top-0 left-1/4 w-[1px] h-full bg-white/10" />
             <div className="absolute top-0 left-2/4 w-[1px] h-full bg-white/10" />
             <div className="absolute top-0 left-3/4 w-[1px] h-full bg-white/10" />
          </div>
        </section>

        {/* Features Bento v2.0 */}
        <section className="py-60 px-12 relative">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-6 grid-rows-2 gap-8 h-[800px]">
            {/* Card 1: Security */}
            <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-3 md:row-span-1 ultra-glass p-10 flex flex-col justify-between group overflow-hidden">
              <div className="relative z-10">
                <Shield size={64} className="text-mint mb-8 group-hover:scale-110 transition-transform" />
                <h3 className="text-4xl font-heading font-black text-white uppercase leading-none mb-4">Tactical<br/>Security</h3>
                <p className="text-slate-500 font-medium text-lg">Every match is audited by AI and professional referees. 99.9% anti-cheat efficiency.</p>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-mint/5 blur-3xl rounded-full group-hover:bg-mint/10 transition-colors" />
            </motion.div>

            {/* Card 2: Instant */}
            <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-3 md:row-span-2 ultra-glass p-10 flex flex-col justify-between group bg-gradient-to-br from-mint/10 to-transparent">
               <div className="flex justify-between items-start">
                  <Zap size={80} className="text-cyber-gold group-hover:rotate-12 transition-transform duration-500" fill="currentColor" />
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyber-gold">Performance Layer</span>
                    <p className="text-4xl font-heading font-black text-white mt-2">ZERO<br/>LATENCY</p>
                  </div>
               </div>
               <div className="space-y-6">
                 <p className="text-slate-400 text-xl leading-relaxed">Integrated wallet system allows for sub-second reward distribution. Win the match, get paid instantly.</p>
                 <Button variant="secondary" size="lg" className="rounded-2xl">Link Your Wallet</Button>
               </div>
            </motion.div>

            {/* Card 3: Community */}
            <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-3 md:row-span-1 ultra-glass p-10 flex flex-col justify-between group">
               <div className="flex gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-electric-purple group-hover:bg-electric-purple/10 transition-all">
                    <Globe size={32} />
                 </div>
                 <div>
                    <h4 className="text-2xl font-heading font-black text-white uppercase">Global Network</h4>
                    <p className="text-slate-500 font-medium">Connect with 1k+ verified Moroccan warriors.</p>
                 </div>
               </div>
               <div className="flex -space-x-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-12 h-12 rounded-xl border-4 border-obsidian-deep bg-slate-800 overflow-hidden">
                       <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-xl border-4 border-obsidian-deep bg-mint flex items-center justify-center text-obsidian font-black text-xs">
                    +1k
                  </div>
               </div>
            </motion.div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="py-80 px-12 relative text-center">
           <div className="absolute inset-0 bg-gradient-to-t from-mint/10 via-transparent to-transparent pointer-events-none" />
           <motion.h2 
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 40 }}
            className="text-8xl md:text-[12rem] font-heading font-black text-white leading-none uppercase tracking-tighter"
           >
             JOIN THE<br/><span className="text-gradient-mint">ELITE</span>
           </motion.h2>
           <div className="mt-20 flex justify-center">
              <Button variant="primary" size="xl" onClick={() => navigate("/register")} className="px-24 py-10 text-2xl rounded-[3rem] shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                ENTER THE ARENA
              </Button>
           </div>
        </section>
      </main>

      <footer className="relative z-10 py-20 px-12 border-t border-white/5 bg-obsidian-deep/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-6 max-w-sm">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mint rounded-lg" />
                <span className="font-heading font-black text-xl text-white">CIPHERPOOL</span>
             </div>
             <p className="text-slate-500 font-medium leading-relaxed">
               Redefining the competitive landscape of Morocco. The ultimate destination for Free Fire athletes.
             </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-mint">Platform</p>
                <ul className="space-y-3 text-sm font-medium text-slate-400">
                  <li><Link to="/tournaments" className="hover:text-white transition-colors">Tournaments</Link></li>
                  <li><Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
                  <li><Link to="/clans" className="hover:text-white transition-colors">Clans</Link></li>
                </ul>
             </div>
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-mint">Legal</p>
                <ul className="space-y-3 text-sm font-medium text-slate-400">
                  <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
                  <li><button className="hover:text-white transition-colors">Terms of Service</button></li>
                  <li><button className="hover:text-white transition-colors">Security Audit</button></li>
                </ul>
             </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex justify-between items-center opacity-50">
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">© 2026 CipherPool Protocols. All Systems Operational.</p>
           <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Server-01: EU-Maroc</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
 <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
                  <li><button className="hover:text-white transition-colors">Terms of Service</button></li>
                  <li><button className="hover:text-white transition-colors">Security Audit</button></li>
                </ul>
             </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex justify-between items-center opacity-50">
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">© 2026 CipherPool Protocols. All Systems Operational.</p>
           <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Server-01: EU-Maroc</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
