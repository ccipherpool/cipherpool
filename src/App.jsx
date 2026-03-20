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

/* ═══ LAZY LOADING ═══ */
// ✅ Home.jsx = seule landing page (Homepage.jsx supprimé)
const Home     = lazy(() => import("./pages/Home"));
const Login    = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile     = lazy(() => import("./pages/Profile"));
const Support     = lazy(() => import("./pages/Support"));
const Wallet      = lazy(() => import("./pages/Wallet"));
const GlobalChat  = lazy(() => import("./pages/GlobalChat"));
const Store       = lazy(() => import("./pages/Store"));
const News        = lazy(() => import("./pages/News"));
const PlayerStats = lazy(() => import("./pages/PlayerStats"));
const Achievements= lazy(() => import("./pages/Achievements"));
const DailyRewards= lazy(() => import("./pages/DailyRewards"));

const Teams       = lazy(() => import("./pages/Teams"));
const TeamProfile = lazy(() => import("./pages/TeamProfile"));

const TournamentDetails = lazy(() => import("./pages/TournamentDetails"));
const TournamentWaiting = lazy(() => import("./pages/TournamentWaiting"));
const TournamentRoom    = lazy(() => import("./pages/TournamentRoom"));
const ManageTournament  = lazy(() => import("./pages/ManageTournament"));
const CreateTournament  = lazy(() => import("./pages/CreateTournament"));

const FounderDashboard  = lazy(() => import("./pages/FounderDashboard"));
const FounderRequests   = lazy(() => import("./pages/FounderRequests"));

const AdminDashboard    = lazy(() => import("./pages/AdminDashboard"));
const AdminSupport      = lazy(() => import("./pages/AdminSupport"));
const AdminResults      = lazy(() => import("./pages/AdminResults"));
const AdminNews         = lazy(() => import("./pages/AdminNews"));
const AdminStorePanel   = lazy(() => import("./pages/AdminStorePanel"));
const DesignerPanel     = lazy(() => import("./pages/DesignerPanel"));

const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const AdminGrant = lazy(() => import("./pages/AdminGrant"));

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ─────────────────────────────────────────
            / et /home → Home.jsx (landing page unique)
        ─────────────────────────────────────────────────── */}
        <Route path="/"     element={<Lazy><Home /></Lazy>} />
        <Route path="/home" element={<Navigate to="/" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<Lazy><GuestRoute><Login /></GuestRoute></Lazy>} />
          <Route path="/register" element={<Lazy><GuestRoute><Register /></GuestRoute></Lazy>} />
        </Route>

        {/* ── PAGES AUTHENTIFIÉES ────────────────────────── */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

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

          <Route path="/tournaments/:id"         element={<Lazy><TournamentDetails /></Lazy>} />
          <Route path="/tournaments/:id/waiting" element={<Lazy><TournamentWaiting /></Lazy>} />
          <Route path="/tournaments/:id/room"    element={<Lazy><TournamentRoom /></Lazy>} />
          <Route path="/tournaments/:id/manage"  element={<Lazy><ManageTournament /></Lazy>} />

          <Route path="/founder"           element={<Lazy><FounderDashboard /></Lazy>} />
          <Route path="/founder/requests"  element={<Lazy><FounderRequests /></Lazy>} />
          <Route path="/founder/results"   element={<Lazy><AdminResults /></Lazy>} />
          <Route path="/create-tournament" element={<Lazy><CreateTournament /></Lazy>} />

          <Route path="/admin"         element={<Lazy><AdminDashboard /></Lazy>} />
          <Route path="/admin/support" element={<Lazy><AdminSupport /></Lazy>} />
          <Route path="/admin/results" element={<Lazy><AdminResults /></Lazy>} />
          <Route path="/admin/news"    element={<Lazy><AdminNews /></Lazy>} />
          <Route path="/admin-store"   element={<Lazy><AdminStorePanel /></Lazy>} />

          <Route path="/designer"          element={<Lazy><DesignerPanel /></Lazy>} />
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