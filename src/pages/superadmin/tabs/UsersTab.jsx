import { motion } from "framer-motion";
import { 
  ShieldAlert, 
  Wallet, 
  Ban, 
  Trash2, 
  CheckCircle2, 
  MoreVertical, 
  Search,
  Filter,
  User,
  Crown,
  Zap,
  Layout,
  Activity
} from "lucide-react";
import { cn } from "../../../lib/utils";

const ROLE_STYLE = {
  super_admin: { badge: "bg-red-400 text-zinc-900 border-zinc-900 dark:border-white",  label: "SUPER", icon: Zap, rotation: "rotate-2" },
  admin:       { badge: "bg-orange-400 text-zinc-900 border-zinc-900 dark:border-white", label: "ADMIN", icon: ShieldAlert, rotation: "rotate-[-2deg]" },
  designer:    { badge: "bg-blue-400 text-zinc-900 border-zinc-900 dark:border-white", label: "DESIGN", icon: Layout, rotation: "rotate-1" },
  founder:     { badge: "bg-purple-400 text-zinc-900 border-zinc-900 dark:border-white", label: "FOUNDER", icon: Crown, rotation: "rotate-[-1deg]" },
  fondateur:   { badge: "bg-purple-400 text-zinc-900 border-zinc-900 dark:border-white", label: "FOUNDER", icon: Crown, rotation: "rotate-[-1deg]" },
  banned:      { badge: "bg-zinc-800 text-zinc-400 border-zinc-900 dark:border-white", label: "BANNED", icon: Ban, rotation: "rotate-3" },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-900 dark:border-white", label: "USER", icon: User, rotation: "rotate-0" };
  return (
    <span className={cn(
      "inline-flex items-center gap-2 px-4 py-1 font-handwritten text-xl font-bold rounded-full border-2 shadow-[2px_2px_0px_0px] shadow-zinc-900 dark:shadow-white transition-transform hover:scale-110",
      s.badge, s.rotation
    )}>
      <s.icon size={16} /> {s.label}
    </span>
  );
}

function ActionButtons({ user, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}
        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white rounded-full text-zinc-500 hover:text-orange-500 hover:bg-orange-50 transition-all shadow-[2px_2px_0px_0px] shadow-zinc-900"
        title="Override Role"
      ><Crown size={18} /></button>
      
      <button
        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}
        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white rounded-full text-zinc-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all shadow-[2px_2px_0px_0px] shadow-zinc-900"
        title="Sync Assets"
      ><Wallet size={18} /></button>

      {user.role !== "banned" ? (
        <button
          onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-all shadow-[2px_2px_0px_0px] shadow-zinc-900"
          title="Terminate Access"
        ><Ban size={18} /></button>
      ) : (
        <button
          onClick={() => unbanUser(user.id)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white rounded-full text-zinc-500 hover:text-green-500 hover:bg-green-50 transition-all shadow-[2px_2px_0px_0px] shadow-zinc-900"
          title="Restore Access"
        ><CheckCircle2 size={18} /></button>
      )}

      {user.role !== "super_admin" && (
        <button
          onClick={() => deleteUser(user.id)}
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white rounded-full text-zinc-500 hover:text-red-600 hover:bg-red-100 transition-all shadow-[2px_2px_0px_0px] shadow-zinc-900"
          title="Purge Data"
        ><Trash2 size={18} /></button>
      )}
    </div>
  );
}

