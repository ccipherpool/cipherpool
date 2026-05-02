import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button, Card, Badge, Tabs, Input, Modal } from "../components/ui";
import { motion } from "framer-motion";
import { Users, Zap, TrendingUp, Settings, Plus, Edit2, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCoins: 0,
    totalTournaments: 0,
  });
  const [seasons, setSeasons] = useState([]);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    reset_coins: 0,
    reset_xp: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });

      const { count: tournamentsCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact" });

      setStats({
        totalUsers: usersCount || 0,
        activeUsers: Math.floor((usersCount || 0) * 0.7),
        totalCoins: 1000000,
        totalTournaments: tournamentsCount || 0,
      });

      // Fetch seasons
      const { data: seasonsData } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false });

      setSeasons(seasonsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = async () => {
    try {
      const { error } = await supabase.from("seasons").insert({
        ...seasonForm,
        status: "active",
      });

      if (error) throw error;

      setShowSeasonModal(false);
      setSeasonForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        reset_coins: 0,
        reset_xp: 0,
      });
      fetchDashboardData();
    } catch (error) {
      console.error("Error creating season:", error);
    }
  };

  const tabs = [
    {
      label: "Aperçu",
      content: (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: "Utilisateurs", value: stats.totalUsers, color: "primary" },
              { icon: Zap, label: "Actifs", value: stats.activeUsers, color: "secondary" },
              { icon: TrendingUp, label: "Tournois", value: stats.totalTournaments, color: "accent" },
              { icon: Settings, label: "Coins", value: `${stats.totalCoins}M`, color: "danger" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="glow" className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm mb-2">{stat.label}</p>
                      <h3 className="text-3xl font-bold text-text-primary">{stat.value}</h3>
                    </div>
                    <div className={`text-3xl opacity-50`}>
                      <stat.icon className="w-8 h-8" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: "Seasons",
      content: (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Gestion des Seasons</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowSeasonModal(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Season
            </Button>
          </div>

          {seasons.length > 0 ? (
            <div className="space-y-3">
              {seasons.map((season) => (
                <Card key={season.id} variant="hover" className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-text-primary">{season.name}</h4>
                      <p className="text-sm text-text-secondary">{season.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="primary">
                          Reset: {season.reset_coins} coins
                        </Badge>
                        <Badge variant="secondary">
                          {season.reset_xp} XP
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              Aucune season créée
            </div>
          )}
        </div>
      ),
    },
    {
      label: "Utilisateurs",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Gestion des Utilisateurs</h3>
          <Card variant="glow" className="p-6">
            <p className="text-text-secondary">
              Fonctionnalité de gestion des utilisateurs à venir...
            </p>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary">Gérez la plateforme CipherPool</p>
      </div>

      {/* Tabs */}
      {!loading && <Tabs tabs={tabs} defaultTab={0} />}

      {/* Season Modal */}
      <Modal
        isOpen={showSeasonModal}
        onClose={() => setShowSeasonModal(false)}
        title="Créer une nouvelle Season"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la Season"
            placeholder="ex: Season 1"
            value={seasonForm.name}
            onChange={(e) =>
              setSeasonForm({ ...seasonForm, name: e.target.value })
            }
          />
          <Input
            label="Description"
            placeholder="Description de la season"
            value={seasonForm.description}
            onChange={(e) =>
              setSeasonForm({ ...seasonForm, description: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={seasonForm.start_date}
              onChange={(e) =>
                setSeasonForm({ ...seasonForm, start_date: e.target.value })
              }
            />
            <Input
              label="Date de fin"
              type="date"
              value={seasonForm.end_date}
              onChange={(e) =>
                setSeasonForm({ ...seasonForm, end_date: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Reset Coins"
              type="number"
              value={seasonForm.reset_coins}
              onChange={(e) =>
                setSeasonForm({
                  ...seasonForm,
                  reset_coins: parseInt(e.target.value),
                })
              }
            />
            <Input
              label="Reset XP"
              type="number"
              value={seasonForm.reset_xp}
              onChange={(e) =>
                setSeasonForm({
                  ...seasonForm,
                  reset_xp: parseInt(e.target.value),
                })
              }
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowSeasonModal(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSeason}
            >
              Créer Season
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
