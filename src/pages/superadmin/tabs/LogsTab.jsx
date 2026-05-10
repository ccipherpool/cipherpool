import { motion } from "framer-motion";
import { 
  Database, 
  User, 
  Activity, 
  History, 
  Clock,
  Terminal,
  ShieldAlert
} from "lucide-react";

export default function LogsTab({ logs, users }) {
  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Terminal size={24} className="text-slate-500" /> Operational Audit
         </h2>
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            Kernel Audit Trail
         </span>
      </div>

      <div className="ultra-glass border-white/5 overflow-hidden">
        <div className="bg-white/[0.03] px-8 py-4 border-b border-white/5 flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signal History</span>
           <span className="text-[10px] font-black text-mint uppercase tracking-widest flex items-center gap-2">
              <Activity size={12} className="animate-pulse" /> Live Stream
           </span>
        </div>
        
        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="py-20 text-center opacity-20">
               <Database size={64} className="mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Audit Registry Empty</p>
            </div>
          ) : (
            logs.map((log, i) => {
              const actor = users.find(u => u.id === log.user_id);
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="px-8 py-5 group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 rounded-lg bg-white/5 text-slate-500 group-hover:text-mint transition-colors">
                           <Terminal size={14} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-mint transition-colors">
                              {log.action}
                           </p>
                           <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                 <User size={10} className="text-purple-500" /> 
                                 {actor?.username || actor?.full_name || 'SYSTEM_CORE'}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-600 uppercase">
                                 <Clock size={10} /> {new Date(log.created_at).toLocaleString()}
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                        {log.details && Object.keys(log.details).length > 0 && (
                           <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                              Payload Attached
                           </div>
                        )}
                        <span className="text-[10px] font-mono text-slate-700">#{log.id.slice(0, 8)}</span>
                     </div>
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      whileHover={{ height: 'auto', opacity: 1 }}
                      className="mt-4 overflow-hidden"
                    >
                       <pre className="text-[10px] font-mono text-slate-500 bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                       </pre>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
