import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  User, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Clock,
  ExternalLink,
  Target
} from "lucide-react";

export default function ReportsTab({ reports, resolveReport }) {
  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-500" /> Tactical Alerts
         </h2>
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            {reports.length} Anomalies Detected
         </span>
      </div>

      {reports.length === 0 ? (
        <div className="py-20 text-center ultra-glass border-white/5 opacity-40">
           <ShieldAlert size={64} className="mx-auto mb-4" />
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Protocol Violations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-8 group relative overflow-hidden transition-all hover:border-red-500/20"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                 <AlertTriangle size={120} className="text-red-500" />
              </div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                  report.type === "cheat"  ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" :
                  report.type === "insult" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                  "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  Classification: {report.type}
                </div>
                <div className="flex items-center gap-2 text-[9px] font-medium text-slate-600">
                   <Clock size={12} /> {new Date(report.created_at).toLocaleTimeString()}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4">
                   <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full border-2 border-obsidian bg-white/5 flex items-center justify-center text-slate-500" title="Reporter">
                         <User size={18} />
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-obsidian bg-red-500/10 flex items-center justify-center text-red-500" title="Reported">
                         <Target size={18} />
                      </div>
                   </div>
                   <div className="min-w-0">
                      <p className="text-xs font-bold text-white uppercase tracking-tight truncate">
                         {report.reported?.username || "Unit-82"}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium">Flagged by: {report.reporter?.username || "Agent-01"}</p>
                   </div>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                   <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
                      "{report.reason || "No technical brief provided."}"
                   </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap gap-2 relative z-10">
                {[
                  { label: "Warn Unit", action: "warning", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
                  { label: "Mute Channel", action: "mute", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
                  { label: "Authorize Ban", action: "ban", color: "text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
                  { label: "Ignore Signal", action: "ignore", color: "text-slate-500 bg-white/5 border-white/10" },
                ].map(btn => (
                  <button
                    key={btn.action}
                    onClick={() => resolveReport(report.id, btn.action)}
                    className={`flex-1 px-4 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${btn.color}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
