import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const C = {
  bg:       "#06080f",
  surface:  "rgba(10,14,26,0.98)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  indigo:   "#6366f1",
  cyan:     "#06b6d4",
  violet:   "#a855f7",
  green:    "#22c55e",
  amber:    "#f59e0b",
  red:      "#ef4444",
  text:     "#f1f5f9",
  text2:    "rgba(255,255,255,0.5)",
  text3:    "rgba(255,255,255,0.25)",
};

const PAGE_SIZE = 24;

const STATUS_COLOR = {
  online:        "#22c55e",
  in_game:       "#f59e0b",
  in_tournament: "#f59e0b",
  streaming:     "#a855f7",
  away:          "#94a3b8",
  offline:       "rgba(255,255,255,0.15)",
};

const ROLE_BADGE = {
  founder:    { label: "Founder",    color: "#f59e0b" },
  fondateur:  { label: "Founder",    color: "#f59e0b" },
  super_admin:{ label: "SA",         color: "#ef4444" },
  admin:      { label: "Admin",      color: "#6366f1" },
  designer:   { label: "Designer",   color: "#a855f7" },
  mod:        { label: "Mod",        color: "#06b6d4" },
};

function flag(code) {
  if (!code || code.length !== 2) return "";
  try {
    return code.toUpperCase().split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
  } catch { return ""; }
}

function getStatus(player) {
  const p = Array.isArray(player.user_presence) ? player.user_presence[0] : player.user_presence;
  if (!p) return "offline";
  const fresh = Date.now() - new Date(p.last_seen).getTime() < 15 * 60 * 1000;
  return fresh && p.status !== "offline" ? p.status : "offline";
}

