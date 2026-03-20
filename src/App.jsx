import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";

// Route Protection
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute     from "./components/GuestRoute";

// Skeleton
import { PageSkeleton } from "./components/SkeletonLoaders";

/* ═══ LAZY LOADING ═══ */
const Home     = lazy(() => import("./pages/Home"));
const Login    = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const HomePage = lazy(() => import("./pages/Homepage"));
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
const Achievements= lazy(() => import("./pages/Achievements"));
const DailyRewards= lazy(() => import("./pages/Dailyrewards"));

const Teams       = lazy(() => import("./pages/Teams"));
const TeamProfile = lazy(() => import("./pages/Teamprofile"));

const TournamentDetails = lazy(() => import("./pages/TournamentDetails"));
const TournamentWaiting = lazy(() => import("./pages/TournamentWaiting"));
const TournamentRoom    = lazy(() => import("./pages/TournamentRoom"));
const ManageTournament  = lazy(() => import("./pages/ManageTournament"));
const CreateTournament  = lazy(() => import("./pages/CreateTournament"));

const FounderDashboard  = lazy(() => import("./pages/FounderDashboard"));
const FounderRequests   = lazy(() => import("./pages/FounderRequests"));

const AdminDashboard    = lazy(() => import("./pages/AdminDashboard"));
const AdminSupport      = lazy(() => import("./pages/AdminSupport"));
const Adminresults      = lazy(() => import("./pages/Adminresults"));
const Adminnews         = lazy(() => import("./pages/Adminnews"));
const AdminStorePanel   = lazy(() => import("./pages/Adminstorepanel"));
const DesignerPanel     = lazy(() => import("./pages/Designerpanel"));

const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const AdminGrant = lazy(() => import("./pages/AdminGrant"));

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route element={<AuthLayout />}>
          <Route path="/"         element={<Lazy><GuestRoute><Home/></GuestRoute></Lazy>}/>
          <Route path="/login"    element={<Lazy><GuestRoute><Login/></GuestRoute></Lazy>}/>
          <Route path="/register" element={<Lazy><GuestRoute><Register/></GuestRoute></Lazy>}/>
        </Route>

        {/* HOME — PUBLIC, standalone layout */}
        <Route path="/home" element={<Lazy><HomePage/></Lazy>}/>

        {/* TOUTES LES PAGES AUTHENTIFIÉES — UN SEUL ProtectedRoute + MainLayout */}
        <Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>

          {/* USER */}
          <Route path="/dashboard"     element={<Lazy><Dashboard/></Lazy>}/>
          <Route path="/tournaments"   element={<Lazy><Tournaments/></Lazy>}/>
          <Route path="/leaderboard"   element={<Lazy><Leaderboard/></Lazy>}/>
          <Route path="/profile"       element={<Lazy><Profile/></Lazy>}/>
          <Route path="/support"       element={<Lazy><Support/></Lazy>}/>
          <Route path="/wallet"        element={<Lazy><Wallet/></Lazy>}/>
          <Route path="/chat"          element={<Lazy><GlobalChat/></Lazy>}/>
          <Route path="/store"         element={<Lazy><Store/></Lazy>}/>
          <Route path="/news"          element={<Lazy><News/></Lazy>}/>
          <Route path="/stats"         element={<Lazy><PlayerStats/></Lazy>}/>
          <Route path="/achievements"  element={<Lazy><Achievements/></Lazy>}/>
          <Route path="/daily-rewards" element={<Lazy><DailyRewards/></Lazy>}/>
          <Route path="/teams"         element={<Lazy><Teams/></Lazy>}/>
          <Route path="/teams/:id"     element={<Lazy><TeamProfile/></Lazy>}/>
          <Route path="/tournaments/:id"         element={<Lazy><TournamentDetails/></Lazy>}/>
          <Route path="/tournaments/:id/waiting" element={<Lazy><TournamentWaiting/></Lazy>}/>
          <Route path="/tournaments/:id/room"    element={<Lazy><TournamentRoom/></Lazy>}/>
          <Route path="/tournaments/:id/manage"  element={<Lazy><ManageTournament/></Lazy>}/>

          {/* FOUNDER */}
          <Route path="/founder"           element={<Lazy><FounderDashboard/></Lazy>}/>
          <Route path="/founder/requests"  element={<Lazy><FounderRequests/></Lazy>}/>
          <Route path="/founder/results"   element={<Lazy><Adminresults/></Lazy>}/>
          <Route path="/create-tournament" element={<Lazy><CreateTournament/></Lazy>}/>

          {/* ADMIN */}
          <Route path="/admin"         element={<Lazy><AdminDashboard/></Lazy>}/>
          <Route path="/admin/support" element={<Lazy><AdminSupport/></Lazy>}/>
          <Route path="/admin/results" element={<Lazy><Adminresults/></Lazy>}/>
          <Route path="/admin/news"    element={<Lazy><Adminnews/></Lazy>}/>
          <Route path="/admin-store"   element={<Lazy><AdminStorePanel/></Lazy>}/>

          {/* DESIGNER */}
          <Route path="/designer" element={<Lazy><DesignerPanel/></Lazy>}/>

          {/* SUPER ADMIN */}
          <Route path="/super-admin"       element={<Lazy><SuperAdmin/></Lazy>}/>
          <Route path="/super-admin/grant" element={<Lazy><AdminGrant/></Lazy>}/>

        </Route>

        {/* 404 */}
        <Route path="*" element={
          <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{textAlign:"center"}}>
              <h1 style={{fontSize:80,fontFamily:"monospace",color:"#8b3dff",margin:0}}>404</h1>
              <p style={{color:"rgba(255,255,255,.3)",fontFamily:"monospace",letterSpacing:4,fontSize:12,marginBottom:32}}>PAGE NON TROUVÉE</p>
              <a href="/home" style={{padding:"13px 32px",borderRadius:12,background:"linear-gradient(135deg,#8b3dff,#4f46e5)",color:"#fff",fontFamily:"monospace",fontSize:11,letterSpacing:2,textDecoration:"none"}}>← ACCUEIL</a>
            </div>
          </div>
        }/>

      </Routes>
    </BrowserRouter>
  );
}