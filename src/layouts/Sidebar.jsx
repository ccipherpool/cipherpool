import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Sidebar({ profile }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // ── Navigation principale ──────────────────────────────────────
  const mainLinks = [
    { path:"/dashboard",     icon:"🏠", label:"Dashboard" },
    { path:"/tournaments",   icon:"🏆", label:"Tournois" },
    { path:"/leaderboard",   icon:"📊", label:"Classement" },
    { path:"/teams",         icon:"👥", label:"Équipes" },
    { path:"/news",          icon:"📰", label:"Actualités" },
    { path:"/chat",          icon:"💬", label:"Chat Global" },
    { path:"/store",         icon:"🛍️", label:"Boutique" },
    { path:"/stats",         icon:"⚔️", label:"Mes Stats" },
    { path:"/achievements",  icon:"🏅", label:"Achievements" },
    { path:"/daily-rewards", icon:"🎁", label:"Récompenses" },
    { path:"/wallet",        icon:"💰", label:"Portefeuille" },
    { path:"/profile",       icon:"👤", label:"Mon Profil" },
    { path:"/support",       icon:"🎟️", label:"Support" },
  ];

  // ── Liens fondateur ────────────────────────────────────────────
  const founderLinks = [
    { path:"/founder",           icon:"🎮", label:"Founder Panel" },
    { path:"/create-tournament", icon:"➕", label:"Créer Tournoi" },
    { path:"/founder/requests",  icon:"📋", label:"Demandes" },
    { path:"/founder/results",   icon:"📈", label:"Résultats" },
  ];

  // ── Liens admin ────────────────────────────────────────────────
  const adminLinks = [
    { path:"/admin",         icon:"🛡️", label:"Admin Panel" },
    { path:"/admin/support", icon:"🎟️", label:"Tickets" },
    { path:"/admin/results", icon:"📊", label:"Résultats" },
    { path:"/admin/news",    icon:"📰", label:"Actualités" },
    { path:"/admin-store",   icon:"🛒", label:"Boutique Admin" },
  ];

  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin      = profile?.role === "admin" || isSuperAdmin;
  const isFounder    = profile?.role === "founder";
  const isDesigner   = profile?.role === "designer" || isAdmin;

  const Link = ({ item }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${
          isActive ? "bg-purple-600/20 text-purple-400" : "text-white/60 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <span>{item.icon}</span>
      {item.label}
    </NavLink>
  );

  const SectionTitle = ({ label }) => (
    <p className="px-4 pt-5 pb-1 text-[10px] font-bold tracking-widest text-white/20 uppercase">{label}</p>
  );

  return (
    <aside className="w-64 bg-[#11151C] border-r border-white/5 min-h-screen flex flex-col">

      {/* Logo */}
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-purple-400">CIPHER</span>POOL
        </h1>
        <p className="text-xs text-white/30 mt-1 capitalize">{profile?.role || "user"}</p>
      </div>

      {/* Navigation scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">

        <SectionTitle label="Principal" />
        {mainLinks.map(item => <Link key={item.path} item={item} />)}

        {isFounder && (<>
          <SectionTitle label="Fondateur" />
          {founderLinks.map(item => <Link key={item.path} item={item} />)}
        </>)}

        {isDesigner && !isAdmin && (<>
          <SectionTitle label="Création" />
          <Link item={{ path:"/designer", icon:"🎨", label:"Designer Studio" }} />
          <Link item={{ path:"/store",    icon:"🛍️", label:"Boutique" }} />
        </>)}

        {isAdmin && (<>
          <SectionTitle label="Administration" />
          {adminLinks.map(item => <Link key={item.path} item={item} />)}
        </>)}

        {isSuperAdmin && (<>
          <SectionTitle label="Super Admin" />
          <Link item={{ path:"/super-admin",       icon:"👑", label:"Super Admin" }} />
          <Link item={{ path:"/super-admin/grant", icon:"💎", label:"Gestion Coins" }} />
          <Link item={{ path:"/designer",          icon:"🎨", label:"Designer Studio" }} />
          <Link item={{ path:"/admin-store",       icon:"📦", label:"Store Admin" }} />
        </>)}

      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/50 hover:bg-red-500/10 hover:text-red-400 transition text-sm"
        >
          <span>🚪</span>
          Déconnexion
        </button>
      </div>

    </aside>
  );
}