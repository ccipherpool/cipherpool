import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

const C = {
  bg:       "#0B0B1A",
  card:     "rgba(26,26,53,0.7)",
  card2:    "rgba(19,19,40,0.9)",
  border:   "rgba(255,255,255,0.07)",
  borderHov:"rgba(255,107,53,0.25)",
  orange:   "#FF6B35",
  orangeD:  "#E55A2B",
  purple:   "#6E56CF",
  purpleL:  "#9E8CFC",
  teal:     "#2DD4BF",
  text:     "#F0F0FA",
  text2:    "#B8B8D8",
  text3:    "#8B8BA7",
  text4:    "#6B6B8A",
};

const ROLE_BADGE = {
  leader:     { label: "LEADER",     color: C.orange  },
  co_leader:  { label: "CO-LEADER", color: C.purpleL },
  elite:      { label: "ELITE",      color: C.teal    },
  member:     { label: "MEMBRE",     color: C.text3   },
  recruit:    { label: "RECRUE",     color: C.text4   },
};

function ClanCard({ clan, myMembership }) {
  const [hovered, setHovered] = useState(false);
  const isMember = myMembership?.clan_id === clan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        background:   C.card,
        backdropFilter: "blur(16px)",
        border:   `1px solid ${hovered ? C.borderHov : C.border}`,
        boxShadow: hovered ? `0 8px 32px rgba(255,107,53,0.12)` : "none",
        transition: "all 0.25s",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* Banner top */}
      <div style={{
        height: 56,
        background: clan.accent_color
          ? `linear-gradient(135deg,${clan.accent_color}40,rgba(11,11,26,0.8))`
          : `linear-gradient(135deg,rgba(110,86,207,0.3),rgba(255,107,53,0.1))`,
        position: "relative",
      }}>
        {isMember && (
          <span style={{
            position: "absolute", top: 8, right: 10,
            background: "rgba(45,212,191,0.15)", color: C.teal,
            border: `1px solid rgba(45,212,191,0.3)`,
            borderRadius: 99, fontSize: 9, fontWeight: 700,
            padding: "3px 8px", letterSpacing: 1,
            fontFamily: "'JetBrains Mono',monospace",
          }}>MON CLAN</span>
        )}
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        {/* Logo + Name */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: -22, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: clan.accent_color || `linear-gradient(135deg,${C.purple},${C.orange})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.border}`,
            fontSize: 20,
          }}>
            {clan.logo_url
              ? <img src={clan.logo_url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
              : "🛡️"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: C.text, fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clan.name}
              </span>
              <span style={{
                background: "rgba(255,107,53,0.1)", color: C.orange,
                border: `1px solid rgba(255,107,53,0.2)`,
                borderRadius: 6, fontSize: 9, padding: "2px 6px",
                fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0,
              }}>[{clan.tag}]</span>
            </div>
            {clan.description && (
              <p style={{ color: C.text3, fontSize: 12, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clan.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
          {[
            { label: "MEMBRES",  value: clan.member_count || 0 },
            { label: "VICTOIRES", value: clan.wins || 0 },
            { label: "POINTS",   value: (clan.points || 0).toLocaleString("fr-FR") },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "7px 4px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
              <div style={{ color: C.orange, fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
              <div style={{ color: C.text4, fontSize: 8, letterSpacing: 1, marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 9, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace",
            color: clan.is_open ? C.teal : C.text4,
            background: clan.is_open ? "rgba(45,212,191,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${clan.is_open ? "rgba(45,212,191,0.2)" : C.border}`,
            borderRadius: 99, padding: "3px 8px",
          }}>
            {clan.is_open ? "OUVERT" : "FERMÉ"}
          </span>
          <Link to={`/clans/${clan.id}`} style={{
            padding: "6px 14px", borderRadius: 9, fontSize: 11, fontWeight: 700,
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: .5,
            background: `linear-gradient(135deg,${C.orange},${C.orangeD})`,
            color: "#fff", textDecoration: "none",
            boxShadow: "0 2px 12px rgba(255,107,53,0.25)",
            transition: "opacity .2s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            VOIR →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function Clans() {
  const ctx = useOutletContext() || {};
  const { profile } = ctx;

  const [clans,        setClans]       = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [search,       setSearch]      = useState("");
  const [filter,       setFilter]      = useState("all"); // all | open | closed
  const [loading,      setLoading]     = useState(true);

  useEffect(() => { fetchClans(); }, []);
  useEffect(() => { if (profile?.id) fetchMyMembership(profile.id); }, [profile?.id]);

  const fetchClans = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("clans")
        .select("*, clan_members(count)")
        .order("points", { ascending: false });

      const enriched = (data || []).map(c => ({
        ...c,
        member_count: c.clan_members?.[0]?.count || 0,
      }));
      setClans(enriched);
    } catch (_) {}
    setLoading(false);
  };

  const fetchMyMembership = async (userId) => {
    try {
      const { data } = await supabase
        .from("clan_members")
        .select("clan_id, role")
        .eq("user_id", userId)
        .maybeSingle();
      setMyMembership(data);
    } catch (_) {}
  };

  const filtered = clans.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.tag.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "open" && c.is_open) || (filter === "closed" && !c.is_open);
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ minHeight: "100vh", padding: "24px 20px 80px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.text, fontFamily: "'Space Grotesk',sans-serif" }}>
            Système de <span style={{ background: `linear-gradient(135deg,${C.orange},${C.orangeD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Clans</span>
          </h1>
        </div>
        <p style={{ color: C.text3, fontSize: 14, margin: 0 }}>
          Rejoins un clan, participe aux tests et grimpe dans le classement.
        </p>
      </div>

      {/* My clan banner */}
      {myMembership && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            background: "rgba(45,212,191,0.07)", border: "1px solid rgba(45,212,191,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <p style={{ margin: 0, color: C.teal, fontSize: 13, fontWeight: 700 }}>Tu fais partie d'un clan</p>
              <p style={{ margin: 0, color: C.text3, fontSize: 12 }}>
                Rôle: <span style={{ color: ROLE_BADGE[myMembership.role]?.color || C.text2, fontWeight: 600 }}>
                  {ROLE_BADGE[myMembership.role]?.label || myMembership.role}
                </span>
              </p>
            </div>
          </div>
          <Link to={`/clans/${myMembership.clan_id}`}
            style={{ padding: "7px 14px", borderRadius: 9, background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.25)", color: C.teal, fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "'JetBrains Mono',monospace" }}>
            MON CLAN →
          </Link>
        </motion.div>
      )}

      {/* Search & Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: .4 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un clan..."
            style={{
              width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10,
              background: C.card, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 13, outline: "none",
              fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(255,107,53,0.4)"}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
        {["all", "open", "closed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: 1,
              background: filter === f ? `linear-gradient(135deg,${C.orange},${C.orangeD})` : C.card,
              color:      filter === f ? "#fff" : C.text3,
              border:     filter === f ? "none" : `1px solid ${C.border}`,
              boxShadow:  filter === f ? "0 2px 12px rgba(255,107,53,0.25)" : "none",
            }}>
            { f === "all" ? "TOUS" : f === "open" ? "OUVERTS" : "FERMÉS" }
          </button>
        ))}
        {!myMembership && (
          <Link to="/clans/create"
            style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: 1,
              background: `linear-gradient(135deg,${C.purple},${C.purpleL})`,
              color: "#fff", textDecoration: "none",
              boxShadow: "0 2px 12px rgba(110,86,207,0.3)",
            }}>
            + CRÉER
          </Link>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Clans total",  value: clans.length },
          { label: "Clans ouverts", value: clans.filter(c => c.is_open).length },
          { label: "Résultats",    value: filtered.length },
        ].map(s => (
          <div key={s.label} style={{ padding: "8px 14px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: C.orange, fontWeight: 800, fontSize: 16, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</span>
            <span style={{ color: C.text3, fontSize: 11 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.text3 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: 3, fontSize: 11 }}>CHARGEMENT...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.text3 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2, fontSize: 12 }}>AUCUN CLAN TROUVÉ</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {filtered.map((clan, i) => (
            <motion.div key={clan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <ClanCard clan={clan} myMembership={myMembership} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
