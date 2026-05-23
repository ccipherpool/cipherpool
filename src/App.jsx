import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet } from "react-router-dom";
import { Button } from "./components/ui/Button";

// Layouts (not lazy — needed immediately)
import AuthLayout  from "./layouts/AuthLayout";
import MainLayout  from "./layouts/MainLayout";

// Route Protection (not lazy — needed immediately)
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute     from "./components/GuestRoute";

// ── Lazy Pages ─────────────────────────────────────────────────────
// Public
const Home           = lazy(() => import("./pages/Home"));
const Login          = lazy(() => import("./pages/Login"));
const Register       = lazy(() => import("./pages/Register"));
const StaffPage      = lazy(() => import("./pages/Team"));
const VerifyEmail    = lazy(() => import("./pages/VerifyEmail"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword  = lazy(() => import("./pages/ResetPassword"));

// User
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile     = lazy(() => import("./pages/Profile"));
const Support     = lazy(() => import("./pages/Support"));
const Wallet      = lazy(() => import("./pages/Wallet"));
const GlobalChat  = lazy(() => import("./pages/Globalchat"));
const Store       = lazy(() => import("./pages/Store"));
const News        = lazy(() => import("./pages/News"));
const PlayerStats = lazy(() => import("./pages/Playerstats"));
const Achievements = lazy(() => import("./pages/Achievements"));
const DailyRewards = lazy(() => import("./pages/Dailyrewards"));

// Tournament
const TournamentDetails = lazy(() => import("./pages/TournamentDetails"));
const TournamentWaiting = lazy(() => import("./pages/TournamentWaiting"));
const TournamentRoom    = lazy(() => import("./pages/TournamentRoom"));
const ManageTournament  = lazy(() => import("./pages/ManageTournament"));
const CreateTournament  = lazy(() => import("./pages/CreateTournament"));

// Teams
const Teams       = lazy(() => import("./pages/Teams"));
const TeamProfile = lazy(() => import("./pages/Teamprofile"));

// Clans
const Clans       = lazy(() => import("./pages/Clans"));
const ClanDetails = lazy(() => import("./pages/ClanDetails"));
const CreateClan  = lazy(() => import("./pages/CreateClan"));

// Community
const HallOfFame    = lazy(() => import("./pages/HallOfFame"));
const Ideas         = lazy(() => import("./pages/community/Ideas"));
const BugBounty     = lazy(() => import("./pages/community/BugBounty"));
const AdminCareer   = lazy(() => import("./pages/community/AdminCareer"));

// Reports & Recruitment
const Reports               = lazy(() => import("./pages/Reports"));
const AdminApplications     = lazy(() => import("./pages/AdminApplications"));
const AdminApplicationDetail = lazy(() => import("./pages/AdminApplicationDetail"));
const AdminVoting           = lazy(() => import("./pages/AdminVoting"));
const AdminReports          = lazy(() => import("./pages/admin/AdminReports"));
const GovernanceDashboard   = lazy(() => import("./pages/admin/GovernanceDashboard"));

// Founder
const FounderDashboard = lazy(() => import("./pages/FounderDashboard"));
const FounderRequests  = lazy(() => import("./pages/FounderRequests"));

// Admin
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard"));
const AdminSupport    = lazy(() => import("./pages/AdminSupport"));
const Adminresults    = lazy(() => import("./pages/Adminresults"));
const Adminnews       = lazy(() => import("./pages/Adminnews"));
const AdminStorePanel = lazy(() => import("./pages/Adminstorepanel"));
const DesignerPanel   = lazy(() => import("./pages/Designerpanel"));

// Super Admin
const SuperAdmin    = lazy(() => import("./pages/SuperAdmin"));
const AdminGrant    = lazy(() => import("./pages/AdminGrant"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));

// Public
const PublicTournament = lazy(() => import("./pages/PublicTournament"));

// ── Loading fallback ────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="h-full min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-mint/20 border-t-mint animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── PUBLIC ── */}
          <Route element={<AuthLayout />}>
            <Route path="/"         element={<GuestRoute><Home /></GuestRoute>} />
            <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/team"     element={<StaffPage />} />

            {/* Auth flow — accessible without login */}
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* Public tournament page — shareable without login */}
            <Route path="/t/:id" element={<PublicTournament />} />

            <Route path="/connexion"   element={<Navigate to="/login" replace />} />
            <Route path="/inscription" element={<Navigate to="/register" replace />} />
          </Route>

          {/* ── USER ── */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/tournaments"   element={<Tournaments />} />
            <Route path="/arena"         element={<Navigate to="/tournaments" replace />} />
            <Route path="/leaderboard"   element={<Leaderboard />} />
            <Route path="/profile"       element={<Profile />} />
            <Route path="/support"       element={<Support />} />
            <Route path="/wallet"        element={<Wallet />} />
            <Route path="/chat"          element={<GlobalChat />} />
            <Route path="/store"         element={<Store />} />
            <Route path="/news"          element={<News />} />
            <Route path="/stats"         element={<PlayerStats />} />
            <Route path="/achievements"  element={<Achievements />} />
            <Route path="/daily-rewards" element={<DailyRewards />} />

            <Route path="/tournois"      element={<Navigate to="/tournaments" replace />} />
            <Route path="/boutique"      element={<Navigate to="/store" replace />} />
            <Route path="/portefeuille"  element={<Navigate to="/wallet" replace />} />
            <Route path="/classement"    element={<Navigate to="/leaderboard" replace />} />
            <Route path="/actualites"    element={<Navigate to="/news" replace />} />
            <Route path="/succes"        element={<Navigate to="/achievements" replace />} />

            <Route path="/teams"     element={<Teams />} />
            <Route path="/teams/:id" element={<TeamProfile />} />

            <Route path="/clans"        element={<Clans />} />
            <Route path="/clans/create" element={<CreateClan />} />
            <Route path="/clans/:id"    element={<ClanDetails />} />

            <Route path="/hall-of-fame"    element={<HallOfFame />} />
            <Route path="/community/ideas" element={<Ideas />} />
            <Route path="/community/bugs"  element={<BugBounty />} />
            <Route path="/community/admin-career" element={<AdminCareer />} />
            <Route path="/reports"               element={<Reports />} />

            <Route path="/tournaments/:id"         element={<TournamentDetails />} />
            <Route path="/tournaments/:id/waiting" element={<TournamentWaiting />} />
            <Route path="/tournaments/:id/room"    element={<TournamentRoom />} />
            <Route path="/tournaments/:id/manage"  element={<ManageTournament />} />
          </Route>

          {/* ── FOUNDER ── */}
          <Route element={<ProtectedRoute allowedRoles={["founder","fondateur","super_admin"]}><MainLayout /></ProtectedRoute>}>
            <Route path="/founder"           element={<FounderDashboard />} />
            <Route path="/founder/requests"  element={<FounderRequests />} />
            <Route path="/founder/results"   element={<Adminresults />} />
            <Route path="/create-tournament" element={<CreateTournament />} />
          </Route>

          {/* ── ADMIN ── */}
          <Route element={<ProtectedRoute allowedRoles={["admin","fondateur","founder","super_admin"]}><MainLayout /></ProtectedRoute>}>
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/admin/support"      element={<AdminSupport />} />
            <Route path="/admin/results"      element={<Adminresults />} />
            <Route path="/admin/news"         element={<Adminnews />} />
            <Route path="/admin-store"        element={<AdminStorePanel />} />
            <Route path="/admin/reports"      element={<AdminReports />} />
            <Route path="/admin/governance"   element={<GovernanceDashboard />} />
            <Route path="/admin-applications" element={<AdminApplications />} />
            <Route path="/admin-application/:id" element={<AdminApplicationDetail />} />
            <Route path="/admin-voting"       element={<AdminVoting />} />
          </Route>

          {/* ── DESIGNER ── */}
          <Route element={<ProtectedRoute allowedRoles={["designer","admin","super_admin"]}><MainLayout /></ProtectedRoute>}>
            <Route path="/designer" element={<DesignerPanel />} />
          </Route>

          {/* ── SUPER ADMIN — standalone, no MainLayout ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin"]}><Outlet /></ProtectedRoute>}>
            <Route path="/super-admin"         element={<SuperAdmin />} />
            <Route path="/super-admin/grant"   element={<AdminGrant />} />
            <Route path="/command-center"      element={<CommandCenter />} />
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={
            <div className="min-h-screen bg-obsidian flex items-center justify-center p-8">
              <div className="text-center">
                <h1 className="text-9xl font-heading font-black text-white/5 relative">
                  404
                  <span className="absolute inset-0 flex items-center justify-center text-5xl text-mint drop-shadow-neon-mint">
                    LOST IN ARENA
                  </span>
                </h1>
                <p className="text-slate-500 font-black text-xs uppercase tracking-[0.5em] mt-8 mb-12">
                  System protocol error: target resource not found.
                </p>
                <Link to="/dashboard">
                  <Button variant="primary" size="lg">
                    Return to Command Center
                  </Button>
                </Link>
              </div>
            </div>
          } />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
