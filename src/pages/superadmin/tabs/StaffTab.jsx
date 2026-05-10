import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  User, 
  Crown, 
  Zap, 
  Layout, 
  Trash2, 
  ChevronRight,
  ShieldAlert,
  Users2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowDownCircle,
  Settings
} from "lucide-react";

const ROLES_META = {
  super_admin: {
    color: "text-red-500",
    icon: Zap,
    label: "SUPER",
    perms: ["Full Kernel Access", "System Kernel Management", "Force Override", "Staff Management"],
    risk: "MAXIMUM",
    riskColor: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]"
  },
  admin: {
    color: "text-orange-500",
    icon: ShieldCheck,
    label: "ADMIN",
    perms: ["Unit Moderation", "Tactical Support", "Signal Resolution", "Arena Oversight", "CP Grants"],
    risk: "ELEVATED",
    riskColor: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    glow: ""
  },
  founder: {
    color: "text-purple-500",
    icon: Crown,
    label: "FOUNDER",
    perms: ["Ops Deployment", "Personal Command", "Unit Scanning"],
    risk: "MODERATE",
    riskColor: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    glow: ""
  },
  designer: {
    color: "text-emerald-500",
    icon: Layout,
    label: "DESIGN",
    perms: ["Logistics Store", "Asset Deployment", "UX Oversight"],
    risk: "MINIMAL",
    riskColor: "text-slate-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: ""
  },
};

const ALL_STAFF_ROLES = ["super_admin", "admin", "founder", "designer"];

function StaffCard({ member, meta, onChangeRole, currentUserRole }) {
  const [expanded, setExpanded] = useState(false);
  const name = member.username || member.full_name || "Unit-" + member.id.slice(0,4);
  const canModify = currentUserRole === "super_admin" && member.role !== "super_admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`ultra-glass p-8 group relative overflow-hidden transition-all ${meta.border} hover:border-white/20`}
    >
      <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
         <meta.icon size={120} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
         <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center border-2 ${meta.bg} ${meta.border} ${meta.color} ${meta.glow} transition-all`}>
               {member.avatar_url ? (
                 <img src={member.avatar_url} className="w-full h-full object-cover rounded-[1.8rem]" alt="av" />
               ) : (
                 <meta.icon size={28} />
               )}
            </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-xl font-bold text-white uppercase tracking-tight">{name}</h4>
                  <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${meta.bg} ${meta.border} ${meta.color}`}>
                     {meta.label}
                  </div>
               </div>
               <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{member.email}</p>
            </div>
         </div>

         <div className="flex items-center gap-6">
            <div className="hidden lg:block text-right">
               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Security Risk</p>
               <p className={`text-[10px] font-black uppercase ${meta.riskColor}`}>{meta.risk}</p>
            </div>
            {canModify && (
               <button 
                onClick={() => setExpanded(!expanded)}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:border-mint/30 hover:text-mint transition-all flex items-center gap-2"
               >
                  <Settings size={14} /> GÉRER
               </button>
            )}
         </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-8 relative z-10">
         {meta.perms.map(p => (
            <span key={p} className={`text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-slate-500`}>
               ✓ {p}
            </span>
         ))}
      </div>

      <AnimatePresence>
         {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-8 pt-8 border-t border-white/5 relative z-10"
            >
               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-4">Reassign Operational Level</p>
               <div className="flex flex-wrap gap-3">
                  {ALL_STAFF_ROLES.filter(r => r !== member.role && r !== "super_admin").map(role => (
                     <button
                        key={role}
                        onClick={() => { onChangeRole(member.id, role); setExpanded(false); }}
                        className="px-5 py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
                     >
                        Promote to {role.replace('_', ' ')}
                     </button>
                  ))}
                  <button
                     onClick={() => { if(window.confirm(`Force-demote ${name}?`)) { onChangeRole(member.id, "user"); setExpanded(false); } }}
                     className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                  >
                     <ArrowDownCircle size={14} /> Demote Unit
                  </button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StaffTab({ users, updateUserRole, currentUserRole }) {
  const [filter, setFilter] = useState("all");
  const STAFF_ROLES = ["super_admin", "admin", "founder", "designer"];
  const allStaff = users.filter(u => STAFF_ROLES.includes(u.role));
  const displayedStaff = filter === "all" ? allStaff : allStaff.filter(u => u.role === filter);

  return (
    <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck size={24} className="text-mint" /> Staff Command
         </h2>
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            {allStaff.length} Deployed Units
         </span>
      </div>

      <div className="flex flex-wrap gap-3">
         {['all', ...STAFF_ROLES].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                filter === r 
                  ? 'bg-mint text-obsidian border-mint shadow-neon-mint' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
              }`}
            >
              {r === 'all' ? 'All Staff' : r.replace('_', ' ')}
            </button>
         ))}
      </div>

      <div className="space-y-4">
         {displayedStaff.map(member => (
            <StaffCard
              key={member.id}
              member={member}
              meta={ROLES_META[member.role] || ROLES_META.admin}
              onChangeRole={updateUserRole}
              currentUserRole={currentUserRole}
            />
         ))}
      </div>
    </motion.div>
  );
}
