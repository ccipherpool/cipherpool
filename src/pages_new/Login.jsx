import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button, Input, Card } from "../components/ui";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4">
            CP
          </div>
          <h1 className="text-3xl font-bold mb-2">CIPHERPOOL</h1>
          <p className="text-text-secondary">Connectez-vous à votre compte</p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-danger-500/20 border border-danger-500/50 flex gap-3"
          >
            <AlertCircle className="w-5 h-5 text-danger-400 flex-shrink-0" />
            <p className="text-danger-300 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Form Card */}
        <Card variant="glow" className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Mot de passe"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              variant="primary"
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full"
            >
              Se connecter
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-primary-900/30"></div>
            <span className="text-text-muted text-sm">ou</span>
            <div className="flex-1 h-px bg-primary-900/30"></div>
          </div>

          {/* Register Link */}
          <p className="text-center text-text-secondary">
            Pas encore de compte?{" "}
            <Link
              to="/register"
              className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              S'inscrire
            </Link>
          </p>
        </Card>

        {/* Footer */}
        <p className="text-center text-text-muted text-sm mt-6">
          En vous connectant, vous acceptez nos conditions d'utilisation
        </p>
      </motion.div>
    </div>
  );
}
