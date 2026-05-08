import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Users2, 
  Trophy, 
  Plus, 
  Search, 
  ChevronRight, 
  Sparkles,
  Sword,
  Target,
  Flame,
  Star,
  Lock,
  Unlock
} from "lucide-react";
import Button from "../components/ui/Button";

const ClanCard = ({ clan, isMember, i }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.4 }}
      className="glass-card group overflow-hidden flex flex-col h-full"
    >
      <div className="relative h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-light to-transparent z-10" />
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-br from-mint to-transparent`} />
        {isMember && (
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1 rounded-full bg-mint/10 border border-mint/20 backdrop-blur-md flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-mint">
                My Clan
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col">
        <div className="flex items-end gap-4 -mt-10 mb-4 relative z-20">
          <div className="w-16 h-16 rounded-2xl bg-obsidian border-2 border-white/10 flex items-center justify-center text-3xl overflow-hidden shadow-2xl">
            {clan.logo_url ? (
              <img src={clan.logo_url} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <Shield size={32} className="text-mint" />
            )}
          </div>
          <div className="pb-1">
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight group-hover:text-mint transition-colors">
              {clan.name}
            </h3>
            <span className="text-[10px] font-black text-cyber-gold uppercase tracking-[0.2em]">[{clan.tag}]</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6 h-8">
          {clan.description || "No tactical description provided for this unit."}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Members</p>
            <p className="text-xs font-black text-white">{clan.member_count || 0}</p>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Wins</p>
            <p className="text-xs font-black text-mint">{clan.wins || 0}</p>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Points</p>
            <p className="text-xs font-black text-cyber-gold">{clan.points || 0}</p>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
             {clan.is_open ? <Unlock size={12} className="text-mint" /> : <Lock size={12} />}
             <span className="text-[9px] font-black uppercase tracking-widest">{clan.is_open ? 'Recruiting' : 'Invite Only'}</span>
          </div>
          <Link to={`/clans/${clan.id}`}>
             <Button variant={isMember ? 'primary' : 'outline'} size="sm" className="px-4">
                View Intel
             </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default function Clans() {
  const { profile } = useOutletContext() || {};
  const [clans, setClans] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: clansData }, { data: membershipData }] = await Promise.all([
        supabase.from("clans").select("*, clan_members(count)").order("points", { ascending: false }),
        supabase.from("clan_members").select("clan_id, role").eq("user_id", profile?.id).maybeSingle()
      ]);

      setClans((clansData || []).map(c => ({
        ...c,
        member_count: c.clan_members?.[0]?.count || 0,
      })));
      setMyMembership(membershipData);
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]);

  const filtered = clans.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter uppercase">
            CLAN <span className="text-mint">REGISTRY</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Unite with the most powerful tactical units in the arena.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
           <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mint transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search clans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-obsidian-light border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-mint/30 w-full md:w-64"
            />
          </div>
          {!myMembership && (
            <Link to="/clans/create">
              <Button className="gap-2">
                <Plus size={18} /> Create Clan
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Active Units", value: clans.length, icon: Shield, color: "text-mint" },
          { label: "Total Members", value: clans.reduce((acc, c) => acc + c.member_count, 0), icon: Users2, color: "text-cyber-gold" },
          { label: "Open Recruiting", value: clans.filter(c => c.is_open).length, icon: Unlock, color: "text-mint" },
          { label: "Locked Units", value: clans.filter(c => !c.is_open).length, icon: Lock, color: "text-slate-500" },
        ].map((s, idx) => (
          <div key={idx} className="glass-card p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg bg-white/5 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-heading font-black text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="glass-card h-80 animate-pulse bg-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center glass-card">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <Users2 size={40} className="text-slate-700" />
          </div>
          <h3 className="text-xl font-heading font-black text-white uppercase mb-2">No Clans Found</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm">
            Try adjusting your search criteria or create your own elite unit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((clan, i) => (
            <ClanCard key={clan.id} clan={clan} isMember={myMembership?.clan_id === clan.id} i={i} />
          ))}
        </div>
      )}
    </div>
  );
}
