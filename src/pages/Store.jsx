import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN  = "#10b981";
const RED    = "#f43f5e";
const AMBER  = "#f59e0b";

const RARITY = {
  common:    { label: "COMMUN",   color: "#94a3b8", glow: "rgba(148,163,184,0.3)", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  rare:      { label: "RARE",     color: "#60a5fa", glow: "rgba(96,165,250,0.3)",  bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.22)"  },
  epic:      { label: "ÉPIQUE",   color: VIOLET,    glow: "rgba(139,92,246,0.35)", bg: "rgba(139,92,246,0.09)", border: "rgba(139,92,246,0.28)"  },
  legendary: { label: "LÉGEND.",  color: AMBER,     glow: "rgba(245,158,11,0.4)",  bg: "rgba(245,158,11,0.09)", border: "rgba(245,158,11,0.3)"   },
};

const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

const STORE_TABS = [
  { key: "all",        label: "TOUT",      icon: "🏪" },
  { key: "avatar",     label: "AVATARS",   icon: "🎭" },
  { key: "banner",     label: "BANNIERES", icon: "🖼️" },
  { key: "frame",      label: "CADRES",    icon: "💠" },
  { key: "badge",      label: "BADGES",    icon: "🏅" },
  { key: "name_color", label: "NOM",       icon: "✨" },
  { key: "emote",      label: "EMOTES",    icon: "😎" },
  { key: "inventory",  label: "INVENTAIRE",icon: "🎒" },
];

// ─── ITEM CARD ────────────────────────────────────────────────────────────────
function ItemCard({ item, owned, equipped, onBuy, onEquip, coins }) {
  const [hovered, setHovered]     = useState(false);
  const [buying, setBuying]       = useState(false);
  const [equipping, setEquipping] = useState(false);
  const rc = RARITY[item.rarity] || RARITY.common;
  const canAfford = coins >= item.price;
  const free = item.source !== "store";

  const handleBuy = async () => {
    if (buying || owned) return;
    setBuying(true);
    await onBuy(item);
    setBuying(false);
  };

  const handleEquip = async () => {
    if (equipping) return;
    setEquipping(true);
    await onEquip(item);
    setEquipping(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
        background: equipped
          ? `linear-gradient(145deg,${rc.bg},#050c1f)`
          : hovered ? `linear-gradient(145deg,rgba(255,255,255,0.04),#050c1f)` : "#050c1f",
        border: `1px solid ${equipped ? rc.color + "55" : hovered ? rc.color + "35" : "rgba(255,255,255,0.07)"}`,
        boxShadow: equipped ? `0 0 28px ${rc.glow},0 4px 20px rgba(0,0,0,0.5)` : hovered ? `0 6px 28px rgba(0,0,0,0.5)` : "0 2px 10px rgba(0,0,0,0.3)",
        transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
        transform: hovered ? "translateY(-3px)" : "none",
        cursor: "default",
      }}
    >
      {/* Rarity stripe */}
      <div style={{ height: 2, background: `linear-gradient(90deg,${rc.color},${rc.color}60,transparent)`, flexShrink: 0 }} />

      {/* Equipped badge */}
      {equipped && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, padding: "3px 9px", borderRadius: 99, background: rc.color, color: "#000", fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>
          ÉQUIPÉ
        </div>
      )}

      {/* Limited badge */}
      {item.limited && (
        <div style={{ position: "absolute", top: equipped ? 32 : 10, right: 10, zIndex: 2, padding: "3px 9px", borderRadius: 99, background: RED, color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>
          LIMITÉ
        </div>
      )}

      {/* Image area */}
      <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: `radial-gradient(circle at center,${rc.glow},transparent 68%)` }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
        ) : (
          <div style={{ fontSize: 60, filter: `drop-shadow(0 0 18px ${rc.color})` }}>
            {item.type === "avatar" ? "🎭" : item.type === "banner" ? "🖼️" : item.type === "badge" ? "🏅" : item.type === "name_color" ? "✨" : item.type === "frame" ? "💠" : "😎"}
          </div>
        )}
        {item.type === "name_color" && item.color_value && (
          <div style={{ position: "absolute", bottom: 10, fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 800, color: item.color_value, textShadow: `0 0 18px ${item.color_value}`, letterSpacing: 2 }}>
            VOTRE NOM
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: rc.color, padding: "2px 7px", borderRadius: 4, background: rc.bg, border: `1px solid ${rc.border}` }}>{rc.label}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>{item.type?.toUpperCase()}</span>
        </div>

        <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, marginBottom: 6 }}>{item.name}</h3>

        {item.description && (
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{item.description}</p>
        )}

        {/* Price + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 14 }}>💰</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 800, color: free ? GREEN : canAfford || owned ? AMBER : RED }}>
              {free ? "GRATUIT" : item.price.toLocaleString()}
            </span>
          </div>
          {owned ? (
            <motion.button
              whileHover={{ scale: equipped ? 1 : 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleEquip}
              disabled={equipping || equipped}
              style={{
                padding: "7px 14px", borderRadius: 8, border: "none",
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                cursor: equipped ? "default" : "pointer", transition: "all 0.2s",
                background: equipped ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg,${rc.color},${rc.color}cc)`,
                color: equipped ? "rgba(255,255,255,0.3)" : "#000",
                opacity: equipping ? 0.7 : 1,
              }}
            >
              {equipping ? "..." : equipped ? "✓ ÉQUIPÉ" : "ÉQUIPER"}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: canAfford ? 1.04 : 1 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleBuy}
              disabled={buying || !canAfford}
              style={{
                padding: "7px 14px", borderRadius: 8, border: "none",
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                cursor: !canAfford ? "not-allowed" : "pointer", transition: "all 0.2s",
                background: !canAfford ? `rgba(244,63,94,0.12)` : `linear-gradient(135deg,${VIOLET},${CYAN})`,
                color: !canAfford ? RED : "#fff",
                boxShadow: canAfford ? `0 4px 16px rgba(139,92,246,0.35)` : "none",
                opacity: buying ? 0.7 : 1,
              }}
            >
              {buying ? "..." : !canAfford ? "INSUFFISANT" : "ACHETER"}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── INVENTORY VIEW ───────────────────────────────────────────────────────────
function InventoryView({ userItems, items, onEquip, onUnequip }) {
  const [activeType, setActiveType] = useState("all");

  const typeFilters = [
    { key: "all",        label: "TOUT",   icon: "🎒" },
    { key: "avatar",     label: "AVATAR", icon: "🎭" },
    { key: "banner",     label: "BANN.",  icon: "🖼️" },
    { key: "frame",      label: "CADRE",  icon: "💠" },
    { key: "badge",      label: "BADGE",  icon: "🏅" },
    { key: "name_color", label: "NOM",    icon: "✨" },
    { key: "emote",      label: "EMOTE",  icon: "😎" },
  ];

  const ownedFull = userItems
    .map(ui => ({ ...ui, item: items.find(it => it.id === ui.item_id) }))
    .filter(ui => ui.item);

  const displayItems = activeType === "all" ? ownedFull : ownedFull.filter(ui => ui.item.type === activeType);

  const equippedByType = {};
  ownedFull.filter(ui => ui.equipped).forEach(ui => { equippedByType[ui.item.type] = ui.item; });

  if (ownedFull.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎒</div>
        </motion.div>
        <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.2)" }}>INVENTAIRE VIDE</p>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 8 }}>Achète des items dans la boutique !</p>
      </div>
    );
  }

  return (
    <div>
      {Object.keys(equippedByType).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: `rgba(139,92,246,0.06)`, border: `1px solid rgba(139,92,246,0.2)` }}
        >
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 2, color: VIOLET, marginBottom: 14 }}>⚡ ACTUELLEMENT ÉQUIPÉ</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(equippedByType).map(([type, item]) => {
              const rc = RARITY[item.rarity] || RARITY.common;
              return (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, background: `${rc.color}10`, border: `1px solid ${rc.color}30`, borderRadius: 10, padding: "8px 14px" }}>
                  {item.image_url
                    ? <img src={item.image_url} style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
                    : <span style={{ fontSize: 20 }}>{type === "avatar" ? "🎭" : type === "banner" ? "🖼️" : type === "frame" ? "💠" : type === "badge" ? "🏅" : type === "name_color" ? "✨" : "😎"}</span>
                  }
                  <div>
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, color: "#fff" }}>{item.name}</p>
                    <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: rc.color, letterSpacing: 1 }}>{rc.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Type filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {typeFilters.map(t => {
          const cnt = t.key === "all" ? ownedFull.length : ownedFull.filter(u => u.item.type === t.key).length;
          return (
            <button key={t.key} onClick={() => setActiveType(t.key)}
              style={{ padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${activeType === t.key ? VIOLET + "55" : "rgba(255,255,255,0.08)"}`, background: activeType === t.key ? `rgba(139,92,246,0.15)` : "transparent", color: activeType === t.key ? VIOLET : "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, transition: "all 0.2s" }}>
              {t.icon} {t.label} ({cnt})
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
        {displayItems.map(({ item, equipped, id }) => {
          const rc = RARITY[item.rarity] || RARITY.common;
          return (
            <motion.div key={id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ borderRadius: 14, background: equipped ? `${rc.color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${equipped ? rc.color + "45" : "rgba(255,255,255,0.07)"}`, padding: 16, position: "relative", overflow: "hidden", boxShadow: equipped ? `0 0 24px ${rc.glow}` : "none", transition: "all 0.25s" }}>
              {/* Top stripe */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${rc.color},${rc.color}50,transparent)` }} />
              {equipped && (
                <div style={{ position: "absolute", top: 10, right: 10, background: rc.color, color: "#000", fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 800, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 99 }}>ÉQUIPÉ</div>
              )}
              <div style={{ width: "100%", aspectRatio: "1", borderRadius: 10, marginBottom: 12, background: `${rc.color}10`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {item.image_url
                  ? <img src={item.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 44 }}>{item.type === "avatar" ? "🎭" : item.type === "banner" ? "🖼️" : item.type === "frame" ? "💠" : item.type === "badge" ? "🏅" : item.type === "name_color" ? "✨" : "😎"}</span>
                }
              </div>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, color: "#fff", fontSize: 11, marginBottom: 3 }}>{item.name}</p>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: rc.color, letterSpacing: 1.5, marginBottom: 12 }}>{rc.label}</p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => equipped ? onUnequip(item) : onEquip(item)}
                style={{ width: "100%", padding: "9px", borderRadius: 8, cursor: "pointer", border: "none", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, transition: "all 0.2s", background: equipped ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg,${rc.color},${rc.color}cc)`, color: equipped ? "rgba(255,255,255,0.4)" : "#000" }}>
                {equipped ? "✓ DÉSÉQUIPER" : "⚡ ÉQUIPER"}
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN STORE ───────────────────────────────────────────────────────────────
export default function Store() {
  const {
    profile,
    balance: globalBalance,
    userItems: globalUserItems,
    refreshCurrentUser,
    refreshEconomyData,
    refreshProfile,
  } = useOutletContext() || {};
  const [tab, setTab]               = useState("all");
  const [items, setItems]           = useState([]);
  const [userItems, setUserItems]   = useState([]);
  const [dailyItems, setDailyItems] = useState([]);
  const [coins, setCoins]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [sort, setSort]             = useState("rarity");
  const [notification, setNotification] = useState(null);
  const [confirmItem, setConfirmItem]   = useState(null);

  useEffect(() => {
    if (typeof globalBalance === "number") setCoins(globalBalance);
  }, [globalBalance]);

  useEffect(() => {
    if (globalUserItems) setUserItems(globalUserItems);
  }, [globalUserItems]);

  const fetchCoins = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", profile.id).maybeSingle();
    setCoins(data?.balance || 0);
  }, [profile?.id]);

  const fetchAll = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    const [{ data: storeData }, { data: owned }, { data: daily }] = await Promise.all([
      supabase.from("store_items").select("*").eq("active", true).eq("approved", true).order("sort_order", { ascending: true }),
      supabase.from("user_items").select("*, item:store_items(*)").eq("user_id", profile.id),
      supabase.from("daily_store").select("*, item:store_items(*)").eq("date", new Date().toISOString().split("T")[0]),
    ]);
    setItems(storeData || []);
    setUserItems(owned || []);
    setDailyItems(daily?.filter(d => d.item) || []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchAll();
    fetchCoins();
  }, [fetchAll, fetchCoins]);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBuy = async (item) => { setConfirmItem(item); };

  const confirmBuy = async () => {
    if (!confirmItem || purchaseLoading) return;
    const purchasedItem = confirmItem;
    setPurchaseLoading(true);
    const { data, error } = await supabase.rpc("purchase_item", { p_item_id: confirmItem.id });
    setConfirmItem(null);
    if (error || !data?.success) {
      setPurchaseLoading(false);
      notify(data?.error || error?.message || "Erreur", "error");
      return;
    }
    notify(`✅ ${purchasedItem.name} acheté !`);
    setCoins(prev => Math.max(0, prev - (purchasedItem.price || 0)));
    setUserItems(prev => prev.some(row => row.item_id === purchasedItem.id)
      ? prev
      : [...prev, { item_id: purchasedItem.id, user_id: profile?.id, equipped: false, item: purchasedItem }]);
    await Promise.all([fetchAll(), fetchCoins(), refreshEconomyData?.(), refreshCurrentUser?.()]);
    setPurchaseLoading(false);
  };

  const handleEquip = async (item) => {
    const { data, error } = await supabase.rpc("equip_item", { p_item_id: item.id });
    if (error || !data?.success) { notify(data?.error || "Erreur d'équipement", "error"); return; }
    notify(`⚡ ${item.name} équipé !`);
    setUserItems(prev => prev.map(row => {
      const rowType = row.item?.type || items.find(i => i.id === row.item_id)?.type;
      if (rowType !== item.type) return row;
      return { ...row, equipped: row.item_id === item.id };
    }));
    await Promise.all([fetchAll(), refreshCurrentUser?.(), refreshProfile?.()]);
  };

  const handleUnequip = async (item) => {
    if (!profile?.id) return;
    const { error } = await supabase.from("user_items")
      .update({ equipped: false })
      .eq("user_id", profile.id)
      .eq("item_id", item.id);
    if (error) { notify("Erreur de déséquipement", "error"); return; }
    if (item.type === "avatar") {
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    }
    notify(`${item.name} déséquipé`);
    await Promise.all([fetchAll(), refreshCurrentUser?.(), refreshProfile?.()]);
  };

  const isOwned    = (id) => userItems.some(u => u.item_id === id);
  const isEquipped = (id) => userItems.some(u => u.item_id === id && u.equipped);

  const filtered = items
    .filter(item => tab === "all" || item.type === tab)
    .sort((a, b) => {
      if (sort === "rarity")     return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      if (sort === "price_asc")  return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });

  const ownedCount = userItems.length;
  const totalItems = items.length;
  const confirmRc = confirmItem ? RARITY[confirmItem.rarity] || RARITY.common : null;

  if (!profile?.id && !loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", fontFamily: "'Space Grotesk',sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🔒</div>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>Connecte-toi pour accéder à la boutique.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes pulse-sk { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 99px }
        .store-tabs { display:flex; gap:2px; overflow-x:auto; padding-bottom:1px }
        .store-tabs::-webkit-scrollbar { display:none }
      `}</style>

      <div style={{ fontFamily: "'Space Grotesk',sans-serif", color: "rgba(255,255,255,0.88)" }}>

        {/* ── Toast ── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -40, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -40, x: "-50%" }}
              style={{ position: "fixed", top: 20, left: "50%", zIndex: 9999, padding: "12px 24px", borderRadius: 12, fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, backdropFilter: "blur(16px)", background: notification.type === "error" ? "rgba(15,2,2,0.96)" : "rgba(2,6,23,0.96)", border: `1px solid ${notification.type === "error" ? RED : GREEN}`, color: notification.type === "error" ? RED : "#fff", boxShadow: `0 8px 32px ${notification.type === "error" ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)"}` }}>
              {notification.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Confirm modal ── */}
        <AnimatePresence>
          {confirmItem && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
              onClick={() => setConfirmItem(null)}
            >
              <motion.div
                initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{ width: "100%", maxWidth: 400, background: "#050c1f", border: `1px solid ${confirmRc?.color || VIOLET}40`, borderRadius: 20, overflow: "hidden", boxShadow: `0 24px 64px ${confirmRc?.glow || "rgba(139,92,246,0.35)"},0 0 0 1px ${confirmRc?.color || VIOLET}14` }}
              >
                {/* Top line */}
                <div style={{ height: 2, background: `linear-gradient(90deg,${confirmRc?.color || VIOLET},${CYAN},transparent)` }} />
                <div style={{ padding: "32px 32px 28px" }}>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>🛒</div>
                    <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: 2, marginBottom: 8 }}>CONFIRMER L'ACHAT</h3>
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                      Vous achetez <strong style={{ color: "#fff" }}>{confirmItem.name}</strong>
                    </p>
                  </div>

                  <div style={{ padding: "13px 18px", borderRadius: 12, background: `rgba(245,158,11,0.07)`, border: "1px solid rgba(245,158,11,0.2)", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>PRIX</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 18, color: AMBER }}>💰 {confirmItem.price.toLocaleString()}</span>
                  </div>

                  <div style={{ padding: "11px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>SOLDE APRÈS</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: (coins - confirmItem.price) < 0 ? RED : GREEN }}>
                      💰 {(coins - confirmItem.price).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setConfirmItem(null)}
                      style={{ flex: 1, padding: "12px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "border-color 0.2s" }}
                      onMouseEnter={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                      onMouseLeave={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    >
                      ANNULER
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={confirmBuy}
                      disabled={purchaseLoading}
                      style={{ flex: 1, padding: "12px", borderRadius: 10, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, border: "none", color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", boxShadow: `0 4px 20px rgba(139,92,246,0.4)` }}
                    >
                      {purchaseLoading ? "..." : "ACHETER"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", overflow: "hidden", padding: "32px 0 28px", marginBottom: 0 }}
        >
          {/* Decorations */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%)` }} />
            <div style={{ position: "absolute", bottom: -60, left: 80, width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle,rgba(0,212,255,0.07),transparent 70%)` }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(139,92,246,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.025) 1px,transparent 1px)`, backgroundSize: "44px 44px" }} />
          </div>
          {/* 2px top line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${VIOLET},${CYAN},transparent)` }} />

          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 4, color: VIOLET, marginBottom: 10 }}>🏪 BOUTIQUE EXCLUSIVE</p>
              <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: 2, margin: 0, lineHeight: 1.1 }}>
                CIPHER<span style={{ background: `linear-gradient(135deg,${VIOLET},${CYAN})`, backgroundSize: "200% 200%", animation: "flow 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>STORE</span>
              </h1>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginTop: 10 }}>
                COSMÉTIQUES ONLY · NO PAY TO WIN
              </p>
            </div>

            {/* Wallet + collection */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ padding: "12px 20px", borderRadius: 12, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>MON SOLDE</p>
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 20, background: `linear-gradient(90deg,${AMBER},#fbbf24)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>
                  💰 {coins.toLocaleString()}
                </p>
              </div>
              <div style={{ padding: "12px 18px", borderRadius: 12, background: `rgba(139,92,246,0.07)`, border: `1px solid rgba(139,92,246,0.22)` }}>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>COLLECTION</p>
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 18, color: VIOLET, lineHeight: 1 }}>
                  {ownedCount} <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>/ {totalItems}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Daily items */}
          {dailyItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{ marginTop: 20, padding: "12px 18px", borderRadius: 12, background: "linear-gradient(135deg,rgba(244,63,94,0.07),rgba(249,115,22,0.07))", border: "1px solid rgba(244,63,94,0.2)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
            >
              <span style={{ fontSize: 16 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: RED, letterSpacing: 1.5 }}>OFFRES DU JOUR</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", color: "rgba(255,255,255,0.4)", fontSize: 12, marginLeft: 10 }}>{dailyItems.map(d => d.item?.name).join(" • ")}</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: AMBER, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(245,158,11,0.1)", whiteSpace: "nowrap" }}>SE RENOUVELLE DANS 24H</span>
            </motion.div>
          )}
        </motion.div>

        {/* ── TABS + SORT ── */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(2,6,23,0.96)", backdropFilter: "blur(20px)", borderBottom: `1px solid rgba(139,92,246,0.1)`, margin: "0 -1px", padding: "0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div className="store-tabs">
              {STORE_TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ padding: "14px 14px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.key ? VIOLET : "transparent"}`, color: tab === t.key ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, fontSize: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer", outline: "none", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, flexShrink: 0, marginRight: 4 }}
            >
              <option value="rarity">RARETÉ ↓</option>
              <option value="price_asc">PRIX ↑</option>
              <option value="price_desc">PRIX ↓</option>
            </select>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ paddingTop: 28 }}>
          {tab === "inventory" ? (
            <InventoryView
              userItems={userItems}
              items={items}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
            />
          ) : loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ height: 280, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", animation: `pulse-sk ${1.2 + i * 0.1}s ease infinite` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🛒</div>
              </motion.div>
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 3, color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
                {tab === "all" ? "BOUTIQUE VIDE" : "AUCUN ITEM ICI"}
              </p>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.18)", maxWidth: 320, margin: "0 auto" }}>
                {tab === "all"
                  ? "Les items de boutique seront disponibles prochainement. Revenez bientôt !"
                  : `Aucun item dans la catégorie "${STORE_TABS.find(t => t.key === tab)?.label}".`}
              </p>
            </div>
          ) : (
            ["legendary", "epic", "rare", "common"].map(r => {
              const section = filtered.filter(i => i.rarity === r);
              if (!section.length) return null;
              const rc = RARITY[r];
              return (
                <div key={r} style={{ marginBottom: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${rc.color}40,transparent)` }} />
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: rc.color, padding: "5px 16px", borderRadius: 99, background: rc.bg, border: `1px solid ${rc.border}` }}>◆ {rc.label}</span>
                    <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,transparent,${rc.color}40)` }} />
                  </div>
                  <motion.div layout style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
                    {section.map(item => (
                      <ItemCard key={item.id} item={item} owned={isOwned(item.id)} equipped={isEquipped(item.id)} onBuy={handleBuy} onEquip={handleEquip} coins={coins} />
                    ))}
                  </motion.div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