export default function UsersTab({
  filteredUsers, search, setSearch, filter, setFilter,
  setSelectedUser, setShowRoleModal, setShowBanModal,
  setShowWalletModal, unbanUser, deleteUser,
}) {
  const actionProps = { setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser };
  const displayed = filteredUsers.slice(0, 20);

  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 card-creative p-8 bg-white dark:bg-zinc-900 rotate-[-0.5deg]">
         <div className="relative flex-1 max-w-xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input
              type="text"
              placeholder="Scan unit registry (ID, Email, Handle)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-900 dark:border-white rounded-2xl text-zinc-900 dark:text-white font-handwritten text-2xl focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
            />
         </div>
         <div className="flex items-center gap-4 rotate-[1deg]">
            <Filter size={24} className="text-zinc-400" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-white rounded-2xl px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white outline-none shadow-[4px_4px_0px_0px] shadow-zinc-900"
            >
              <option value="all">Total Enlistment</option>
              <option value="admins">Command Staff</option>
              <option value="founders">Founders Only</option>
              <option value="banned">Blacklisted</option>
              <option value="pending">Awaiting Sync</option>
            </select>
         </div>
      </div>

      {/* Grid / Table Container */}
      <div className="card-creative overflow-hidden bg-white dark:bg-zinc-900 p-0 rotate-[0.5deg]">
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800 border-b-2 border-zinc-900 dark:border-white">
                <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white">Identified Unit 👤</th>
                <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white">Protocol 🛡️</th>
                <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white">Logistics 💰</th>
                <th className="px-8 py-5 font-handwritten text-2xl text-zinc-900 dark:text-white text-right">Actions ⚙️</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-zinc-900 dark:divide-white">
              {displayed.map(user => (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 rounded-full border-2 border-zinc-900 dark:border-white flex items-center justify-center bg-blue-100 text-blue-600 font-handwritten text-3xl shadow-[2px_2px_0px_0px] shadow-zinc-900 transition-all group-hover:scale-110">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                       </div>
                       <div>
                          <p className="font-handwritten text-3xl font-bold text-zinc-900 dark:text-white truncate max-w-[250px]">{user.username || user.full_name || "Unknown"}</p>
                          <p className="font-handwritten text-lg text-zinc-500 truncate max-w-[250px]">{user.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                          <Wallet size={18} className="text-amber-500" />
                          <span className="font-handwritten text-2xl font-bold text-zinc-900 dark:text-white">{(user.coins || 0).toLocaleString()} <span className="text-amber-500">CP</span></span>
                       </div>
                       <div className="flex items-center gap-2 opacity-60">
                          <Activity size={16} />
                          <span className="font-handwritten text-lg text-zinc-500">LVL {user.level || 1} 🆙</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end">
                      <ActionButtons user={user} {...actionProps} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y-2 divide-zinc-900 dark:divide-white">
           {displayed.map(user => (
              <div key={user.id} className="p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-full border-2 border-zinc-900 dark:border-white bg-blue-100 text-blue-600 flex items-center justify-center font-handwritten text-2xl shadow-[2px_2px_0px_0px] shadow-zinc-900">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                       </div>
                       <div>
                          <p className="font-handwritten text-2xl font-bold text-zinc-900 dark:text-white">{user.username || "Unknown"}</p>
                          <p className="font-handwritten text-lg text-zinc-500">{user.email}</p>
                       </div>
                    </div>
                    <RoleBadge role={user.role} />
                 </div>
                 <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 p-6 rounded-2xl border-2 border-zinc-900 dark:border-white shadow-[4px_4px_0px_0px] shadow-zinc-900">
                    <div>
                       <p className="font-handwritten text-lg text-zinc-500 uppercase">Assets</p>
                       <p className="font-handwritten text-2xl font-bold text-amber-500">{(user.coins || 0).toLocaleString()} CP</p>
                    </div>
                    <ActionButtons user={user} {...actionProps} />
                 </div>
              </div>
           ))}
        </div>

        {displayed.length === 0 && (
          <div className="py-24 text-center">
             <User size={80} className="mx-auto mb-6 text-zinc-200 dark:text-zinc-700" />
             <p className="font-handwritten text-4xl text-zinc-300 dark:text-zinc-700">Registry Empty 🌌</p>
          </div>
        )}
      </div>

      {filteredUsers.length > 20 && (
        <div className="text-center pt-8">
           <p className="font-handwritten text-2xl text-zinc-400 italic">Showing top 20 active units 📡</p>
        </div>
      )}
    </motion.div>
  );
}

