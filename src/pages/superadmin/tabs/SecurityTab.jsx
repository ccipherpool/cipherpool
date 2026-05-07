import { motion } from "framer-motion";

export default function SecurityTab() {
  return (
    <motion.div
      key="security"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">SÉCURITÉ</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "IP BANNIES",          value: 0, color: "text-red-400"    },
            { label: "TENTATIVES SUSPECTES", value: 0, color: "text-yellow-400" },
          ].map(card => (
            <motion.div
              key={card.label}
              whileHover={{ scale: 1.05 }}
              className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
            >
              <p className="text-sm text-white/40 mb-2">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
