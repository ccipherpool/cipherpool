import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function EconomyTab({ stats, setMessage }) {
  return (
    <motion.div
      key="economy"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">ÉCONOMIE</h2>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "TOTAL COINS",        value: stats.totalCoins.toLocaleString(), color: "text-yellow-400" },
            { label: "REVENU AUJOURD'HUI", value: stats.todayRevenue,                color: "text-green-400"  },
            { label: "REVENU CE MOIS",     value: stats.monthlyRevenue,              color: "text-green-400"  },
          ].map(card => (
            <motion.div
              key={card.label}
              whileHover={{ scale: 1.05, y: -2 }}
              className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
            >
              <p className="text-sm text-white/40 mb-2">{card.label}</p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-[#11152b] rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-md font-bold text-white mb-4">ACTIONS ÉCONOMIQUES</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/super-admin/grant"
                className="block p-4 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-xl text-center hover:border-purple-500 transition-all border border-purple-500/20"
              >
                <span className="text-2xl mb-2 block">💰</span>
                <p className="font-medium">Ajouter des coins</p>
              </Link>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                setMessage({ type: "success", text: "Rapport économique généré" });
                setTimeout(() => setMessage({ type: "", text: "" }), 3000);
              }}
              className="p-4 bg-[#11152b] border border-purple-500/20 rounded-xl text-center hover:border-purple-500 transition-all"
            >
              <span className="text-2xl mb-2 block">📊</span>
              <p className="font-medium">Générer rapport</p>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
