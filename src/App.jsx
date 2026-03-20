import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute     from "./components/GuestRoute";

// Skeleton
import { PageSkeleton } from "./components/SkeletonLoaders";

/* ═══ LAZY LOADING — imports case-sensitive (Vercel/Linux) ═══ */
const HomePage = lazy(() => import("./pages/Homepage"));        // Homepage.jsx
const Login    = lazy(() => import("./pages/Login"));           // Login.jsx
const Register = lazy(() => import("./pages/Register"));        // Register.jsx

const Dashboard   = lazy(() => import("./pages/Dashboard"));    // Dashboard.jsx
const Tournaments = lazy(() => import("./pages/Tournaments"));  // Tournaments.jsx
const Leaderboard = lazy(() => import("./pages/Leaderboard"));  // Leaderboard.jsx
const Profile     = lazy(() => import("./pages/Profile"));      // Profile.jsx
const Support     = lazy(() => import("./pages/Support"));      // Support.jsx
const Wallet      = lazy(() => import("./pages/Wallet"));       // Wallet.jsx
const GlobalChat  = lazy(() => import("./pages/GlobalChat"));   // ✅ GlobalChat.jsx (capital C)
const Store       = lazy(() => import("./pages/Store"));        // Store.jsx
const News        = lazy(() => import("./pages/News"));         // News.jsx
const PlayerStats = lazy(() => import("./pages/PlayerStats"));  // ✅ PlayerStats.jsx (capital S)
const Achievements= lazy(() => import("./pages/Achievements")); // Achievements.jsx
const DailyRewards= lazy(() => import("./pages/DailyRewards")); // ✅ DailyRewards.jsx (capital R)

const Teams       = lazy(() => import("./pages/Teams"));        // Teams.jsx
const TeamProfile = lazy(() => import("./pages/TeamProfile"));  // ✅ TeamProfile.jsx (capital P)

const TournamentDetails = lazy(() => import("./pages/TournamentDetails")); // TournamentDetails.jsx
const TournamentWaiting = lazy(() => import("./pages/TournamentWaiting")); // TournamentWaiting.jsx
const TournamentRoom    = lazy(() => import("./pages/TournamentRoom"));    // TournamentRoom.jsx
const ManageTournament  = lazy(() => import("./pages/ManageTournament"));  // ManageTournament.jsx
const CreateTournament  = lazy(() => import("./pages/CreateTournament"));  // CreateTournament.jsx

const FounderDashboard  = lazy(() => import("./pages/FounderDashboard")); // FounderDashboard.jsx
const FounderRequests   = lazy(() => import("./pages/FounderRequests"));  // FounderRequests.jsx

const AdminDashboard    = lazy(() => import("./pages/AdminDashboard"));    // AdminDashboard.jsx
const AdminSupport      = lazy(() => import("./pages/AdminSupport"));      // AdminSupport.jsx
const AdminResults      = lazy(() => import("./pages/AdminResults"));      // ✅ AdminResults.jsx (capital R)
const AdminNews         = lazy(() => import("./pages/AdminNews"));         // ✅ AdminNews.jsx (capital N)
const AdminStorePanel   = lazy(() => import("./pages/AdminStorePanel"));   // ✅ AdminStorePanel.jsx (capital S+P)
const DesignerPanel     = lazy(() => import("./pages/DesignerPanel"));     // ✅ DesignerPanel.jsx (capital P)

const SuperAdmin = lazy(() => import("./pages/SuperAdmin")); // SuperAdmin.jsx
const AdminGrant = lazy(() => import("./pages/AdminGrant")); // AdminGrant.jsx

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ───────────────────────────────────────── */}
        <Route path="/" element={<Lazy><HomePage /></Lazy>} />

        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<Lazy><GuestRoute><Login /></GuestRoute></Lazy>} />
          <Route path="/register" element={<Lazy><GuestRoute><Register /></GuestRoute></Lazy>} />
        </Route>

        {/* /home redirige vers / */}
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* ── PAGES AUTHENTIFIÉES ──────────────────────────── */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

          {/* USER */}
          <Route path="/dashboard"     element={<Lazy><Dashboard /></Lazy>} />
          <Route path="/tournaments"   element={<Lazy><Tournaments /></Lazy>} />
          <Route path="/leaderboard"   element={<Lazy><Leaderboard /></Lazy>} />
          <Route path="/profile"       element={<Lazy><Profile /></Lazy>} />
          <Route path="/support"       element={<Lazy><Support /></Lazy>} />
          <Route path="/wallet"        element={<Lazy><Wallet /></Lazy>} />
          <Route path="/chat"          element={<Lazy><GlobalChat /></Lazy>} />
          <Route path="/store"         element={<Lazy><Store /></Lazy>} />
          <Route path="/news"          element={<Lazy><News /></Lazy>} />
          <Route path="/stats"         element={<Lazy><PlayerStats /></Lazy>} />
          <Route path="/achievements"  element={<Lazy><Achievements /></Lazy>} />
          <Route path="/daily-rewards" element={<Lazy><DailyRewards /></Lazy>} />
          <Route path="/teams"         element={<Lazy><Teams /></Lazy>} />
          <Route path="/teams/:id"     element={<Lazy><TeamProfile /></Lazy>} />

          {/* TOURNAMENT */}
          <Route path="/tournaments/:id"         element={<Lazy><TournamentDetails /></Lazy>} />
          <Route path="/tournaments/:id/waiting" element={<Lazy><TournamentWaiting /></Lazy>} />
          <Route path="/tournaments/:id/room"    element={<Lazy><TournamentRoom /></Lazy>} />
          <Route path="/tournaments/:id/manage"  element={<Lazy><ManageTournament /></Lazy>} />

          {/* FOUNDER */}
          <Route path="/founder"           element={<Lazy><FounderDashboard /></Lazy>} />
          <Route path="/founder/requests"  element={<Lazy><FounderRequests /></Lazy>} />
          <Route path="/founder/results"   element={<Lazy><AdminResults /></Lazy>} />
          <Route path="/create-tournament" element={<Lazy><CreateTournament /></Lazy>} />

          {/* ADMIN */}
          <Route path="/admin"         element={<Lazy><AdminDashboard /></Lazy>} />
          <Route path="/admin/support" element={<Lazy><AdminSupport /></Lazy>} />
          <Route path="/admin/results" element={<Lazy><AdminResults /></Lazy>} />
          <Route path="/admin/news"    element={<Lazy><AdminNews /></Lazy>} />
          <Route path="/admin-store"   element={<Lazy><AdminStorePanel /></Lazy>} />

          {/* DESIGNER */}
          <Route path="/designer" element={<Lazy><DesignerPanel /></Lazy>} />

          {/* SUPER ADMIN */}
          <Route path="/super-admin"       element={<Lazy><SuperAdmin /></Lazy>} />
          <Route path="/super-admin/grant" element={<Lazy><AdminGrant /></Lazy>} />

        </Route>

        {/* ── 404 ─────────────────────────────────────────── */}
        <Route path="*" element={
          <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
              <h1 style={{ fontSize:80, fontFamily:"monospace", color:"#8b3dff", margin:0 }}>404</h1>
              <p style={{ color:"rgba(255,255,255,.3)", fontFamily:"monospace", letterSpacing:4, fontSize:12, marginBottom:32 }}>PAGE NON TROUVÉE</p>
              <a href="/" style={{ padding:"13px 32px", borderRadius:12, background:"linear-gradient(135deg,#8b3dff,#4f46e5)", color:"#fff", fontFamily:"monospace", fontSize:11, letterSpacing:2, textDecoration:"none" }}>← ACCUEIL</a>
            </div>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}