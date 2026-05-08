import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Shield, 
  Zap, 
  Users2, 
  Crown, 
  Sword, 
  Gamepad2, 
  Play, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  Target,
  Medal,
  Star,
  Flame,
  Globe
} from "lucide-react";
import { HeroGeometric } from "../components/ui/HeroGeometric";
import Button from "../components/ui/Button";

// --- Sub-components ---

const Nav = () => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-obsidian/50 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-mint rounded-xl flex items-center justify-center text-obsidian">
          <Sparkles size={24} fill="currentColor" />
        </div>
        <span className="font-heading font-black text-xl tracking-tighter text-white uppercase">
          Cipher<span className="text-mint">Pool</span>
        </span>
      </Link>
      
      <div className="hidden md:flex items-center gap-8">
        {['Tournaments', 'Leaderboard', 'Clans', 'About'].map(item => (
          <Link key={item} to={`/${item.toLowerCase()}`} className="text-sm font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">
            {item}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Login</Button>
        <Button variant="primary" size="sm" onClick={() => navigate("/register")}>Join the Arena</Button>
      </div>
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="p-8 rounded-3xl bg-obsidian-light/50 border border-white/5 hover:border-mint/20 transition-all group"
  >
    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-mint group-hover:bg-mint/10 transition-all mb-6">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-heading font-black text-white mb-3 uppercase tracking-tight">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm font-medium">{desc}</p>
  </motion.div>
);

const StatItem = ({ label, value, colorClass }) => (
  <div className="text-center px-8 py-4 border-r border-white/5 last:border-0">
    <p className={`text-4xl font-heading font-black tracking-tighter mb-1 ${colorClass}`}>{value}</p>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</p>
  </div>
);

// --- Main Page ---

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obsidian selection:bg-mint selection:text-obsidian overflow-hidden">
      <Nav />
      
      {/* Hero Section */}
      <HeroGeometric 
        badge="Maroc's Premier Esports Platform"
        title1="DOMINATE THE"
        title2="VIRTUAL ARENA"
      />

      {/* Hero CTA Override - Adding manual buttons below HeroGeometric */}
      <div className="relative z-20 -mt-40 flex justify-center pb-40">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Button variant="primary" size="xl" onClick={() => navigate("/register")} className="px-12">
            START YOUR JOURNEY <ArrowRight className="ml-2" size={20} />
          </Button>
          <Button variant="outline" size="xl" onClick={() => navigate("/tournaments")} className="px-12 border-white/20">
            VIEW TOURNAMENTS
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <section className="relative z-10 py-12 bg-obsidian-light border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-between min-w-[800px]">
            <StatItem label="Active Players" value="10k+" colorClass="text-mint" />
            <StatItem label="Tournaments" value="500+" colorClass="text-cyber-gold" />
            <StatItem label="Total Prize" value="100k CP" colorClass="text-mint" />
            <StatItem label="Verified Clans" value="150+" colorClass="text-cyber-gold" />
            <StatItem label="Security Score" value="99.9%" colorClass="text-mint" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-6xl font-heading font-black tracking-tighter mb-4 uppercase">
              REDEFINING <span className="text-mint">COMPETITION</span>
            </h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">
              CipherPool provides the infrastructure for professional-grade tournaments. 
              Real-time tracking, manual verification, and instant rewards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield} 
              title="Verified Results" 
              desc="Every match is manually audited by our professional referee team. Anti-cheat protocols and ID verification ensure fair play for everyone."
              delay={0.1}
            />
            <FeatureCard 
              icon={Zap} 
              title="Instant Rewards" 
              desc="Win matches and get your CP tokens instantly in your secure wallet. Redeem for premium store items or participate in elite brackets."
              delay={0.2}
            />
            <FeatureCard 
              icon={Globe} 
              title="Global Community" 
              desc="Join the biggest network of Free Fire players in Morocco. Connect with clans, find teammates, and compete for the national title."
              delay={0.3}
            />
            <FeatureCard 
              icon={Trophy} 
              title="Daily Brackets" 
              desc="Fresh tournaments every single day across all modes: Solo, Duo, and Squad. There's always a battle waiting for you."
              delay={0.4}
            />
            <FeatureCard 
              icon={TrendingUp} 
              title="Advanced Stats" 
              desc="Detailed performance analytics including K/D ratio, win streaks, and heatmaps. Track your growth from amateur to pro."
              delay={0.5}
            />
            <FeatureCard 
              icon={Star} 
              title="Elite Status" 
              desc="Climb the national leaderboard and unlock exclusive badges, custom profile banners, and invitations to sponsored invitational events."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Featured Tournament Banner */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto relative rounded-[40px] overflow-hidden bg-obsidian-light border border-white/5 p-12 md:p-20 flex flex-col md:flex-row items-center gap-12 group">
          <div className="absolute inset-0 bg-gradient-to-r from-mint/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/10 border border-mint/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
              <span className="text-[10px] font-black text-mint uppercase tracking-widest">Major Event Incoming</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-heading font-black tracking-tighter mb-6 uppercase leading-none">
              Elite Cup <span className="text-mint">Season 4</span>
            </h2>
            <div className="flex flex-wrap gap-8 mb-10">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Prize Pool</p>
                <p className="text-3xl font-heading font-black text-cyber-gold tracking-tight">25,000 CP</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Registration Closes</p>
                <p className="text-3xl font-heading font-black text-white tracking-tight uppercase">48 Hours</p>
              </div>
            </div>
            <Button variant="primary" size="lg" className="px-12">REGISTER FOR SEASON 4</Button>
          </div>
          <div className="relative z-10 w-full md:w-1/3 aspect-square glass-card flex items-center justify-center p-8 group-hover:rotate-2 transition-transform duration-700">
             <Trophy size={120} className="text-mint drop-shadow-[0_0_30px_#10B981]" />
          </div>
        </div>
      </section>

      {/* Testimonials Bento */}
      <section className="py-32 px-6 bg-obsidian-light/30">
        <div className="max-w-7xl mx-auto">
           <div className="mb-20">
            <h2 className="text-4xl font-heading font-black tracking-tighter uppercase">
              VOICES FROM <span className="text-mint">THE ARENA</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Ahmed Pro", role: "Elite Cup Winner", quote: "The only platform in Morocco that truly respects competitive players. Fast payouts and professional staff." },
              { name: "Yassine Gamer", role: "Clan Leader", quote: "Managing my squad has never been easier. The mobile experience is flawless, we track everything in real-time." },
              { name: "Sara Esports", role: "Top Streamer", quote: "I recommend CipherPool to all my followers. It's the most secure and fair platform available today." }
            ].map((t, i) => (
              <div key={i} className="p-8 rounded-3xl bg-obsidian border border-white/5 flex flex-col justify-between">
                <p className="text-slate-400 font-medium italic mb-8">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-black">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase">{t.name}</p>
                    <p className="text-[10px] font-black text-mint uppercase tracking-widest">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-mint/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-6xl md:text-8xl font-heading font-black tracking-tighter mb-8 uppercase leading-none">
            READY TO <span className="text-mint">RISE?</span>
          </h2>
          <p className="text-slate-500 font-medium text-lg mb-12 max-w-2xl mx-auto">
            Join 10,000+ players who are already competing for glory. 
            Your path to professional esports starts here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button variant="primary" size="xl" onClick={() => navigate("/register")} className="px-16">
              GET STARTED NOW
            </Button>
            <Link to="/support" className="text-slate-400 hover:text-white font-black text-xs uppercase tracking-[0.3em] transition-colors">
              CONTACT SUPPORT
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-white/5 bg-obsidian text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-mint rounded-lg flex items-center justify-center text-obsidian">
                <Sparkles size={18} fill="currentColor" />
              </div>
              <span className="font-heading font-black text-lg tracking-tighter text-white uppercase">
                Cipher<span className="text-mint">Pool</span>
              </span>
            </div>
            <div className="flex items-center gap-8">
              {['Privacy', 'Terms', 'Security', 'Contact'].map(item => (
                <a key={item} href="#" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                  {item}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Globe size={18} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Ops / Morocco</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
            © 2026 CipherPool Protocols. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
