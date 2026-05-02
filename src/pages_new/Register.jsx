import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button, Input, Card } from "../components/ui";
import { Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // Create profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            full_name: formData.fullName,
            email: formData.email,
            role: "user",
            verification_status: "unverified",
          });

        if (profileError) throw profileError;
      }

      setSuccess("Compte créé avec succès! Vérifiez votre email pour confirmer.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription");
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
          <p className="text-text-secondary">Créez votre compte</p>
        </div>

        {/* Alerts */}
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

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-accent-500/20 border border-accent-500/50 flex gap-3"
          >
            <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0" />
            <p className="text-accent-300 text-sm">{success}</p>
          </motion.div>
        )}

        {/* Form Card */}
        <Card variant="glow" className="p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Nom complet"
              type="text"
              icon={User}
              name="fullName"
              placeholder="Votre nom"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <Input
              label="Email"
              type="email"
              icon={Mail}
              name="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Mot de passe"
              type="password"
              icon={Lock}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              icon={Lock}
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <Button
              variant="primary"
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full mt-6"
            >
              Créer un compte
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-primary-900/30"></div>
            <span className="text-text-muted text-sm">ou</span>
            <div className="flex-1 h-px bg-primary-900/30"></div>
          </div>

          {/* Login Link */}
          <p className="text-center text-text-secondary">
            Vous avez déjà un compte?{" "}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </Card>

        {/* Footer */}
        <p className="text-center text-text-muted text-sm mt-6">
          En vous inscrivant, vous acceptez nos conditions d'utilisation
        </p>
      </motion.div>
    </div>
  );
}
