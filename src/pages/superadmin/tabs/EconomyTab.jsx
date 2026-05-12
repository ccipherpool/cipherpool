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
import { cn } from "../../../lib/utils";

export default function EconomyTab({ stats = {}, setMessage }) {
  return (
    <motion.div
      key="economy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex items-center justify-between mb-8 rotate-[-0.5deg]">
         <h2 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Wallet size={32} className="text-emerald-500" /> Logistics Control 💰
         </h2>
         <span className="font-handwritten text-xl text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-6 py-2 rounded-full border-2 border-zinc-900 dark:border-white shadow-[2px_2px_0px_0px] shadow-zinc-900">
            Operational Economy 📈
         </span>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {[
          { label: "Assets in Sync", value: (stats.totalCoins || 0).toLocaleString(), icon: Wallet, color: "text-amber-500", rotation: "rotate-[-1.5deg]" },
          { label: "Inflow Today", value: `+${stats.todayRevenue || 0}`, icon: TrendingUp, color: "text-green-500", rotation: "rotate-[1deg]" },
          { label: "Cycle Projection", value: (stats.monthlyRevenue || 0).toLocaleString(), icon: BarChart3, color: "text-blue-500", rotation: "rotate-[-1deg]" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "card-creative p-8 flex flex-col justify-between group bg-white dark:bg-zinc-900",
              card.rotation
            )}
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
               <card.icon size={80} />
            </div>
            <div className="space-y-2 relative z-10">
               <p className="font-handwritten text-xl text-zinc-500 uppercase">{card.label}</p>
               <div className="flex items-baseline gap-2">
                  <p className={cn("text-5xl font-handwritten font-bold leading-none", card.color)}>{card.value}</p>
                  <span className={cn("text-xl font-handwritten font-bold uppercase", card.color)}>CP</span>
               </div>
            </div>
            <div className="mt-8 pt-4 border-t-2 border-zinc-900 dark:border-white flex items-center justify-between relative z-10">
               <span className="font-handwritten text-lg text-zinc-400">Protocol Sync</span>
               <span className="font-handwritten text-lg text-green-500 font-bold">Stable ✨</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="card-creative p-10 space-y-8 bg-white dark:bg-zinc-900 rotate-[-1deg]">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <PlusCircle size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase mb-2">Asset Adjustment ✍️</h3>
            <p className="font-handwritten text-xl text-zinc-500 max-w-sm">Directly modify unit logistics and authorize Cyber Point grants.</p>
          </div>
          
          <Link to="/super-admin/grant" className="block relative z-10">
             <button className="btn-creative w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-2xl flex items-center justify-center gap-3">
                <PlusCircle size={24} /> INITIALIZE GRANT
             </button>
          </Link>
        </div>

        <div className="card-creative p-10 space-y-8 bg-white dark:bg-zinc-900 rotate-[1deg]">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Download size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase mb-2">Data Extraction 📋</h3>
            <p className="font-handwritten text-xl text-zinc-500 max-w-sm">Generate high-fidelity reports for economy audit and performance.</p>
          </div>
          
          <button 
            onClick={() => {
              if (setMessage) {
                setMessage({ type: "success", text: "Tactical data export initialized." });
                setTimeout(() => setMessage({ type: "", text: "" }), 3000);
              }
            }}
            className="btn-creative w-full py-4 bg-emerald-400 text-zinc-900 hover:bg-emerald-300 text-2xl flex items-center justify-center gap-3"
          >
             <Download size={24} /> EXPORT AUDIT LOG
          </button>
        </div>
      </div>
    </motion.div>
  );
}

