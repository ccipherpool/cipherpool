import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import { PageSkeleton } from "./components/SkeletonLoaders";

const Homepage = lazy(() => import("./pages/Homepage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

const Tournaments = lazy(() => import("./pages/Tournaments"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Support = lazy(() => import("./pages/Support"));
const Wallet = lazy(() => import("./pages/Wallet"));
const GlobalChat = lazy(() => import("./pages/GlobalChat"));
const Store = lazy(() => import("./pages/Store"));
const News = lazy(() => import("./pages/News"));
const PlayerStats = lazy(() => import("./pages/PlayerStats"));
const Achievements = lazy(() => import("./pages/Achievements"));
const DailyRewards = lazy(() => import("./pages/DailyRewards"));
const Teams = lazy(() => import("./pages/Teams"));
const TeamProfile = lazy(() => import("./pages/TeamProfile"));

const TournamentDetails = lazy(() => import("./pages/TournamentDetails"));
const TournamentWaiting = lazy(() => import("./pages/TournamentWaiting"));
const TournamentRoom = lazy(() => import("./pages/TournamentRoom"));
const ManageTournament = lazy(() => import("./pages/ManageTournament"));
const CreateTournament = lazy(() => import("./pages/CreateTournament"));

const FounderDashboard = lazy(() => import("./pages/FounderDashboard"));
const FounderRequests = lazy(() => import("./pages/FounderRequests"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const AdminResults = lazy(() => import("./pages/AdminResults"));
const AdminNews = lazy(() => import("./pages/AdminNews"));
const AdminStorePanel = lazy(() => import("./pages/AdminStorePanel"));
const DesignerPanel = lazy(() => import("./pages/DesignerPanel"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const AdminGrant = lazy(() => import("./pages/AdminGrant"));

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lazy><Homepage /></Lazy>} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Lazy><GuestRoute><Login /></GuestRoute></Lazy>} />
          <Route path="/register" element={<Lazy><GuestRoute><Register /></GuestRoute></Lazy>} />
        </Route>

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/tournaments" element={<Lazy><Tournaments /></Lazy>} />
          <Route path="/leaderboard" element={<Lazy><Leaderboard /></Lazy>} />
          <Route path="/profile" element={<Lazy><Profile /></Lazy>} />
          <Route path="/support" element={<Lazy><Support /></Lazy>} />
          <Route path="/wallet" element={<Lazy><Wallet /></Lazy>} />
          <Route path="/chat" element={<Lazy><GlobalChat /></Lazy>} />
          <Route path="/store" element={<Lazy><Store /></Lazy>} />
          <Route path="/news" element={<Lazy><News /></Lazy>} />
          <Route path="/stats" element={<Lazy><PlayerStats /></Lazy>} />
          <Route path="/achievements" element={<Lazy><Achievements /></Lazy>} />
          <Route path="/daily-rewards" element={<Lazy><DailyRewards /></Lazy>} />
          <Route path="/teams" element={<Lazy><Teams /></Lazy>} />
          <Route path="/teams/:id" element={<Lazy><TeamProfile /></Lazy>} />

          <Route path="/tournaments/:id" element={<Lazy><TournamentDetails /></Lazy>} />
          <Route path="/tournaments/:id/waiting" element={<Lazy><TournamentWaiting /></Lazy>} />
          <Route path="/tournaments/:id/room" element={<Lazy><TournamentRoom /></Lazy>} />
          <Route path="/tournaments/:id/manage" element={<Lazy><ManageTournament /></Lazy>} />

          <Route path="/founder" element={<Lazy><FounderDashboard /></Lazy>} />
          <Route path="/founder/requests" element={<Lazy><FounderRequests /></Lazy>} />
          <Route path="/founder/results" element={<Lazy><AdminResults /></Lazy>} />
          <Route path="/create-tournament" element={<Lazy><CreateTournament /></Lazy>} />

          <Route path="/admin" element={<Lazy><AdminDashboard /></Lazy>} />
          <Route path="/admin/support" element={<Lazy><AdminSupport /></Lazy>} />
          <Route path="/admin/results" element={<Lazy><AdminResults /></Lazy>} />
          <Route path="/admin/news" element={<Lazy><AdminNews /></Lazy>} />
          <Route path="/admin-store" element={<Lazy><AdminStorePanel /></Lazy>} />

          <Route path="/designer" element={<Lazy><DesignerPanel /></Lazy>} />
          <Route path="/super-admin" element={<Lazy><SuperAdmin /></Lazy>} />
          <Route path="/super-admin/grant" element={<Lazy><AdminGrant /></Lazy>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}