import { motion } from "framer-motion";

export default function SystemTab({ maintenanceMode, setMaintenanceMode, registrationEnabled, setRegistrationEnabled, tournamentsEnabled, setTournamentsEnabled, updateSystemConfig }) {
  const toggles = [
    {
      key: "maintenance",
      label: "Mode Maintenance",
      desc: "Désactive l'accès à la plateforme",
      value: maintenanceMode,
      onChange: setMaintenanceMode,
    },
    {
      key: "registration",
      label: "Inscriptions",
      desc: "Autoriser les nouveaux utilisateurs",
      value: registrationEnabled,
      onChange: setRegistrationEnabled,
    },
    {
      key: "tournaments",
      label: "Tournois",
      desc: "Autoriser la création de tournois",
      value: tournamentsEnabled,
      onChange: setTournamentsEnabled,
    },
  ];

  return (
    <motion.div
      key="system"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">CONFIGURATION SYSTÈME</h2>

        <div className="space-y-4 mb-6">
          {toggles.map(t => (
            <motion.div
              key={t.key}
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between p-4 bg-[#11152b] rounded-xl border border-purple-500/20 hover:border-purple-500 transition-all"
            >
              <div>
                <p className="font-medium text-white">{t.label}</p>
                <p className="text-xs text-white/40">{t.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.value}
                  onChange={e => t.onChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={updateSystemConfig}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white hover:opacity-90 transition-all hover:shadow-2xl hover:shadow-purple-500/50"
        >
          SAUVEGARDER LA CONFIGURATION
        </motion.button>
      </div>
    </motion.div>
  );
}
