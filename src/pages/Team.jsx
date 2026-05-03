import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Shield, Crown, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Team() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, created_at")
          .in("role", ["admin", "super_admin", "founder", "fondateur"])
          .order("role", { ascending: false })
          .order("created_at", { ascending: true });

        if (error) throw error;
        setAdmins(data || []);
      } catch (err) {
        console.error("Error fetching admins:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const getRoleInfo = (role) => {
    const roleMap = {
      super_admin: {
        label: "Super Admin",
        icon: Crown,
        color: "from-yellow-400 to-orange-500",
        badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      },
      founder: {
        label: "Fondateur",
        icon: Zap,
        color: "from-purple-400 to-pink-500",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      },
      fondateur: {
        label: "Fondateur",
        icon: Zap,
        color: "from-purple-400 to-pink-500",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      },
      admin: {
        label: "Admin",
        icon: Shield,
        color: "from-blue-400 to-cyan-500",
        badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      },
    };
    return roleMap[role] || roleMap.admin;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-dark-950 text-neutral-100 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          className="max-w-6xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-brand-primary/10 border border-brand-primary/30 rounded-full">
            <Users className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary">Notre Équipe</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-display tracking-tight">
            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent">
              L'Équipe CipherPool
            </span>
          </h1>

          <p className="text-lg text-neutral-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Rencontrez les administrateurs et modérateurs qui font fonctionner la plateforme. Dédiés à créer la meilleure expérience de gaming compétitif.
          </p>
        </motion.div>
      </section>

      {/* Team Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-400">Aucun administrateur trouvé</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {admins.map((admin) => {
                const roleInfo = getRoleInfo(admin.role);
                const RoleIcon = roleInfo.icon;
                const initials = admin.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U";

                return (
                  <motion.div
                    key={admin.id}
                    variants={itemVariants}
                    className="group relative overflow-hidden rounded-xl border border-neutral-800 hover:border-neutral-700 bg-dark-850/50 hover:bg-dark-800/50 transition-all duration-300 p-6"
                  >
                    {/* Background gradient */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${roleInfo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                    />

                    {/* Content */}
                    <div className="relative z-10 space-y-4">
                      {/* Avatar */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-16 h-16 rounded-lg bg-gradient-to-br ${roleInfo.color} flex items-center justify-center font-bold text-lg text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        >
                          {admin.avatar_url ? (
                            <img
                              src={admin.avatar_url}
                              alt={admin.full_name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <RoleIcon className="w-6 h-6 text-neutral-500 group-hover:text-brand-primary transition-colors" />
                      </div>

                      {/* Name */}
                      <div>
                        <h3 className="text-lg font-bold font-display mb-1">
                          {admin.full_name || "Unknown"}
                        </h3>
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${roleInfo.badge} text-xs font-semibold uppercase tracking-wide`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current" />
                          {roleInfo.label}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="pt-4 border-t border-neutral-700/50 space-y-2">
                        <p className="text-xs text-neutral-400">
                          Membre depuis{" "}
                          <span className="text-neutral-300 font-semibold">
                            {new Date(admin.created_at).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "short",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Hover effect */}
                    <div className="absolute inset-0 border border-brand-primary/0 group-hover:border-brand-primary/30 rounded-xl transition-all duration-300 pointer-events-none" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-dark-900/50 border-y border-neutral-800/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="text-center p-6 rounded-xl border border-neutral-800/50 bg-dark-850/30 hover:bg-dark-800/50 transition-all duration-300"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent mb-2 font-display">
                {admins.length}
              </div>
              <p className="text-neutral-400">Administrateurs Actifs</p>
            </motion.div>

            <motion.div
              className="text-center p-6 rounded-xl border border-neutral-800/50 bg-dark-850/30 hover:bg-dark-800/50 transition-all duration-300"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2 font-display">
                24/7
              </div>
              <p className="text-neutral-400">Support Disponible</p>
            </motion.div>

            <motion.div
              className="text-center p-6 rounded-xl border border-neutral-800/50 bg-dark-850/30 hover:bg-dark-800/50 transition-all duration-300"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent mb-2 font-display">
                100%
              </div>
              <p className="text-neutral-400">Dédié à la Qualité</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-8 px-6 text-center text-neutral-500 bg-dark-900/50">
        <p>&copy; 2026 CipherPool. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