// ── Player card ────────────────────────────────────────────────
function PlayerCard({ player, onClick }) {
  const status  = getStatus(player);
  const online  = status !== "offline";
  const clan    = Array.isArray(player.clan_members) ? player.clan_members[0]?.clans : player.clan_members?.clans;
  const team    = Array.isArray(player.team_members) ? player.team_members[0]?.teams : player.team_members?.teams;
  const roleInfo = ROLE_BADGE[player.role];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={onClick}
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "16px 16px 14px",
        cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.09)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Avatar + name row */}
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13,
            background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(6,182,212,0.08))",
            border: `1px solid ${online ? "rgba(34,197,94,0.35)" : C.border}`,
            overflow: "hidden",
          }}>
            {player.avatar_url
              ? <img src={player.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, color: C.indigo }}>
                  {player.username?.[0]?.toUpperCase() || "?"}
                </div>
            }
          </div>
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            width: 11, height: 11, borderRadius: "50%",
            background: STATUS_COLOR[status] || C.text3,
            border: "2px solid #06080f",
            boxShadow: online ? `0 0 5px ${STATUS_COLOR[status]}80` : "none",
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
              {player.username}
            </span>
            {roleInfo && (
              <span style={{ fontSize: 9, fontWeight: 800, color: roleInfo.color, background: `${roleInfo.color}15`, border: `1px solid ${roleInfo.color}30`, borderRadius: 4, padding: "1px 5px", textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                {roleInfo.label}
              </span>
            )}
          </div>
          {player.level && (
            <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>Lvl {player.level}</div>
          )}
          {player.free_fire_name && (
            <div style={{ fontSize: 11.5, color: C.indigo, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              🎮 {player.free_fire_name}
            </div>
          )}
        </div>
      </div>

      {/* UID */}
      {player.free_fire_uid && (
        <div style={{ fontSize: 10.5, color: C.text3, fontFamily: "monospace", fontWeight: 600, marginBottom: 7, letterSpacing: 0.4 }}>
          UID: {player.free_fire_uid}
        </div>
      )}

      {/* Location + age + gender */}
      {(player.country || player.age || (player.gender && player.gender !== "prefer_not_to_say")) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          {player.country && (
            <span style={{ fontSize: 11, color: C.text2 }}>
              {flag(player.country)} {player.country}{player.city ? `, ${player.city}` : ""}
            </span>
          )}
          {player.age && <span style={{ fontSize: 11, color: C.text3 }}>· {player.age}y</span>}
          {player.gender === "male"   && <span style={{ fontSize: 11, color: C.text3 }}>· ♂</span>}
          {player.gender === "female" && <span style={{ fontSize: 11, color: C.text3 }}>· ♀</span>}
        </div>
      )}

      {/* Clan + team badges */}
      {(clan || team) && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {clan && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: C.violet, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
              [{clan.tag || "CLAN"}] {clan.name}
            </span>
          )}
          {team && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: C.cyan, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
              ⚔ {team.name}
            </span>
          )}
        </div>
      )}

      {/* Bio */}
      {player.bio && (
        <p style={{
          fontSize: 11.5, color: C.text2, margin: 0, lineHeight: 1.5,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {player.bio}
        </p>
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function Players() {
  const navigate = useNavigate();

  const [players,     setPlayers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [hasMore,     setHasMore]     = useState(false);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);
  const [search,      setSearch]      = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState({
    country: "", city: "", gender: "", online_only: false, min_age: "", max_age: "",
  });

  const searchTimer = useRef(null);
  const latestSearch = useRef("");

  // ── Fetch players ─────────────────────────────────────────────
  const fetchPlayers = useCallback(async (pageNum, searchVal, activeFilters, append) => {
    setLoading(true);
    try {
      let onlineIds = null;
      if (activeFilters.online_only) {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: pres } = await supabase
          .from("user_presence")
          .select("user_id")
          .neq("status", "offline")
          .gte("last_seen", cutoff);
        onlineIds = pres?.map(p => p.user_id) ?? [];
        if (onlineIds.length === 0) {
          setPlayers(append ? (prev => prev) : []);
          setTotal(0); setHasMore(false); setLoading(false);
          return;
        }
      }

      let q = supabase.from("profiles")
        .select(`
          id, username, avatar_url, free_fire_name, free_fire_uid,
          country, city, age, bio, gender, level, role,
          user_presence(status, last_seen),
          clan_members(clans(id, name, tag, logo_url)),
          team_members(teams(id, name, tag, logo_url))
        `, { count: "exact" })
        .eq("account_status", "active")
        .not("username", "is", null)
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (searchVal.trim()) {
        const s = searchVal.trim();
        q = q.or(`username.ilike.%${s}%,free_fire_name.ilike.%${s}%,free_fire_uid.ilike.%${s}%`);
      }
      if (activeFilters.country) q = q.ilike("country", activeFilters.country.trim());
      if (activeFilters.city)    q = q.ilike("city", `%${activeFilters.city.trim()}%`);
      if (activeFilters.gender)  q = q.eq("gender", activeFilters.gender);
      if (activeFilters.min_age) q = q.gte("age", Number(activeFilters.min_age));
      if (activeFilters.max_age) q = q.lte("age", Number(activeFilters.max_age));
      if (onlineIds)             q = q.in("id", onlineIds);

      const { data, count, error } = await q;
      if (error) throw error;

      setPlayers(prev => append ? [...prev, ...(data ?? [])] : (data ?? []));
      setTotal(count ?? 0);
      setHasMore((count ?? 0) > (pageNum + 1) * PAGE_SIZE);
    } catch (err) {
      console.error("[Players] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when filters change
  useEffect(() => {
    setPage(0);
    fetchPlayers(0, search, filters, false);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    latestSearch.current = val;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      fetchPlayers(0, val, filters, false);
    }, 380);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPlayers(next, search, filters, true);
  };

  const clearAll = () => {
    const empty = { country: "", city: "", gender: "", online_only: false, min_age: "", max_age: "" };
    setFilters(empty);
    setSearch("");
    setPage(0);
    fetchPlayers(0, "", empty, false);
  };

  const hasActive = search || Object.entries(filters).some(([, v]) => v !== "" && v !== false);

  const inputStyle = {
    width: "100%", padding: "9px 11px", borderRadius: 8,
    border: `1px solid ${C.border2}`, background: "rgba(255,255,255,0.04)",
    color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 20px 48px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.1))",
              border: "1px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              👥
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: -0.5 }}>
                Player Directory
              </h1>
              <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>
                {total > 0 ? `${total.toLocaleString()} joueurs inscrits` : "Découvrez la communauté"}
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

            {/* Search */}
            <div style={{ flex: "1 1 260px", position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.text3, pointerEvents: "none" }}>🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Chercher par pseudo, nom FF ou UID..."
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
              {search && (
                <button onClick={() => handleSearch("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Online toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
              <div
                onClick={() => setFilters(f => ({ ...f, online_only: !f.online_only }))}
                style={{ width: 34, height: 18, borderRadius: 9, background: filters.online_only ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
              >
                <div style={{ position: "absolute", top: 3, left: filters.online_only ? 18 : 3, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: filters.online_only ? C.green : C.text2 }}>En ligne</span>
            </label>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 13px",
                borderRadius: 9, border: `1px solid ${showFilters ? "rgba(99,102,241,0.4)" : C.border}`,
                background: showFilters ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                color: showFilters ? C.indigo : C.text2, fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              ⚙ Filtres {showFilters ? "▲" : "▼"}
              {hasActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.indigo, flexShrink: 0 }} />}
            </button>

            {hasActive && (
              <button onClick={clearAll}
                style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Effacer tout
              </button>
            )}
          </div>

          {/* Advanced filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Pays (code)</label>
                    <input type="text" value={filters.country} maxLength={2}
                      onChange={e => setFilters(f => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="MA, DZ, TN…" style={inputStyle} />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Ville</label>
                    <input type="text" value={filters.city}
                      onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                      placeholder="Casablanca…" style={inputStyle} />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Genre</label>
                    <select value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}
                      style={{ ...inputStyle, background: "#0a0e1a", color: filters.gender ? C.text : C.text3 }}>
                      <option value="">Tous</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Âge</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" min={13} max={99} value={filters.min_age}
                        onChange={e => setFilters(f => ({ ...f, min_age: e.target.value }))}
                        placeholder="Min" style={{ ...inputStyle, width: "50%" }} />
                      <input type="number" min={13} max={99} value={filters.max_age}
                        onChange={e => setFilters(f => ({ ...f, max_age: e.target.value }))}
                        placeholder="Max" style={{ ...inputStyle, width: "50%" }} />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Grid */}
        {loading && players.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220, gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.2)", borderTopColor: C.indigo, animation: "pl-spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 12, color: C.text3, fontWeight: 600 }}>Chargement des joueurs…</span>
          </div>
        ) : players.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Aucun joueur trouvé</div>
            <p style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>Essayez d'ajuster vos filtres ou votre recherche</p>
            <button onClick={clearAll} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "rgba(99,102,241,0.2)", color: C.indigo, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Effacer les filtres
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))", gap: 14, marginBottom: 24 }}>
              {players.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => navigate(`/player/${player.username}`)}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  style={{
                    padding: "12px 28px", borderRadius: 12,
                    border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)",
                    color: C.indigo, fontSize: 13, fontWeight: 700,
                    cursor: loading ? "wait" : "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8,
                  }}
                >
                  {loading
                    ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: C.indigo, borderRadius: "50%", animation: "pl-spin 0.8s linear infinite" }} /> Chargement…</>
                    : `Voir plus (${total - players.length} restants)`
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
