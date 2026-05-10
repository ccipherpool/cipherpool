import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { Button } from "./components/ui/Button";

// ... (imports remain the same)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route element={<AuthLayout />}>
          <Route path="/"         element={<GuestRoute><Home /></GuestRoute>} />
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/team"     element={<StaffPage />} />
          
          {/* French Aliases */}
          <Route path="/connexion" element={<Navigate to="/login" replace />} />
          <Route path="/inscription" element={<Navigate to="/register" replace />} />
        </Route>

        {/* ── USER ── */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/tournaments"  element={<Tournaments />} />
          <Route path="/leaderboard"  element={<Leaderboard />} />
          <Route path="/profile"      element={<Profile />} />
          <Route path="/support"      element={<Support />} />
          <Route path="/wallet"       element={<Wallet />} />
          <Route path="/chat"         element={<GlobalChat />} />
          <Route path="/store"        element={<Store />} />
          <Route path="/news"         element={<News />} />
          <Route path="/stats"        element={<PlayerStats />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/daily-rewards" element={<DailyRewards />} />

          {/* French Aliases for Users */}
          <Route path="/tournois"     element={<Navigate to="/tournaments" replace />} />
          <Route path="/boutique"     element={<Navigate to="/store" replace />} />
          <Route path="/portefeuille" element={<Navigate to="/wallet" replace />} />
          <Route path="/classement"   element={<Navigate to="/leaderboard" replace />} />
          <Route path="/actualites"   element={<Navigate to="/news" replace />} />
          <Route path="/succes"       element={<Navigate to="/achievements" replace />} />

          {/* Teams */}
          <Route path="/teams"      element={<Teams />} />
          <Route path="/teams/:id"  element={<TeamProfile />} />

          {/* Clans — /clans/create MUST come before /clans/:id */}
          <Route path="/clans"         element={<Clans />} />
          <Route path="/clans/create"  element={<CreateClan />} />
          <Route path="/clans/:id"     element={<ClanDetails />} />

          {/* Community */}
          <Route path="/team"          element={<Team />} />
          <Route path="/hall-of-fame"  element={<HallOfFame />} />

          {/* Tournaments */}
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
          <Route path="/admin"          element={<AdminDashboard />} />
          <Route path="/admin/support"  element={<AdminSupport />} />
          <Route path="/admin/results"  element={<Adminresults />} />
          <Route path="/admin/news"     element={<Adminnews />} />
          <Route path="/admin-store"    element={<AdminStorePanel />} />
        </Route>

        {/* ── DESIGNER ── */}
        <Route element={<ProtectedRoute allowedRoles={["designer","admin","super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/designer" element={<DesignerPanel />} />
        </Route>

        {/* ── SUPER ADMIN ── */}
        <Route element={<ProtectedRoute allowedRoles={["super_admin"]}><MainLayout /></ProtectedRoute>}>
          <Route path="/super-admin"       element={<SuperAdmin />} />
          <Route path="/super-admin/grant" element={<AdminGrant />} />
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
    </BrowserRouter>
  );
}
