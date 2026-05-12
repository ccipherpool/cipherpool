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
import { cn } from "../../../lib/utils";

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
      className="grid grid-cols-1 lg:grid-cols-12 gap-10"
    >
      {/* Quick Actions Bento */}
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Action Card 1: Verifications */}
        <motion.button
          whileHover={{ scale: 1.02, rotate: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveTab("users"); setFilter("pending"); }}
          className="card-creative p-8 flex flex-col justify-between group bg-white dark:bg-zinc-900 text-left relative overflow-hidden rotate-[-1.5deg]"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <ShieldCheck size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-full border-2 border-zinc-900 dark:border-white bg-amber-400 text-zinc-900 flex items-center justify-center mb-6 shadow-[2px_2px_0px_0px] shadow-zinc-900">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase tracking-tight">User Protocol</h3>
            <p className="font-handwritten text-xl text-zinc-600 dark:text-zinc-400 mt-2">Manage unit deployment and identity verification. 🛡️</p>
          </div>
          <div className="mt-10 flex items-end justify-between relative z-10">
            <div>
              <p className="text-5xl font-handwritten font-bold text-amber-500">{stats.pendingVerifications || 0}</p>
              <p className="font-handwritten text-lg text-zinc-500 uppercase">Pending Protocols</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
              <ChevronRight className="text-zinc-900 dark:text-white" />
            </div>
          </div>
        </motion.button>

        {/* Action Card 2: Reports */}
        <motion.button
          whileHover={{ scale: 1.02, rotate: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab("reports")}
          className="card-creative p-8 flex flex-col justify-between group bg-white dark:bg-zinc-900 text-left relative overflow-hidden rotate-[1.5deg]"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <AlertCircle size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-full border-2 border-zinc-900 dark:border-white bg-red-400 text-zinc-900 flex items-center justify-center mb-6 shadow-[2px_2px_0px_0px] shadow-zinc-900">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Tactical Alerts</h3>
            <p className="font-handwritten text-xl text-zinc-600 dark:text-zinc-400 mt-2">Process reported anomalies and disciplinary actions. ⚠️</p>
          </div>
          <div className="mt-10 flex items-end justify-between relative z-10">
            <div>
              <p className="text-5xl font-handwritten font-bold text-red-500">{stats.totalReports || 0}</p>
              <p className="font-handwritten text-lg text-zinc-500 uppercase">Active Threats</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
              <ChevronRight className="text-zinc-900 dark:text-white" />
            </div>
          </div>
        </motion.button>

        {/* Action Card 3: Economy */}
        <motion.button
          whileHover={{ scale: 1.02, rotate: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setSelectedUser(null); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setShowWalletModal(true); }}
          className="card-creative p-8 flex flex-col justify-between group bg-white dark:bg-zinc-900 text-left relative overflow-hidden rotate-[-1deg]"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-full border-2 border-zinc-900 dark:border-white bg-purple-400 text-zinc-900 flex items-center justify-center mb-6 shadow-[2px_2px_0px_0px] shadow-zinc-900">
              <Wallet size={32} />
            </div>
            <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Logistics Sync</h3>
            <p className="font-handwritten text-xl text-zinc-600 dark:text-zinc-400 mt-2">Manage CP distribution and transactional audits. 💰</p>
          </div>
          <div className="mt-10 flex items-end justify-between relative z-10">
            <div>
              <p className="text-5xl font-handwritten font-bold text-purple-500">{(stats.totalCoins || 0).toLocaleString()}</p>
              <p className="font-handwritten text-lg text-zinc-500 uppercase">CP In Circulation</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
              <ChevronRight className="text-zinc-900 dark:text-white" />
            </div>
          </div>
        </motion.button>

        {/* Action Card 4: Operations */}
        <Link to="/create-tournament" className="block rotate-[1deg]">
          <motion.div
            whileHover={{ scale: 1.02, rotate: 0 }}
            whileTap={{ scale: 0.98 }}
            className="card-creative h-full p-8 flex flex-col justify-between group bg-white dark:bg-zinc-900 text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <Trophy size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-full border-2 border-zinc-900 dark:border-white bg-blue-400 text-zinc-900 flex items-center justify-center mb-6 shadow-[2px_2px_0px_0px] shadow-zinc-900">
                <PlusCircle size={32} />
              </div>
              <h3 className="text-3xl font-handwritten font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Deploy Mission</h3>
              <p className="font-handwritten text-xl text-zinc-600 dark:text-zinc-400 mt-2">Initialize new tactical operations and tournaments. ⚔️</p>
            </div>
            <div className="mt-10 flex items-end justify-between relative z-10">
              <div>
                <p className="text-5xl font-handwritten font-bold text-blue-500">{stats.activeTournaments || 0}</p>
                <p className="font-handwritten text-lg text-zinc-500 uppercase">Active Ops</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
                <ChevronRight className="text-zinc-900 dark:text-white" />
              </div>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Side Column: Activity & Intel */}
      <div className="lg:col-span-4 space-y-8">
        
        {/* Real-time Intel */}
        <div className="card-creative p-8 space-y-6 bg-white dark:bg-zinc-900 rotate-[0.5deg]">
          <h3 className="text-2xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity size={24} className="text-green-500 animate-pulse" /> Signal Intel ✨
          </h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center py-3 border-b-2 border-zinc-100 dark:border-zinc-800">
                <span className="font-handwritten text-xl text-zinc-500">New Units Today</span>
                <span className="font-handwritten text-2xl font-bold text-green-500">+{todayUsers}</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b-2 border-zinc-100 dark:border-zinc-800">
                <span className="font-handwritten text-xl text-zinc-500">Staff Deployment</span>
                <span className="font-handwritten text-2xl font-bold text-purple-500">{staffCount}</span>
             </div>
             <div className="flex justify-between items-center py-3">
                <span className="font-handwritten text-xl text-zinc-500">System Load</span>
                <span className="font-handwritten text-2xl font-bold text-blue-500 italic">OPTIMAL</span>
             </div>
          </div>
        </div>

        {/* Audit Log Snippet */}
        <div className="card-creative p-8 flex flex-col h-[400px] bg-white dark:bg-zinc-900 rotate-[-0.5deg]">
          <h3 className="text-2xl font-handwritten font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-6">
            <History size={24} className="text-zinc-400" /> Recent Audit ✏️
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {logs.length === 0 ? (
              <p className="font-handwritten text-xl text-zinc-300 text-center py-10">Audit Trail Empty</p>
            ) : (
              logs.slice(0, 10).map((log, index) => (
                <div key={log.id} className="p-4 rounded-xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-900 dark:hover:border-white transition-all">
                   <p className="font-handwritten text-lg text-zinc-900 dark:text-white leading-tight">
                      <span className="text-blue-500 font-bold uppercase">[{log.action.slice(0,10)}]</span> {log.action}
                   </p>
                   <div className="flex justify-between items-center mt-3 opacity-60">
                      <span className="font-handwritten text-sm uppercase">
                         {log?.user_id ? (users.find(u => u.id === log.user_id)?.username || 'AGENT') : 'SYSTEM'}
                      </span>
                      <span className="font-handwritten text-sm">{new Date(log.created_at).toLocaleTimeString()}</span>
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

