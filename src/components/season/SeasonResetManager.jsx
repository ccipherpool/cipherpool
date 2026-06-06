import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import {
  Search, X, ChevronRight, AlertTriangle, CheckCircle, Shield,
  Eye, EyeOff, Zap, Loader2, BarChart3, Users, Trophy,
  MessageSquare, Palette, Settings, Star, TrendingUp, Target,
} from "lucide-react";

// ── Category definitions ───────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "user",
    label: "User Progression",
    icon: <Users size={14} />,
    color: "#6366f1",
    options: [
      { key: "reset_xp",            label: "Reset XP",                    danger: true,  impact: "All player XP set to 0" },
      { key: "reset_levels",        label: "Reset Levels",                danger: true,  impact: "All players return to Level 1" },
      { key: "reset_rank_points",   label: "Reset Rank Points",           danger: true,  impact: "Ranked rating reset for all players" },
      { key: "reset_wins",          label: "Reset Wins",                  danger: true,  impact: "Win count zeroed across all accounts" },
      { key: "reset_losses",        label: "Reset Losses",                danger: false, impact: "Loss count zeroed across all accounts" },
      { key: "reset_kd",            label: "Reset K/D Ratio",             danger: true,  impact: "Kill/death stats cleared" },
      { key: "reset_match_history", label: "Reset Match History",         danger: true,  impact: "Past match records archived and cleared" },
      { key: "reset_seasonal_stats",label: "Reset Seasonal Statistics",   danger: true,  impact: "All seasonal performance data cleared" },
      { key: "reset_achievements",  label: "Reset Achievements",          danger: true,  impact: "Achievement progress zeroed" },
      { key: "reset_rewards",       label: "Reset Rewards Progress",      danger: false, impact: "Reward track progress set to 0" },
      { key: "reset_hof",           label: "Reset Hall of Fame Eligibility", danger: false, impact: "HoF nomination eligibility reset" },
      { key: "reset_streaks",       label: "Reset Streaks",               danger: false, impact: "Win/play streaks reset to 0" },
    ],
  },
  {
    id: "economy",
    label: "Economy",
    icon: <Star size={14} />,
    color: "#f59e0b",
    options: [
      { key: "reset_coins",             label: "Reset CP Coins",            danger: true,  impact: "All wallet balances set to 0" },
      { key: "reset_wallet_balances",   label: "Reset Wallet Balances",     danger: true,  impact: "All in-platform currency cleared" },
      { key: "reset_shop_purchases",    label: "Reset Shop Purchases",      danger: true,  impact: "Purchase history cleared" },
      { key: "reset_inventory",         label: "Reset Inventory",           danger: true,  impact: "Player inventory items removed" },
      { key: "reset_seasonal_currency", label: "Reset Seasonal Currency",   danger: true,  impact: "Season-specific currency cleared" },
      { key: "reset_marketplace",       label: "Reset Marketplace Listings",danger: false, impact: "All active listings removed" },
    ],
  },
  {
    id: "tournaments",
    label: "Tournaments",
    icon: <Trophy size={14} />,
    color: "#10b981",
    options: [
      { key: "archive_active_tournaments",   label: "Archive Active Tournaments",   danger: true,  impact: "Running tournaments moved to archive" },
      { key: "delete_draft_tournaments",     label: "Delete Draft Tournaments",     danger: true,  impact: "Draft tournaments permanently deleted" },
      { key: "reset_tournament_history",     label: "Reset Tournament History",     danger: true,  impact: "Tournament participation records cleared" },
      { key: "reset_tournament_placements",  label: "Reset Tournament Placements",  danger: true,  impact: "Placement rankings zeroed" },
      { key: "reset_tournament_rewards",     label: "Reset Tournament Rewards",     danger: false, impact: "Reward claims history cleared" },
      { key: "reset_tournament_stats",       label: "Reset Tournament Statistics",  danger: false, impact: "Tournament performance stats cleared" },
      { key: "reset_room_assignments",       label: "Reset Room Assignments",       danger: false, impact: "Room member seats cleared" },
      { key: "reset_ready_status",           label: "Reset Ready Status",           danger: false, impact: "All ready flags set to false" },
    ],
  },
  {
    id: "clans",
    label: "Clans",
    icon: <Shield size={14} />,
    color: "#8b5cf6",
    options: [
      { key: "reset_clan_points",          label: "Reset Clan Points",          danger: true,  impact: "All clan point totals set to 0" },
      { key: "reset_clan_rankings",        label: "Reset Clan Rankings",        danger: true,  impact: "Clan leaderboard positions cleared" },
      { key: "reset_clan_wins",            label: "Reset Clan Wins",            danger: true,  impact: "Clan win records set to 0" },
      { key: "reset_clan_stats",           label: "Reset Clan Statistics",      danger: true,  impact: "All clan performance data cleared" },
      { key: "reset_clan_seasonal_rewards",label: "Reset Clan Seasonal Rewards",danger: false, impact: "Seasonal clan reward claims cleared" },
      { key: "reset_clan_leaderboards",    label: "Reset Clan Leaderboards",    danger: false, impact: "Clan leaderboard scores zeroed" },
      { key: "reset_clan_war_records",     label: "Reset Clan War Records",     danger: true,  impact: "Clan war history archived and cleared" },
    ],
  },
  {
    id: "teams",
    label: "Teams",
    icon: <Target size={14} />,
    color: "#06b6d4",
    options: [
      { key: "reset_team_rankings",       label: "Reset Team Rankings",       danger: true,  impact: "Team ranking positions zeroed" },
      { key: "reset_team_stats",          label: "Reset Team Statistics",     danger: true,  impact: "Team performance data cleared" },
      { key: "reset_team_seasonal",       label: "Reset Team Seasonal Records",danger: true, impact: "Seasonal team records archived" },
      { key: "reset_team_leaderboards",   label: "Reset Team Leaderboards",   danger: false, impact: "Team leaderboard scores cleared" },
    ],
  },
  {
    id: "leaderboards",
    label: "Leaderboards",
    icon: <TrendingUp size={14} />,
    color: "#f43f5e",
    options: [
      { key: "reset_global_leaderboard",     label: "Reset Global Leaderboard",     danger: true,  impact: "Global rankings cleared" },
      { key: "reset_xp_leaderboard",         label: "Reset XP Leaderboard",         danger: true,  impact: "XP rankings cleared" },
      { key: "reset_cp_leaderboard",         label: "Reset CP Leaderboard",         danger: true,  impact: "CP rankings cleared" },
      { key: "reset_clan_leaderboard_board", label: "Reset Clan Leaderboard",       danger: false, impact: "Clan standings reset" },
      { key: "reset_team_leaderboard_board", label: "Reset Team Leaderboard",       danger: false, impact: "Team standings reset" },
      { key: "reset_tournament_leaderboard", label: "Reset Tournament Leaderboard", danger: false, impact: "Tournament leaderboard reset" },
    ],
  },
  {
    id: "social",
    label: "Social",
    icon: <MessageSquare size={14} />,
    color: "#3b82f6",
    options: [
      { key: "clear_global_chat",       label: "Clear Global Chat",        danger: true,  impact: "All global chat messages deleted" },
      { key: "clear_tournament_chats",  label: "Clear Tournament Chats",   danger: false, impact: "All room chat messages deleted" },
      { key: "clear_clan_chats",        label: "Clear Clan Chats",         danger: false, impact: "All clan chat messages deleted" },
      { key: "clear_team_chats",        label: "Clear Team Chats",         danger: false, impact: "All team chat messages deleted" },
      { key: "clear_notifications",     label: "Clear Notifications",      danger: false, impact: "All user notifications cleared" },
      { key: "clear_activity_logs",     label: "Clear Friend Activity Logs",danger: false, impact: "Friend activity feed cleared" },
    ],
  },
  {
    id: "cosmetics",
    label: "Cosmetics",
    icon: <Palette size={14} />,
    color: "#ec4899",
    options: [
      { key: "unequip_avatars",         label: "Unequip Avatars",         danger: false, impact: "Equipped avatars removed from profiles" },
      { key: "unequip_banners",         label: "Unequip Banners",         danger: false, impact: "Profile banners unequipped" },
      { key: "unequip_frames",          label: "Unequip Frames",          danger: false, impact: "Avatar frames removed" },
      { key: "reset_seasonal_cosmetics",label: "Reset Seasonal Cosmetics",danger: true,  impact: "Season-specific cosmetics cleared" },
      { key: "remove_seasonal_badges",  label: "Remove Seasonal Badges",  danger: false, impact: "Seasonal badge display cleared" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: <Settings size={14} />,
    color: "#64748b",
    options: [
      { key: "archive_audit_logs",         label: "Archive Audit Logs",        danger: false, impact: "Audit logs compressed to archive" },
      { key: "archive_support_tickets",    label: "Archive Support Tickets",   danger: false, impact: "Resolved tickets moved to archive" },
      { key: "archive_reports",            label: "Archive Reports",           danger: false, impact: "User reports archived" },
      { key: "archive_moderation_actions", label: "Archive Moderation Actions",danger: false, impact: "Mod action logs archived" },
    ],
  },
];

const ALL_OPTIONS = CATEGORIES.flatMap(c => c.options.map(o => ({ ...o, categoryId: c.id, categoryLabel: c.label, categoryColor: c.color })));

// ── Default config (safe defaults) ─────────────────────────────────────
const DEFAULT_CONFIG = () => {
  const cfg = {};
  ALL_OPTIONS.forEach(o => { cfg[o.key] = false; });
  // Safe defaults: only chat + ready status
  cfg.clear_global_chat = true;
  cfg.reset_ready_status = true;
  cfg.reset_clan_points = true;
  cfg.reset_wins = true;
  cfg.reset_xp = true;
  return cfg;
};

// ── Main component ─────────────────────────────────────────────────────
export default function SeasonResetManager({ onClose, onSuccess }) {
  const [activeCategory, setActiveCategory] = useState("user");
  const [config, setConfig]                 = useState(DEFAULT_CONFIG());
  const [search, setSearch]                 = useState("");
  const [seasonConfig, setSeasonConfig]     = useState({
    name: "", description: "", theme: "", start_date: "", end_date: "",
  });
  const [phase, setPhase] = useState("configure"); // configure | confirm | launching | success
  const [confirm, setConfirm] = useState({ season_name: "", code: "", password: "" });
  const [showPassword, setShowPassword]   = useState(false);
  const [preview, setPreview]             = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [result, setResult]               = useState(null);

  // ── Preview data ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoadingPreview(true);
      const [profilesRes, clansRes, teamsRes, tournamentsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clans").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }).then(r => r).catch(() => ({ count: 0 })),
        supabase.from("tournaments").select("id", { count: "exact", head: true }).in("status", ["registration_open", "live", "ready"]),
      ]);
      if (!cancelled) {
        setPreview({
          users:       profilesRes.count    ?? 0,
          clans:       clansRes.count       ?? 0,
          teams:       teamsRes.count       ?? 0,
          tournaments: tournamentsRes.count ?? 0,
        });
        setLoadingPreview(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, []);

  // ── Derived counts ──────────────────────────────────────────────
  const totalSelected = useMemo(() => Object.values(config).filter(Boolean).length, [config]);
  const dangerCount   = useMemo(() => ALL_OPTIONS.filter(o => o.danger && config[o.key]).length, [config]);

  const categoryCounts = useMemo(() => {
    const m = {};
    CATEGORIES.forEach(c => { m[c.id] = c.options.filter(o => config[o.key]).length; });
    return m;
  }, [config]);

  // ── Filtered options (search) ────────────────────────────────────
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return ALL_OPTIONS.filter(o =>
      o.label.toLowerCase().includes(q) || o.impact.toLowerCase().includes(q) || o.categoryLabel.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleAll = useCallback((categoryId, value) => {
    setConfig(prev => {
      const next = { ...prev };
      CATEGORIES.find(c => c.id === categoryId)?.options.forEach(o => { next[o.key] = value; });
      return next;
    });
  }, []);

  const wipeEverything = useCallback(() => {
    setConfig(prev => {
      const next = { ...prev };
      ALL_OPTIONS.forEach(o => { next[o.key] = true; });
      next.wipe_everything = true;
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG());
  }, []);

  const canLaunch = seasonConfig.name.trim().length >= 2;

  // ── Launch sequence ─────────────────────────────────────────────
  const launch = async () => {
    if (confirm.season_name !== seasonConfig.name.trim()) return;
    if (confirm.code !== "CONFIRM") return;
    setPhase("launching");

    try {
      const { data, error } = await supabase.rpc("start_new_season_v2", {
        p_name:        seasonConfig.name.trim(),
        p_description: seasonConfig.description.trim() || null,
        p_config:      config,
      });
      if (error) throw error;
      if (data?.success === false) {
        setPhase("confirm");
        setResult({ ok: false, error: data.error || "Unknown error", log: data.log });
        return;
      }

      setResult(data);
      setPhase("success");
      setTimeout(() => onSuccess?.(data), 300);
    } catch (err) {
      setPhase("confirm");
      setResult({ ok: false, error: err.message });
    }
  };

  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  // ── Styles ──────────────────────────────────────────────────────
  const C = {
    bg:      "#06080f",
    surface: "#0a0e1a",
    card:    "#0d1320",
    border:  "rgba(255,255,255,0.07)",
    accent:  "#6366f1",
    text:    "#f1f5f9",
    text2:   "rgba(255,255,255,0.5)",
    text3:   "rgba(255,255,255,0.2)",
    danger:  "#ef4444",
    success: "#10b981",
    amber:   "#f59e0b",
  };

  const inp = {
    background: "#0d1320", border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: 8, color: C.text, fontSize: 12, padding: "9px 12px",
    outline: "none", width: "100%",
    fontFamily: "Inter, sans-serif",
  };

  const optionRow = (opt, catColor) => {
    const checked = config[opt.key];
    return (
      <motion.label
        key={opt.key}
        whileHover={{ x: 2 }}
        style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "9px 14px", cursor: "pointer",
          borderRadius: 8, marginBottom: 2,
          background: checked ? catColor + "0c" : "transparent",
          border: checked ? `1px solid ${catColor}22` : "1px solid transparent",
          transition: "all 0.15s",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setConfig(prev => ({ ...prev, [opt.key]: e.target.checked }))}
          style={{ marginTop: 2, accentColor: catColor, cursor: "pointer" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: checked ? C.text : C.text2 }}>
              {opt.label}
            </span>
            {opt.danger && checked && (
              <span style={{
                fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 4,
                background: C.danger + "20", color: C.danger, letterSpacing: 0.5,
              }}>DANGER</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{opt.impact}</div>
        </div>
      </motion.label>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          width: "100%", maxWidth: 1100, height: "90vh",
          background: C.bg, borderRadius: 20,
          border: `1px solid rgba(99,102,241,0.25)`,
          boxShadow: "0 0 80px rgba(99,102,241,0.08), 0 40px 80px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(99,102,241,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: 0.3 }}>
                SEASON RESET MANAGER
              </div>
              <div style={{ fontSize: 10, color: C.text3, letterSpacing: 0.5 }}>
                Platform-wide seasonal configuration
              </div>
            </div>
            {dangerCount > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 6,
                background: C.danger + "15", color: C.danger,
                fontSize: 10, fontWeight: 700,
              }}>
                <AlertTriangle size={10} /> {dangerCount} DANGER
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {totalSelected > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: C.accent,
                background: C.accent + "15", padding: "3px 10px", borderRadius: 20,
              }}>
                {totalSelected} selected
              </span>
            )}
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.05)", color: C.text2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left: Category sidebar */}
          <div style={{
            width: 200, flexShrink: 0, overflowY: "auto",
            borderRight: `1px solid ${C.border}`,
            padding: "12px 8px",
          }}>
            {/* Nuclear presets */}
            <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                onClick={wipeEverything}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontWeight: 800, fontSize: 10, letterSpacing: 0.5,
                  background: config.wipe_everything
                    ? "linear-gradient(135deg, #ef4444, #7c3aed)"
                    : "rgba(239,68,68,0.12)",
                  color: config.wipe_everything ? "#fff" : "#ef4444",
                  display: "flex", alignItems: "center", gap: 5,
                  boxShadow: config.wipe_everything ? "0 0 16px rgba(239,68,68,0.35)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <AlertTriangle size={11} />
                WIPE EVERYTHING
              </button>
              <button
                onClick={resetToDefaults}
                style={{
                  width: "100%", padding: "6px 10px", borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer", fontWeight: 600, fontSize: 9,
                  background: "transparent", color: C.text3,
                }}
              >
                Reset to Defaults
              </button>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 8 }} />
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  marginBottom: 2,
                  background: activeCategory === cat.id ? cat.color + "18" : "transparent",
                  color: activeCategory === cat.id ? cat.color : C.text2,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: activeCategory === cat.id ? cat.color : C.text3 }}>{cat.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: activeCategory === cat.id ? 700 : 500 }}>{cat.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {categoryCounts[cat.id] > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 8,
                      background: cat.color + "25", color: cat.color,
                    }}>{categoryCounts[cat.id]}</span>
                  )}
                  {activeCategory === cat.id && <ChevronRight size={10} />}
                </div>
              </button>
            ))}

            {/* Stats */}
            <div style={{ marginTop: 16, padding: "10px", borderRadius: 8, background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 6, letterSpacing: 0.5 }}>SELECTION SUMMARY</div>
              {CATEGORIES.map(c => categoryCounts[c.id] > 0 && (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: C.text3 }}>{c.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.color }}>{categoryCounts[c.id]}</span>
                </div>
              ))}
              {totalSelected === 0 && <div style={{ fontSize: 9, color: C.text3, fontStyle: "italic" }}>Nothing selected</div>}
            </div>
          </div>

          {/* Center: Options */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Search bar */}
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search options…"
                  style={{ ...inp, paddingLeft: 30 }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
              {filteredOptions ? (
                // Search results
                <>
                  <div style={{ fontSize: 10, color: C.text3, marginBottom: 8, padding: "0 4px" }}>
                    {filteredOptions.length} result{filteredOptions.length !== 1 ? "s" : ""}
                  </div>
                  {filteredOptions.length === 0 && (
                    <div style={{ textAlign: "center", color: C.text3, fontSize: 12, padding: 24 }}>No matches</div>
                  )}
                  {filteredOptions.map(opt => (
                    <div key={opt.key}>
                      <div style={{ fontSize: 9, color: C.text3, padding: "4px 4px 2px", letterSpacing: 0.5 }}>
                        {opt.categoryLabel.toUpperCase()}
                      </div>
                      {optionRow(opt, opt.categoryColor)}
                    </div>
                  ))}
                </>
              ) : activeCat ? (
                // Category options
                <>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "4px 4px 10px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: activeCat.color }}>{activeCat.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{activeCat.label}</span>
                      <span style={{ fontSize: 9, color: C.text3 }}>({activeCat.options.length} options)</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleAll(activeCat.id, true)}
                        style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, border: "none", background: activeCat.color + "20", color: activeCat.color, cursor: "pointer", fontWeight: 700 }}>
                        ALL
                      </button>
                      <button onClick={() => toggleAll(activeCat.id, false)}
                        style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer" }}>
                        NONE
                      </button>
                    </div>
                  </div>
                  {activeCat.options.map(opt => optionRow(opt, activeCat.color))}
                </>
              ) : null}
            </div>
          </div>

          {/* Right: Config + Preview + Launch */}
          <div style={{
            width: 260, flexShrink: 0,
            borderLeft: `1px solid ${C.border}`,
            overflowY: "auto", padding: "14px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>

            {/* Season config */}
            <div style={{ background: C.card, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, letterSpacing: 0.8, marginBottom: 10 }}>SEASON CONFIGURATION</div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: C.text2, display: "block", marginBottom: 4 }}>Season Name *</label>
                <input
                  type="text"
                  value={seasonConfig.name}
                  onChange={e => setSeasonConfig(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Season 3 — Cyber Wars"
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: C.text2, display: "block", marginBottom: 4 }}>Description</label>
                <textarea
                  value={seasonConfig.description}
                  onChange={e => setSeasonConfig(p => ({ ...p, description: e.target.value }))}
                  placeholder="Theme, goals, new features…"
                  rows={2}
                  style={{ ...inp, resize: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.text2, display: "block", marginBottom: 4 }}>Start Date</label>
                  <input type="date" value={seasonConfig.start_date}
                    onChange={e => setSeasonConfig(p => ({ ...p, start_date: e.target.value }))}
                    style={{ ...inp, fontSize: 10 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.text2, display: "block", marginBottom: 4 }}>End Date</label>
                  <input type="date" value={seasonConfig.end_date}
                    onChange={e => setSeasonConfig(p => ({ ...p, end_date: e.target.value }))}
                    style={{ ...inp, fontSize: 10 }} />
                </div>
              </div>
            </div>

            {/* Preview panel */}
            <div style={{ background: C.card, borderRadius: 10, padding: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, letterSpacing: 0.8, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                <BarChart3 size={11} /> IMPACT PREVIEW
              </div>
              {loadingPreview ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 10 }}>
                  <Loader2 size={16} color={C.text3} style={{ animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : preview ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Affected Users",       value: preview.users.toLocaleString(),       color: "#6366f1", icon: "👤" },
                    { label: "Affected Clans",       value: preview.clans.toLocaleString(),       color: "#8b5cf6", icon: "🛡️" },
                    { label: "Affected Teams",       value: preview.teams.toLocaleString(),       color: "#06b6d4", icon: "👥" },
                    { label: "Active Tournaments",   value: preview.tournaments.toLocaleString(), color: "#f59e0b", icon: "🏆" },
                    { label: "Reset Options",        value: totalSelected,                        color: "#ef4444", icon: "⚙️" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.text2 }}>{row.icon} {row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Launch button */}
            <div style={{ marginTop: "auto" }}>
              {result?.ok === false && (
                <div style={{
                  padding: "8px 10px", borderRadius: 7, marginBottom: 8,
                  background: C.danger + "15", border: `1px solid ${C.danger}30`,
                  fontSize: 10, color: C.danger, lineHeight: 1.4,
                }}>
                  {result.error}
                </div>
              )}
              <motion.button
                whileHover={canLaunch ? { scale: 1.02 } : {}}
                whileTap={canLaunch ? { scale: 0.97 } : {}}
                onClick={() => canLaunch && setPhase("confirm")}
                disabled={!canLaunch}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  cursor: canLaunch ? "pointer" : "not-allowed",
                  background: canLaunch
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "rgba(255,255,255,0.05)",
                  color: canLaunch ? "#fff" : C.text3,
                  fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
                  boxShadow: canLaunch ? "0 0 20px rgba(99,102,241,0.3)" : "none",
                }}
              >
                {canLaunch ? "🚀 LAUNCH SEASON" : "Enter season name first"}
              </motion.button>
              {dangerCount > 0 && canLaunch && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, justifyContent: "center" }}>
                  <AlertTriangle size={10} color={C.danger} />
                  <span style={{ fontSize: 9, color: C.danger }}>{dangerCount} destructive operations selected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Confirmation Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "confirm" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
              zIndex: 100,
            }}
            onClick={() => setPhase("configure")}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 440,
                background: "#090d16", borderRadius: 18,
                border: "1px solid rgba(239,68,68,0.3)",
                padding: 28,
                boxShadow: "0 0 60px rgba(239,68,68,0.1)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: 0.3 }}>CONFIRM SEASON LAUNCH</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                  This action will affect <strong style={{ color: "#ef4444" }}>{preview?.users?.toLocaleString()}</strong> users and reset{" "}
                  <strong style={{ color: "#ef4444" }}>{totalSelected}</strong> system{totalSelected !== 1 ? "s" : ""}.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 5 }}>
                    Type season name to confirm: <strong style={{ color: "#f59e0b" }}>{seasonConfig.name}</strong>
                  </label>
                  <input
                    type="text"
                    value={confirm.season_name}
                    onChange={e => setConfirm(p => ({ ...p, season_name: e.target.value }))}
                    placeholder={seasonConfig.name}
                    style={{
                      ...inp,
                      border: confirm.season_name === seasonConfig.name
                        ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 5 }}>
                    Type <strong style={{ color: "#ef4444" }}>CONFIRM</strong> to proceed
                  </label>
                  <input
                    type="text"
                    value={confirm.code}
                    onChange={e => setConfirm(p => ({ ...p, code: e.target.value }))}
                    placeholder="CONFIRM"
                    style={{
                      ...inp,
                      border: confirm.code === "CONFIRM"
                        ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </div>
              </div>

              {result?.ok === false && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    padding: "8px 10px", borderRadius: 7,
                    background: "#ef444415", border: "1px solid #ef444430",
                    fontSize: 10, color: "#ef4444",
                  }}>
                    {result.error}
                  </div>
                  {Array.isArray(result.log) && result.log.length > 0 && (
                    <div style={{
                      marginTop: 6, padding: "6px 10px", borderRadius: 7,
                      background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)",
                      maxHeight: 100, overflowY: "auto",
                    }}>
                      {result.log.map((line, i) => (
                        <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, fontFamily: "monospace" }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => { setPhase("configure"); setResult(null); }}
                  style={{ flex: 1, padding: "11px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
                <motion.button
                  whileHover={confirm.season_name === seasonConfig.name.trim() && confirm.code === "CONFIRM" ? { scale: 1.02 } : {}}
                  onClick={launch}
                  disabled={confirm.season_name !== seasonConfig.name.trim() || confirm.code !== "CONFIRM"}
                  style={{
                    flex: 2, padding: "11px", borderRadius: 9, border: "none",
                    background: confirm.season_name === seasonConfig.name.trim() && confirm.code === "CONFIRM"
                      ? "linear-gradient(135deg, #ef4444, #7c3aed)"
                      : "rgba(255,255,255,0.04)",
                    color: confirm.season_name === seasonConfig.name.trim() && confirm.code === "CONFIRM"
                      ? "#fff" : "rgba(255,255,255,0.2)",
                    fontSize: 11, fontWeight: 800, cursor:
                      confirm.season_name === seasonConfig.name.trim() && confirm.code === "CONFIRM"
                        ? "pointer" : "not-allowed",
                    letterSpacing: 0.5,
                  }}
                >
                  🚀 LAUNCH SEASON
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Launching overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "launching" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "absolute", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.92)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{
                width: 56, height: 56, borderRadius: "50%",
                border: "3px solid rgba(99,102,241,0.15)",
                borderTopColor: "#6366f1",
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", letterSpacing: 0.5 }}>LAUNCHING SEASON…</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Resetting {totalSelected} system{totalSelected !== 1 ? "s" : ""}…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success overlay ───────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "success" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "absolute", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.92)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              style={{
                width: 70, height: 70, borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 40px rgba(16,185,129,0.4)",
              }}
            >
              <CheckCircle size={32} color="#fff" />
            </motion.div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: 0.5 }}>SEASON LAUNCHED!</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              Season {result?.season_number} — {seasonConfig.name}
            </div>
            <div style={{ fontSize: 11, color: "#10b981" }}>
              {result?.resets_applied} reset{result?.resets_applied !== 1 ? "s" : ""} applied
              {result?.snapshots > 0 && ` · ${result.snapshots} players snapshotted`}
            </div>
            {Array.isArray(result?.log) && result.log.length > 0 && (
              <div style={{
                width: "100%", maxWidth: 380, maxHeight: 160, overflowY: "auto",
                background: "rgba(0,0,0,0.5)", borderRadius: 8,
                border: "1px solid rgba(16,185,129,0.2)",
                padding: "8px 12px",
              }}>
                {result.log.map((line, i) => (
                  <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontFamily: "monospace" }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
              style={{
                marginTop: 8, padding: "10px 24px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              Done
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </motion.div>
  );
}
