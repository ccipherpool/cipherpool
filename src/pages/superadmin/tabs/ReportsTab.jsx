import { motion } from "framer-motion";

export default function ReportsTab({ reports, resolveReport }) {
  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">RAPPORTS EN ATTENTE</h2>
        {reports.length === 0 ? (
          <p className="text-white/40 text-center py-8">Aucun rapport en attente</p>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-white">
                      <span className="text-purple-400">{report.reporter?.full_name || "Utilisateur"}</span> a signalé{" "}
                      <span className="text-red-400">{report.reported?.full_name || "Utilisateur"}</span>
                    </p>
                    <p className="text-sm text-white/60 mt-1">{report.reason}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    report.type === "cheat"  ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    report.type === "insult" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                    report.type === "spam"   ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                    "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}>
                    {report.type}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[
                    { label: "Avertir",  action: "warning", cls: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" },
                    { label: "Mute",     action: "mute",    cls: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
                    { label: "Ban",      action: "ban",     cls: "bg-red-500/20 text-red-400 hover:bg-red-500/30" },
                    { label: "Ignorer",  action: "ignore",  cls: "bg-white/10 text-white/60 hover:bg-white/20" },
                  ].map(btn => (
                    <motion.button
                      key={btn.action}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => resolveReport(report.id, btn.action)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all ${btn.cls}`}
                    >
                      {btn.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
