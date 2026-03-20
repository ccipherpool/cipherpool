import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/Queryclient";
import { NotificationProvider } from "./components/NotificationSystem";

// Layouts
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

// Auth pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Public landing
import Homepage from "./pages/Homepage";

// Protected pages
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentDetails from "./pages/TournamentDetails";
import TournamentWaiting from "./pages/TournamentWaiting";
import TournamentRoom from "./pages/TournamentRoom";
import Teams from "./pages/Teams";
import TeamProfile from "./pages/Teamprofile";
import Leaderboard from "./pages/Leaderboard";
import Store from "./pages/Store";
import News from "./pages/News";
import Profile from "./pages/Profile";
import PlayerStats from "./pages/Playerstats";
import GlobalChat from "./pages/GlobalChat";
import Wallet from "./pages/Wallet";
import Achievements from "./pages/Achievements";
import DailyRewards from "./pages/DailyRewards";
import Submitresult from "./pages/Submitresult";
import Support from "./pages/Support";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminGrant from "./pages/AdminGrant";
import AdminNews from "./pages/Adminnews";
import AdminResults from "./pages/Adminresults";
import AdminStorePanel from "./pages/Adminstorepanel";
import AdminSupport from "./pages/AdminSupport";
import CreateTournament from "./pages/CreateTournament";
import ManageTournament from "./pages/ManageTournament";
import SuperAdmin from "./pages/SuperAdmin";
import FounderDashboard from "./pages/FounderDashboard";
import FounderRequests from "./pages/FounderRequests";
import DesignerPanel from "./pages/Designerpanel";

// Route guard
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>

            {/* ── Racine : redirect vers /home ───────────────── */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* ── Auth (pas de layout) ───────────────────────── */}
            <Route element={<AuthLayout />}>
              <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            </Route>

            {/* ── Toutes les pages avec MainLayout ───────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>

                {/* Public — visible par tout le monde (visiteur + user) */}
                <Route path="/home"        element={<Homepage />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/tournaments/:id" element={<TournamentDetails />} />
                <Route path="/teams"       element={<Teams />} />
                <Route path="/teams/:id"   element={<TeamProfile />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/news"        element={<News />} />
                <Route path="/profile"     element={<Profile />} />

                {/* User connecté */}
                <Route path="/dashboard"   element={<Dashboard />} />
                <Route path="/store"       element={<Store />} />
                <Route path="/stats"       element={<PlayerStats />} />
                <Route path="/chat"        element={<GlobalChat />} />
                <Route path="/wallet"      element={<Wallet />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/rewards"     element={<DailyRewards />} />
                <Route path="/submit-result" element={<Submitresult />} />
                <Route path="/support"     element={<Support />} />
                <Route path="/tournaments/:id/waiting" element={<TournamentWaiting />} />
                <Route path="/tournaments/:id/room"    element={<TournamentRoom />} />

                {/* Admin */}
                <Route path="/admin"          element={<AdminDashboard />} />
                <Route path="/admin/grant"    element={<AdminGrant />} />
                <Route path="/admin/news"     element={<AdminNews />} />
                <Route path="/admin/results"  element={<AdminResults />} />
                <Route path="/admin/store"    element={<AdminStorePanel />} />
                <Route path="/admin/support"  element={<AdminSupport />} />
                <Route path="/admin/create-tournament"  element={<CreateTournament />} />
                <Route path="/admin/manage-tournament"  element={<ManageTournament />} />

                {/* Super Admin / Founder / Designer */}
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route path="/founder"     element={<FounderDashboard />} />
                <Route path="/founder/requests" element={<FounderRequests />} />
                <Route path="/designer"    element={<DesignerPanel />} />

              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />

          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </QueryClientProvider>
  );
}