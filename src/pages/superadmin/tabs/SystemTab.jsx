import { motion } from "framer-motion";
import { 
  Settings, 
  ShieldAlert, 
  UserPlus, 
  Trophy, 
  Save, 
  Cpu, 
  Zap,
  Activity,
  Lock
} from "lucide-react";

export default function SystemTab({ maintenanceMode, setMaintenanceMode, registrationEnabled, setRegistrationEnabled, tournamentsEnabled, setTournamentsEnabled, updateSystemConfig }) {
  const toggles = [
    {
      key: "maintenance",
      label: "Maintenance Protocol",
      desc: "Force-disable all platform access for maintenance.",
      value: maintenanceMode,
      onChange: setMaintenanceMode,
      icon: ShieldAlert,
      color: "text-red-500"
    },
    {
      key: "registration",
      label: "Unit Enlistment",
      desc: "Authorize new tactical accounts and onboarding.",
      value: registrationEnabled,
      onChange: setRegistrationEnabled,
      icon: UserPlus,
      color: "text-mint"
    },
    {
      key: "tournaments",
      label: "Combat Operations",
      desc: "Authorize deployment of new tournament instances.",
      value: tournamentsEnabled,
      onChange: setTournamentsEnabled,
      icon: Trophy,
      color: "text-cyber-gold"
    },
  ];

  return (
    <motion.div
      key="system"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Cpu size={24} className="text-purple-500" /> Kernel Configuration
         </h2>
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            System Operations
         </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {toggles.map((t, i) => (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="ultra-glass p-6 flex items-center justify-between group border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white/5 ${t.color}`}>
                   <t.icon size={20} />
                </div>
                <div>
                  <p className="font-bold text-white uppercase tracking-tight text-sm">{t.label}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">{t.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.value}
                  onChange={e => t.onChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-white/5 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-mint/20 peer-checked:border-mint/40 peer-checked:after:bg-mint" />
              </label>
            </motion.div>
          ))}
        </div>

        <div className="ultra-glass p-10 flex flex-col justify-between border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-5">
              <Zap size={160} />
           </div>
           <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                 <Lock size={16} className="text-slate-600" />
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Protocol Commit</span>
              </div>
              <h3 className="text-2xl font-heading font-black text-white uppercase tracking-tight leading-tight">Authorize Kernel<br/>Updates</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">Changes to system configuration require executive level override. Ensure all operational units are notified of maintenance cycles.</p>
           </div>
           
           <button 
            onClick={updateSystemConfig}
            className="w-full mt-10 py-5 rounded-2xl bg-white text-obsidian font-heading font-black text-[10px] uppercase tracking-[0.3em] transition-all transform hover:-translate-y-1 active:scale-95 shadow-2xl flex items-center justify-center gap-3 relative z-10"
           >
              <Save size={18} /> COMMIT CONFIGURATION
           </button>
        </div>
      </div>
    </motion.div>
  );
}
