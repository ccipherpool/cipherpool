import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  AlertCircle, 
  Wallet, 
  Trophy, 
  PlusCircle, 
  Activity, 
  TrendingUp, 
  Users2,
  ChevronRight,
  Clock,
  History
} from "lucide-react";

export default function DashboardTab({ stats, users, logs, setActiveTab, setFilter, setSelectedUser, setGrantAmount, setGrantReason, setWalletSearch, setShowWalletModal }) {
  
  const todayUsers = users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length;
  const staffCount = users.filter(u => ["admin", "super_admin", "founder", "designer"].includes(u.role)).length;

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Quick Actions Bento */}
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Action Card 1: Verifications */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab("users"); setFilter("pending"); }}
          className="ultra-glass p-8 flex flex-col justify-between group border-amber-500/20 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">User Verification</h3>
            <p className="text-slate-500 text-xs font-medium mt-2">Manage unit deployment and identity verification.</p>
          </div>
          <div className="mt-8 flex items-end justify-between relative z-10">
            <div>
              <p className="text-3xl font-impact text-amber-500">{stats.pendingVerifications || 0}</p>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Pending Protocols</p>
            </div>
            <ChevronRight className="text-slate-700 group-hover:text-white transition-colors" />
          </div>
        </motion.button>

        {/* Action Card 2: Reports */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab("reports")}
          className="ultra-glass p-8 flex flex-col justify-between group border-red-500/20 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Tactical Alerts</h3>
            <p className="text-slate-500 text-xs font-medium mt-2">Process reported anomalies and disciplinary actions.</p>
          </div>
          <div className="mt-8 flex items-end justify-between relative z-10">
            <div>
              <p className="text-3xl font-impact text-red-500">{stats.totalReports || 0}</p>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active Threats</p>
            </div>
            <ChevronRight className="text-slate-700 group-hover:text-white transition-colors" />
          </div>
        </motion.button>

        {/* Action Card 3: Economy */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setSelectedUser(null); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setShowWalletModal(true); }}
          className="ultra-glass p-8 flex flex-col justify-between group border-emerald-500/20 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
              <Wallet size={28} />
            </div>
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Logistics Sync</h3>
            <p className="text-slate-500 text-xs font-medium mt-2">Manage CP distribution and transactional audits.</p>
          </div>
          <div className="mt-8 flex items-end justify-between relative z-10">
            <div>
              <p className="text-3xl font-impact text-emerald-500">{(stats.totalCoins || 0).toLocaleString()}</p>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">CP In Circulation</p>
            </div>
            <ChevronRight className="text-slate-700 group-hover:text-white transition-colors" />
          </div>
        </motion.button>

        {/* Action Card 4: Operations */}
        <Link to="/create-tournament" className="block">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="ultra-glass h-full p-8 flex flex-col justify-between group border-mint/20 text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Trophy size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-mint/10 text-mint flex items-center justify-center mb-6">
                <PlusCircle size={28} />
              </div>
              <h3 className="text-xl font-heading font-black text-white uppercase tracking-tight">Deploy Mission</h3>
              <p className="text-slate-500 text-xs font-medium mt-2">Initialize new tactical operations and tournaments.</p>
            </div>
            <div className="mt-8 flex items-end justify-between relative z-10">
              <div>
                <p className="text-3xl font-impact text-mint">{stats.activeTournaments || 0}</p>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active Ops</p>
              </div>
              <ChevronRight className="text-slate-700 group-hover:text-white transition-colors" />
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Side Column: Activity & Intel */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Real-time Intel */}
        <div className="ultra-glass p-8 space-y-6 border-white/5">
          <h3 className="text-sm font-heading font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Activity size={18} className="text-mint animate-pulse" /> Signal Intel
          </h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Units Today</span>
                <span className="text-sm font-bold text-mint">+{todayUsers}</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff Deployment</span>
                <span className="text-sm font-bold text-purple-400">{staffCount}</span>
             </div>
             <div className="flex justify-between items-center py-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Load</span>
                <span className="text-sm font-bold text-blue-400">OPTIMAL</span>
             </div>
          </div>
        </div>

        {/* Audit Log Snippet */}
        <div className="ultra-glass p-8 flex flex-col h-[300px] border-white/5">
          <h3 className="text-sm font-heading font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6">
            <History size={18} className="text-slate-500" /> Recent Audit
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {logs.length === 0 ? (
              <p className="text-white/20 text-center py-4 text-[10px] font-black uppercase tracking-widest">Audit Trail Empty</p>
            ) : (
              logs.slice(0, 10).map((log, index) => (
                <div key={log.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                   <p className="text-[10px] text-white font-medium line-clamp-1">
                      <span className="text-mint font-black uppercase tracking-tighter">[{log.action.slice(0,10)}]</span> {log.action}
                   </p>
                   <div className="flex justify-between items-center mt-2 opacity-40">
                      <span className="text-[8px] font-black uppercase tracking-widest">
                         {log?.user_id ? (users.find(u => u.id === log.user_id)?.username || 'AGENT') : 'SYSTEM'}
                      </span>
                      <span className="text-[8px] font-medium">{new Date(log.created_at).toLocaleTimeString()}</span>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
