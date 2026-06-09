import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [userItems, setUserItems] = useState([]);
  const [equippedItems, setEquippedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState("active");

  const clearUserData = useCallback(() => {
    setProfile(null);
    setRole(null);
    setWallet(null);
    setBalance(0);
    setUserItems([]);
    setEquippedItems({});
    setAccountStatus("active");
  }, []);

  const refreshCurrentUser = useCallback(async (userIdArg) => {
    const userId = userIdArg || user?.id;
    if (!userId) {
      clearUserData();
      return null;
    }

    setProfileLoading(true);
    try {
      const [profileRes, walletRes, itemsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("user_items")
          .select("*, item:store_items(*)")
          .eq("user_id", userId),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (walletRes.error && walletRes.error.code !== "PGRST116") throw walletRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const walletData = walletRes.data || { user_id: userId, balance: 0 };
      const itemRows = itemsRes.data || [];
      const equipped = {};

      itemRows.forEach(row => {
        if (row.equipped && row.item?.type) equipped[row.item.type] = row.item;
      });

      const nextProfile = profileRes.data
        ? {
            ...profileRes.data,
            coins: walletData.balance || 0,
            balance: walletData.balance || 0,
            equipped_items: equipped,
          }
        : null;

      // Normalize legacy 'fondateur' → 'founder' at the app level
      const normalizedRole = nextProfile?.role === 'fondateur' ? 'founder' : (nextProfile?.role ?? null);

      setProfile(nextProfile);
      setRole(normalizedRole);
      setWallet(walletData);
      setBalance(walletData.balance || 0);
      setUserItems(itemRows);
      setEquippedItems(equipped);

      // Enforce account_status guard
      const status = nextProfile?.account_status || "active";
      setAccountStatus(status);

      if (status === "pending_reapproval") {
        // Safety check: admin may have approved the request but the profile wasn't
        // updated (stale new_user_id bug). Call the heal RPC which bypasses RLS
        // and updates profiles by email if an approved request exists.
        const { data: healResult } = await supabase.rpc("check_and_heal_reapproval");
        if (healResult?.healed) {
          console.log("[AuthContext] Auto-healed pending_reapproval → active");
          const healedProfile = { ...nextProfile, account_status: "active" };
          setProfile(healedProfile);
          setAccountStatus("active");
          return {
            profile: healedProfile,
            wallet: walletData,
            balance: walletData.balance || 0,
            userItems: itemRows,
            equippedItems: equipped,
          };
        }
      }

      // Force-logout accounts that were deleted while the user was logged in.
      // The admin edge function sets account_status='deleted' before hard-deleting
      // the auth user. The realtime subscription fires, calls refreshCurrentUser,
      // and we catch 'deleted' here to immediately sign out + redirect to /login.
      if (status === "deleted") {
        console.warn("[AuthContext] Account deleted by admin — forcing sign out");
        await supabase.auth.signOut();
        clearUserData();
        window.location.replace("/login");
        return null;
      }

      if (status === "banned" || status === "pending_reapproval") {
        const currentPath = window.location.pathname;
        console.warn(`[AuthContext] Blocking user — account_status="${status}", profile_id="${nextProfile?.id}", path="${currentPath}"`);
        if (!currentPath.startsWith("/account-restricted")) {
          // Sign out banned accounts immediately; keep session for pending_reapproval so they can see their info
          if (status === "banned") {
            await supabase.auth.signOut();
          }
          window.location.replace(`/account-restricted?status=${status}`);
          return null;
        }
      }

      return {
        profile: nextProfile,
        wallet: walletData,
        balance: walletData.balance || 0,
        userItems: itemRows,
        equippedItems: equipped,
      };
    } finally {
      setProfileLoading(false);
    }
  }, [clearUserData, user?.id]);

  const refreshEconomyData = useCallback(() => refreshCurrentUser(), [refreshCurrentUser]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      // Invalid/expired refresh token — clear it and treat as logged out
      if (error) {
        console.warn("Session restore failed, signing out:", error.message);
        await supabase.auth.signOut();
        setUser(null);
        clearUserData();
        setLoading(false);
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        try {
          await refreshCurrentUser(currentUser.id);
        } catch (err) {
          console.error("Failed to load current user data:", err);
        }
      } else {
        clearUserData();
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        clearUserData();
        setLoading(false);
        return;
      }

      setLoading(false);
      setTimeout(() => {
        if (mounted) refreshCurrentUser(currentUser.id).catch(err => {
          console.error("Failed to refresh current user data:", err);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearUserData, refreshCurrentUser]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const refresh = () => refreshCurrentUser(user.id).catch(err => {
      console.error("Failed to refresh realtime user data:", err);
    });
    const channel = supabase
      .channel(`current_user_data_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_items", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshCurrentUser, user?.id]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      wallet,
      balance,
      userItems,
      equippedItems,
      accountStatus,
      loading: loading || (!!user && !profile && profileLoading),
      authLoading: loading,
      profileLoading,
      refreshCurrentUser,
      refreshProfile: refreshCurrentUser,
      refreshEconomyData,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
