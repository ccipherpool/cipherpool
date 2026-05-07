import { motion } from "framer-motion";

export default function LogsTab({ logs, users }) {
  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">LOGS ADMIN</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {logs.length === 0 ? (
            <p className="text-white/40 text-center py-8">Aucun log disponible</p>
          ) : (
            logs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="bg-[#11152b] rounded-lg p-3 border border-purple-500/20 hover:border-purple-500 transition-all"
              >
                <p className="text-sm text-white">
                  <span className="text-purple-400">
                    {log?.user_id ? (users.find(u => u.id === log.user_id)?.display_name || log.user_id?.slice(0, 8)) : "Système"}
                  </span>{" "}
                  - {log.action}
                </p>
                <p className="text-xs text-white/40">{new Date(log.created_at).toLocaleString("fr-FR")}</p>
                {log.details && (
                  <pre className="text-xs text-white/30 mt-1 overflow-x-auto bg-black/20 p-2 rounded">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
