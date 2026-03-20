import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showKYCWarning, setShowKYCWarning] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    city: "",
    country: "",
    email: "",
    password: "",
    confirmPassword: "",
    freeFireId: "",
    idCard: null,
    selfie: null
  });

  const [previews, setPreviews] = useState({
    idCard: null,
    selfie: null
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setFormData({
      ...formData,
      [type]: file
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews({
        ...previews,
        [type]: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const openCamera = (type, facingMode) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = facingMode;
    input.onchange = (e) => handleFileChange(e, type);
    input.click();
  };

  const validateStep1 = () => {
    if (!formData.fullName) {
      setError("Full name is required");
      return false;
    }
    if (!formData.age || formData.age < 13) {
      setError("Age must be at least 13");
      return false;
    }
    if (!formData.city) {
      setError("City is required");
      return false;
    }
    if (!formData.country) {
      setError("Country is required");
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Invalid email address");
      return false;
    }
    if (!formData.freeFireId) {
      setError("Free Fire ID is required");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.idCard) {
      setError("ID Card is required");
      return false;
    }
    if (!formData.selfie) {
      setError("Selfie with ID is required");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError("");
    if (validateStep1()) {
      setShowKYCWarning(true); // afficher le warning avant step 2
    }
  };

  const confirmKYC = () => {
    setShowKYCWarning(false);
    setStep(2);
  };

  const uploadFile = async (file, userId, folder) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${folder}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("verification-docs")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateStep2()) return;

    setLoading(true);
    setSuccess("Creating your account...");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("Failed to create user");

      setSuccess("Account created! Uploading documents...");

      const idCardUrl = await uploadFile(formData.idCard, user.id, "id-cards");
      const selfieUrl = await uploadFile(formData.selfie, user.id, "selfies");

      setSuccess("Documents uploaded! Updating profile...");

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: formData.fullName,
            age: parseInt(formData.age),
            city: formData.city,
            country: formData.country,
            free_fire_id: formData.freeFireId,
            id_card_url: idCardUrl,
            selfie_url: selfieUrl,
            role: "user",
            verification_status: "pending",
            coins: 0
          },
          { onConflict: "id" }
        );

      if (upsertError) throw upsertError;

      setSuccess("✅ Registration complete! Redirecting to login...");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black text-white p-4">
      <div className="max-w-2xl mx-auto">

        {/* ══════════ KYC WARNING MODAL ══════════ */}
        {showKYCWarning && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #0d0d1a, #0a0a14)",
              border: "1px solid rgba(251,191,36,0.4)",
              borderRadius: 20, width: "100%", maxWidth: 480,
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(251,191,36,0.15), 0 30px 80px rgba(0,0,0,0.8)",
            }}>
              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(239,68,68,0.08))",
                borderBottom: "1px solid rgba(251,191,36,0.25)",
                padding: "24px 28px 20px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>⚠️</div>
                <h2 style={{
                  fontFamily: "'Bebas Neue', cursive", fontSize: 28,
                  letterSpacing: 3, color: "#fbbf24", margin: 0,
                }}>
                  ATTENTION — VÉRIFICATION D'IDENTITÉ
                </h2>
              </div>

              {/* Body */}
              <div style={{ padding: "24px 28px" }}>
                <p style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 15,
                  color: "rgba(255,255,255,0.85)", lineHeight: 1.7,
                  marginBottom: 20, textAlign: "center",
                }}>
                  Les informations que vous avez saisies
                  <strong style={{ color: "#fbbf24" }}> doivent absolument correspondre</strong> à
                  celles de votre <strong style={{ color: "#fff" }}>Carte Nationale d'Identité</strong>.
                </p>

                <div style={{
                  background: "rgba(251,191,36,0.07)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 12, padding: "16px 20px",
                  marginBottom: 24,
                }}>
                  {[
                    "✅ Nom complet identique à la CIN",
                    "✅ Date de naissance correcte",
                    "✅ Ville de résidence réelle",
                    "✅ Une photo de votre CIN sera requise",
                    "✅ Un selfie avec votre CIN sera requis",
                    "🚫 Toute information fausse = compte refusé",
                  ].map((item, i) => (
                    <p key={i} style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 13, color: item.startsWith("🚫") ? "#f87171" : "rgba(255,255,255,0.7)",
                      margin: "6px 0", lineHeight: 1.5,
                      fontWeight: item.startsWith("🚫") ? 700 : 400,
                    }}>
                      {item}
                    </p>
                  ))}
                </div>

                <p style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
                  color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 20,
                }}>
                  L'administrateur vérifiera manuellement vos documents avant d'activer votre compte.
                </p>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setShowKYCWarning(false)}
                    style={{
                      flex: 1, padding: "13px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12, color: "rgba(255,255,255,0.5)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "all .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  >
                    ← Modifier mes infos
                  </button>
                  <button
                    onClick={confirmKYC}
                    style={{
                      flex: 2, padding: "13px",
                      background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                      border: "none", borderRadius: 12,
                      color: "#0a0a0a",
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize: 18, letterSpacing: 2,
                      cursor: "pointer",
                      boxShadow: "0 8px 24px rgba(251,191,36,0.35)",
                      transition: "all .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = ""}
                  >
                    ✓ COMPRIS — CONTINUER
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Join CipherPool
          </h1>
          <p className="text-gray-400">Create your account to start competing</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-purple-400" : "text-gray-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? "border-purple-400 bg-purple-400/20" : "border-gray-600"
              }`}>
                1
              </div>
              <span>Information</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? "bg-purple-400" : "bg-gray-600"}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-cyan-400" : "text-gray-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? "border-cyan-400 bg-cyan-400/20" : "border-gray-600"
              }`}>
                2
              </div>
              <span>Verification</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
            {success}
          </div>
        )}

        <div className="bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8">

          {step === 1 ? (
            <div className="space-y-4">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
              </div>

              <input
                type="text"
                name="country"
                placeholder="Country"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              />

              <input
                type="text"
                name="freeFireId"
                placeholder="Free Fire ID"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleChange}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg"
                />
              </div>

              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-bold hover:opacity-90 transition"
              >
                Next Step →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-400">
                  Carte Nationale (ID Card) *
                </label>
                
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <h4 className="text-yellow-400 font-bold mb-2">📸 ID Card Instructions</h4>
                  <ul className="text-sm text-gray-300 list-disc ml-4">
                    <li>Place your ID card on a flat surface</li>
                    <li>Make sure all 4 corners are visible</li>
                    <li>Ensure good lighting and no glare</li>
                    <li>The photo must be clear and readable</li>
                  </ul>
                </div>

                {previews.idCard && (
                  <div className="mb-4">
                    <img
                      src={previews.idCard}
                      alt="ID Card Preview"
                      className="w-full max-h-48 object-contain rounded-lg border-2 border-purple-500/30"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handleFileChange(e, 'idCard');
                      input.click();
                    }}
                    className="py-2 bg-slate-800 border border-purple-500/30 rounded-lg hover:bg-slate-700 transition"
                  >
                    📁 Choose from library
                  </button>
                  <button
                    type="button"
                    onClick={() => openCamera('idCard', 'environment')}
                    className="py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition"
                  >
                    📸 Take photo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-cyan-400">
                  Selfie with ID Card *
                </label>
                
                <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <h4 className="text-cyan-400 font-bold mb-2">🤳 Selfie Instructions</h4>
                  <ul className="text-sm text-gray-300 list-disc ml-4">
                    <li>Hold your ID card next to your face</li>
                    <li>Both your face and the ID must be clearly visible</li>
                    <li>Make sure the ID details are readable</li>
                    <li>Good lighting is essential</li>
                  </ul>
                </div>

                {previews.selfie && (
                  <div className="mb-4">
                    <img
                      src={previews.selfie}
                      alt="Selfie Preview"
                      className="w-full max-h-48 object-contain rounded-lg border-2 border-cyan-500/30"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handleFileChange(e, 'selfie');
                      input.click();
                    }}
                    className="py-2 bg-slate-800 border border-cyan-500/30 rounded-lg hover:bg-slate-700 transition"
                  >
                    📁 Choose from library
                  </button>
                  <button
                    type="button"
                    onClick={() => openCamera('selfie', 'user')}
                    className="py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 transition"
                  >
                    📸 Take photo
                  </button>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-sm text-gray-300">
                  <span className="text-purple-400 font-bold">🔒 Secure:</span> Your documents are encrypted and only visible to admins.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}