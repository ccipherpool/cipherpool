import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Trophy, 
  MessageSquare, 
  Wallet, 
  User,
  ShoppingBag,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Command" },
  { path: "/tournaments", icon: Trophy, label: "Arena" },
  { path: "/chat", icon: MessageSquare, label: "Chat" },
  { path: "/store", icon: ShoppingBag, label: "Store" },
  { path: "/wallet", icon: Wallet, label: "Assets" },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-16 bg-obsidian-deep/80 backdrop-blur-2xl border-t border-white/5 px-4 pb-safe">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center gap-1 w-12 h-full transition-all duration-300
              ${isActive ? 'text-mint' : 'text-slate-500'}
            `}
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-mint/10 neon-glow-mint' : 'group-hover:bg-white/5'}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute -top-[1px] w-6 h-0.5 bg-mint shadow-neon-mint rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
