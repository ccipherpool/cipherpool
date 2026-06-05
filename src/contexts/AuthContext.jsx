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

  const clearUserData = useCallback(() => {
    setProfile(null);
    setRole(null);
    setWallet(null);
    setBalance(0);
    setUserItems([]);
    setEquippedItems({});
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
      loading: loading || (!!user && !profile && profileLoading),
      authLoading: loading,
      profileLoading,
      refreshCurrentUser,
      refreshProfile: refreshCurrentUser,
      refreshEconomyData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
