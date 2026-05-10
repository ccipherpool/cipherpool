import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Wallet, 
  TrendingUp, 
  BarChart3, 
  PlusCircle, 
  History, 
  Download,
  Zap,
  ArrowUpRight
} from "lucide-react";

export default function EconomyTab({ stats = {}, setMessage }) {
  return (
    <motion.div
      key="economy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Wallet size={24} className="text-emerald-500" /> Logistics Control
         </h2>
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            Operational Economy
         </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { label: "Assets in Sync", value: (stats.totalCoins || 0).toLocaleString(), icon: Wallet, color: "text-cyber-gold" },
          { label: "Inflow Today", value: `+${stats.todayRevenue || 0}`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Cycle Projection", value: (stats.monthlyRevenue || 0).toLocaleString(), icon: BarChart3, color: "text-blue-400" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="ultra-glass p-8 flex flex-col justify-between group border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               <card.icon size={80} />
            </div>
            <div className="space-y-2 relative z-10">
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{card.label}</p>
               <div className="flex items-baseline gap-2">
                  <p className={`text-4xl font-impact uppercase leading-none ${card.color}`}>{card.value}</p>
                  <span className={`text-[10px] font-black uppercase ${card.color}`}>CP</span>
               </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Protocol Sync</span>
               <span className="text-[8px] font-black text-mint uppercase tracking-widest">Stable</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="ultra-glass p-10 space-y-8 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <PlusCircle size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight mb-2">Asset Adjustment</h3>
            <p className="text-slate-500 text-xs font-medium max-w-sm">Directly modify unit logistics and authorize Cyber Point grants.</p>
          </div>
          
          <Link to="/super-admin/grant" className="block relative z-10">
             <button className="w-full py-5 rounded-2xl bg-white text-obsidian font-heading font-black text-[10px] uppercase tracking-[0.3em] transition-all transform hover:-translate-y-1 active:scale-95 shadow-2xl flex items-center justify-center gap-3">
                <PlusCircle size={18} /> INITIALIZE GRANT
             </button>
          </Link>
        </div>

        <div className="ultra-glass p-10 space-y-8 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Download size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-heading font-black text-white uppercase tracking-tight mb-2">Data Extraction</h3>
            <p className="text-slate-500 text-xs font-medium max-w-sm">Generate high-fidelity reports for economy audit and performance.</p>
          </div>
          
          <button 
            onClick={() => {
              if (setMessage) {
                setMessage({ type: "success", text: "Tactical data export initialized." });
                setTimeout(() => setMessage({ type: "", text: "" }), 3000);
              }
            }}
            className="w-full py-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-heading font-black text-[10px] uppercase tracking-[0.3em] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
          >
             <Download size={18} /> EXPORT AUDIT LOG
          </button>
        </div>
      </div>
    </motion.div>
  );
}
