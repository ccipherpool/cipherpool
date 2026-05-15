import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Trophy, BarChart3, Ticket,
  ShieldAlert, Crown, LogOut,
  MessageSquare, Users2, ShoppingBag, Wallet, Star,
  Newspaper, Zap, Layout, TrendingUp, Gift,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const SidebarLink = ({ to, icon: Icon, label, isActive }) => (
  <NavLink
    to={to}
    className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all duration-150 ${
      isActive
        ? 'bg-mint/[0.12] text-mint'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
    }`}
  >
    <Icon
      size={15}
      strokeWidth={isActive ? 2.5 : 2}
      className={isActive ? 'text-mint flex-shrink-0' : 'text-slate-500 group-hover:text-slate-300 flex-shrink-0 transition-colors'}
    />
    <span className="flex-1 truncate">{label}</span>
    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-mint flex-shrink-0" />}
  </NavLink>
);

const Section = ({ label, children }) => (
  <div className="space-y-0.5">
    <p className="px-3 text-[8px] font-black uppercase tracking-[0.35em] text-slate-600 mb-1">{label}</p>
    {children}
  </div>
);

export default function Sidebar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isFounder = ["founder", "fondateur", "super_admin"].includes(profile?.role);
  const isDesigner = ["designer", "admin", "super_admin"].includes(profile?.role);
  const isAdmin   = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 flex-col h-full bg-[#080d18] border-r border-white/[0.05] overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
        <img src="/logo.png" alt="CipherPool" className="h-10 w-auto object-contain" />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-hide">

        <Section label="Navigation">
          <SidebarLink to="/dashboard"   icon={LayoutDashboard} label="Dashboard"   isActive={p === '/dashboard'} />
          <SidebarLink to="/tournaments" icon={Trophy}           label="Tournois"    isActive={p.startsWith('/tournaments')} />
          <SidebarLink to="/leaderboard" icon={BarChart3}        label="Classement"  isActive={p === '/leaderboard'} />
          <SidebarLink to="/chat"        icon={MessageSquare}    label="Chat Global" isActive={p === '/chat'} />
          <SidebarLink to="/clans"       icon={Users2}           label="Clans"       isActive={p.startsWith('/clans')} />
        </Section>

        <Section label="Économie">
          <SidebarLink to="/store"  icon={ShoppingBag} label="Boutique" isActive={p === '/store'} />
          <SidebarLink to="/wallet" icon={Wallet}      label="Wallet"   isActive={p === '/wallet'} />
        </Section>

        <Section label="Progression">
          <SidebarLink to="/stats"         icon={TrendingUp} label="Statistiques"    isActive={p === '/stats'} />
          <SidebarLink to="/achievements"  icon={Star}       label="Succès"          isActive={p === '/achievements'} />
          <SidebarLink to="/daily-rewards" icon={Gift}       label="Récompenses"     isActive={p === '/daily-rewards'} />
          <SidebarLink to="/hall-of-fame"  icon={Crown}      label="Hall of Fame"    isActive={p === '/hall-of-fame'} />
        </Section>

        <Section label="Plus">
          <SidebarLink to="/news"    icon={Newspaper} label="Actualités" isActive={p === '/news'} />
          <SidebarLink to="/support" icon={Ticket}    label="Support"    isActive={p === '/support'} />
        </Section>

        {(isFounder || isDesigner || isAdmin) && (
          <div className="pt-2 border-t border-white/[0.05] space-y-4">
            {isFounder && (
              <Section label="Founder">
                <SidebarLink to="/founder" icon={Crown} label="Founder Hub" isActive={p.startsWith('/founder')} />
              </Section>
            )}
            {isDesigner && (
              <Section label="Design">
                <SidebarLink to="/designer" icon={Layout} label="Designer" isActive={p === '/designer'} />
              </Section>
            )}
            {isAdmin && (
              <Section label="Admin">
                <SidebarLink to="/admin" icon={ShieldAlert} label="Control Panel" isActive={p.startsWith('/admin')} />
                {profile?.role === 'super_admin' && (
                  <SidebarLink to="/super-admin" icon={Zap} label="Super Admin" isActive={p.startsWith('/super-admin')} />
                )}
              </Section>
            )}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] flex-shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #10b981, #4f46e5)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white uppercase tracking-wider truncate leading-none">{profile?.username || 'Player'}</p>
            <p className="text-[8px] text-mint/60 font-semibold mt-0.5">Niveau {profile?.level || 1}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
            title="Se déconnecter"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
