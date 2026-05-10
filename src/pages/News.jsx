import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  Newspaper, 
  Search, 
  Calendar, 
  Eye, 
  ChevronRight, 
  X, 
  Clock, 
  Tag,
  Hash,
  ArrowUpRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import Button from "../components/ui/Button";
import { format, formatDistanceToNow } from "date-fns";

const CATEGORIES = {
  general:   { label: "PROTOCOL",   color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  tournament: { label: "OPERATIONS", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  update:    { label: "MAINTENANCE", color: "text-cyber-cyan", bg: "bg-cyber-cyan/10", border: "border-cyber-cyan/20" },
  player:    { label: "INTEL",      color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  team:      { label: "SQUADRON",   color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
};

const DUMMY = [
  { id: "1", title: "Operation Genesis: Season 03 Payload Initialized", excerpt: "High-stakes tactical landscape has been updated with ultra-rare loot and immediate CP distribution protocols.", category: "tournament", featured: true, views: 1240, published_at: new Date(Date.now() - 3600000 * 2).toISOString(), tags: ["saison3", "ops"] },
  { id: "2", title: "Patch 4.2.0: Neural Sync Optimization", excerpt: "Reduced latency in result verification systems by 45%. Anti-cheat heuristics upgraded to Version 9.1.", category: "update", featured: false, views: 876, published_at: new Date(Date.now() - 3600000 * 18).toISOString(), tags: ["patch", "latency"] },
  { id: "3", title: "Unit Spotlight: Agent 'Nightmare' High-Fidelity Stats", excerpt: "Deep dive into the loadout and strategy of our current top-ranked combatant. Exclusive intel inside.", category: "player", featured: false, views: 654, published_at: new Date(Date.now() - 3600000 * 36).toISOString(), tags: ["intel", "mvp"] },
  { id: "4", title: "Encryption Protocol: Advanced Wallet Security", excerpt: "Mandatory 2FA initialization for all CP transfers over 5,000. Safeguard your tactical assets.", category: "general", featured: false, views: 432, published_at: new Date(Date.now() - 86400000 * 2).toISOString(), tags: ["security", "wallet"] },
];

export default function News() {
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNews(); }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("news").select("*, author:profiles(username, avatar_url)").eq("published", true).order("published_at", { ascending: false });
      setArticles(data?.length ? data : DUMMY);
    } catch { setArticles(DUMMY); }
    finally { setLoading(false); }
  };

  const openArticle = async (a) => {
    setSelected(a);
    try {
      await supabase.from("news").update({ views: (a.views || 0) + 1 }).eq("id", a.id);
    } catch (_) { }
  };

  const featured = articles.find(a => a.featured) || articles[0];
  const filtered = articles.filter(a => {
    const matchCat = filter === "all" || a.category === filter;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && a.id !== featured?.id;
  });

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
         <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan shadow-[0_0_10px_rgba(0,242,255,0.6)]" />
               <span className="text-[10px] font-black text-cyber-cyan uppercase tracking-[0.4em]">Signal Intelligence</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter leading-none">
               FLASH <span className="text-cyber-cyan">NEWS</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg max-w-xl">
               Real-time situational awareness and system updates. Stay synchronized with the latest tactical developments.
            </p>
         </div>

         <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyber-cyan" size={18} />
            <input 
              type="text" 
              placeholder="Filter transmission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-obsidian-light border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-cyber-cyan/30 w-full md:w-80"
            />
         </div>
      </div>

      {/* Featured Intel Card */}
      {featured && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => openArticle(featured)}
          className="relative rounded-[3rem] overflow-hidden border border-white/10 group cursor-pointer"
        >
           <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-obsidian-deep via-obsidian-deep/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-deep via-transparent to-transparent z-10" />
              <img 
                src={featured.cover_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2070"} 
                className="w-full h-full object-cover grayscale opacity-40 group-hover:scale-105 transition-transform duration-1000"
                alt="featured"
              />
           </div>

           <div className="relative z-20 p-8 md:p-16 space-y-6 max-w-3xl">
              <div className="flex items-center gap-4">
                 <span className="bg-cyber-cyan text-obsidian px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Featured Transmission
                 </span>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} /> {formatDistanceToNow(new Date(featured.published_at))} ago
                 </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-heading font-black text-white uppercase tracking-tighter leading-tight group-hover:text-cyber-cyan transition-colors">
                 {featured.title}
              </h2>
              <p className="text-slate-400 text-lg font-medium leading-relaxed">
                 {featured.excerpt}
              </p>
              <div className="pt-4 flex items-center gap-6">
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Eye size={14} /> {featured.views} Analyzed
                 </div>
                 <button className="flex items-center gap-2 text-[10px] font-black text-cyber-cyan uppercase tracking-widest group/btn">
                    Access Intel <ArrowUpRight size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                 </button>
              </div>
           </div>
        </motion.div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
         {['all', 'tournament', 'update', 'player', 'general'].map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                filter === c 
                  ? 'bg-cyber-cyan text-obsidian border-cyber-cyan shadow-[0_0_20px_rgba(0,242,255,0.3)]' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              {c === 'all' ? 'Universal Sync' : CATEGORIES[c]?.label || c}
            </button>
         ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <AnimatePresence mode="popLayout">
            {filtered.map((a, i) => {
               const cat = CATEGORIES[a.category] || CATEGORIES.general;
               return (
                  <motion.div
                    layout
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => openArticle(a)}
                    className="glass-card p-8 group cursor-pointer flex flex-col relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="flex justify-between items-start mb-6">
                        <div className={`px-3 py-1 rounded-lg border ${cat.bg} ${cat.border} ${cat.color} text-[8px] font-black uppercase tracking-widest`}>
                           {cat.label}
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">
                           {format(new Date(a.published_at), "dd MMM")}
                        </span>
                     </div>

                     <div className="flex-1 space-y-4">
                        <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight leading-tight group-hover:text-cyber-cyan transition-colors">
                           {a.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                           {a.excerpt}
                        </p>
                     </div>

                     <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                           <Eye size={12} /> {a.views}
                        </div>
                        <div className="text-[9px] font-black text-cyber-cyan uppercase tracking-widest flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                           Sync Link <ChevronRight size={12} />
                        </div>
                     </div>
                  </motion.div>
               );
            })}
         </AnimatePresence>
      </div>

      {/* Modal Detail */}
      <AnimatePresence>
         {selected && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-obsidian/90 backdrop-blur-xl"
              onClick={() => setSelected(null)}
            >
               <motion.div 
                 initial={{ scale: 0.95, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 className="w-full max-w-3xl ultra-glass overflow-hidden border-white/10"
                 onClick={e => e.stopPropagation()}
               >
                  <div className="h-64 relative">
                     <img 
                       src={selected.cover_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2070"} 
                       className="w-full h-full object-cover grayscale opacity-40"
                       alt="cover"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-obsidian-deep to-transparent" />
                     <button 
                       onClick={() => setSelected(null)}
                       className="absolute top-6 right-6 p-2 rounded-xl bg-obsidian/40 border border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-10 md:p-16 space-y-8 -mt-20 relative z-10">
                     <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-4">
                           <span className={`px-4 py-1 rounded-full border ${CATEGORIES[selected.category]?.bg} ${CATEGORIES[selected.category]?.color} ${CATEGORIES[selected.category]?.border} text-[10px] font-black uppercase tracking-widest`}>
                              {CATEGORIES[selected.category]?.label}
                           </span>
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Calendar size={14} /> {format(new Date(selected.published_at), "dd MMMM yyyy")}
                           </span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-heading font-black text-white uppercase tracking-tighter leading-tight">
                           {selected.title}
                        </h2>
                     </div>

                     <div className="prose prose-invert max-w-none">
                        <p className="text-slate-400 text-lg font-medium leading-relaxed">
                           {selected.content || selected.excerpt}
                        </p>
                     </div>

                     <div className="pt-8 border-t border-white/5 flex flex-wrap gap-4">
                        {selected.tags?.map(t => (
                           <div key={t} className="flex items-center gap-1.5 text-[10px] font-black text-cyber-cyan uppercase tracking-widest bg-cyber-cyan/5 px-3 py-1 rounded-lg">
                              <Hash size={10} /> {t}
                           </div>
                        ))}
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
