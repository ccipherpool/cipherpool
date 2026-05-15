import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Trophy, Coins, TrendingUp, TrendingDown, ShieldCheck,
  BarChart3, RefreshCw, BadgeCheck, Ban, Swords, GitBranch,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

const T = {
  bg: "#08080d", surface: "#111119", surface2: "#171720", surface3: "#1e1e2a",
  border: "rgba(255,255,255,0.06)", border2: "rgba(255,255,255,0.1)",
  accent: "#6366f1", green: "#10b981", red: "#ef4444", amber: "#f59e0b",
  purple: "#8b5cf6", cyan: "#06b6d4", pink: "#ec4899", orange: "#f97316",
  text: "#f4f4f5", text2: "#a1a1aa", text3: "#52525b", text4: "#3f3f46",
};

const PIE_COLORS = [T.accent, T.green, T.amber, T.purple, T.cyan, T.red, T.orange, T.pink];

function fmt(n) { if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"; if (n >= 1000) return (n / 1000).toFixed(1) + "K"; return (n ?? 0).toLocaleString(); }
function fmtDay(d) { const dt = new Date(d); return dt.toLocaleDateString("en", { month: "short", day: "numeric" }); }
function fmtWeek(d) { const dt = new Date(d); return dt.toLocaleDateString("en", { month: "short", day: "numeric" }); }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.surface3, border: `1px solid ${T.border2}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ color: T.text2, marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>{p.name}: <strong>{fmt(p.value)}</strong></p>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, sub, color, delta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
        {delta !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? T.green : T.red, display: "flex", alignItems: "center", gap: 3 }}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: 4 }}>{fmt(value)}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{sub}</div>}
    </motion.div>
  );
}

function ChartCard({ title, children, span = 1 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px",
        gridColumn: span > 1 ? `span ${span}` : undefined,
      }}
    >
      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: "0 0 16px" }}>{title}</h3>
      {children}
    </motion.div>
  );
}

function TopEarnerRow({ username, balance, fairPlayScore, isVerified, rank }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: rank <= 3 ? [T.amber, T.text2, T.orange][rank - 1] : T.text3, width: 20, textAlign: "center" }}>
        #{rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>
          {username || "—"}
          {isVerified && <BadgeCheck size={12} color={T.cyan} />}
        </div>
        <div style={{ fontSize: 11, color: T.text3 }}>Fair-Play: {fairPlayScore ?? 100}</div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: T.green }}>{fmt(balance)} <span style={{ fontSize: 10, color: T.text3 }}>CP</span></span>
    </div>
  );
}

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [regData, setRegData] = useState([]);
  const [tourneyData, setTourneyData] = useState([]);
  const [coinFlow, setCoinFlow] = useState([]);
  const [topEarners, setTopEarners] = useState([]);
  const [tourBreakdown, setTourBreakdown] = useState([]);
  const [referralSummary, setReferralSummary] = useState({});
  const [range, setRange] = useState(30);

  useEffect(() => { fetchAll(); }, [range]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sum, reg, tour, coins, earners, breakdown, refs] = await Promise.all([
        supabase.rpc("analytics_platform_summary"),
        supabase.rpc("analytics_registrations_daily", { p_days: range }),
        supabase.rpc("analytics_tournaments_weekly", { p_weeks: Math.ceil(range / 7) }),
        supabase.rpc("analytics_coin_flow_daily", { p_days: range }),
        supabase.rpc("analytics_top_earners", { p_limit: 10 }),
        supabase.rpc("analytics_tournament_breakdown"),
        supabase.rpc("analytics_referral_summary"),
      ]);
      setSummary(sum.data || {});
      setRegData((reg.data || []).map(r => ({ day: fmtDay(r.day), count: Number(r.count) })));
      setTourneyData((tour.data || []).map(r => ({ week: fmtWeek(r.week_start), created: Number(r.created), completed: Number(r.completed) })));
      setCoinFlow((coins.data || []).map(r => ({ day: fmtDay(r.day), credits: Number(r.credits), debits: Number(r.debits) })));
      setTopEarners(earners.data || []);
      setTourBreakdown((breakdown.data || []).map(r => ({ name: r.status, value: Number(r.count) })));
      setReferralSummary(refs.data || {});
    } catch (err) {
      if (import.meta.env.DEV) console.error("analytics fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: `2px solid ${T.accent}30`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: T.text3, fontSize: 12 }}>Loading analytics…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const summaryCards = [
    { icon: Users,      label: "Total Users",        value: summary.total_users,        sub: `+${fmt(summary.new_users_7d)} this week`,       color: T.accent  },
    { icon: Trophy,     label: "Tournaments",         value: summary.total_tournaments,  sub: `${fmt(summary.active_tournaments)} active`,        color: T.purple  },
    { icon: BarChart3,  label: "Total CP Circulating",value: summary.total_coins,        sub: `${fmt(summary.total_transactions)} transactions`,  color: T.green   },
    { icon: Swords,     label: "Total Matches",       value: summary.total_matches,      sub: undefined,                                          color: T.cyan    },
    { icon: BadgeCheck, label: "Verified Players",    value: summary.verified_players,   sub: undefined,                                          color: T.amber   },
    { icon: Ban,        label: "Banned Users",        value: summary.banned_users,       sub: undefined,                                          color: T.red     },
    { icon: GitBranch,  label: "Active Clans",        value: summary.total_clans,        sub: undefined,                                          color: T.orange  },
    { icon: ShieldCheck,label: "Avg Fair-Play",       value: summary.avg_fair_play,      sub: `out of 200`,                                       color: T.pink    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: T.font }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>Analytics Dashboard</h2>
          <p style={{ fontSize: 12, color: T.text3, margin: "2px 0 0" }}>Platform performance overview</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              padding: "5px 12px", borderRadius: 7, border: `1px solid ${range === d ? T.accent : T.border}`,
              background: range === d ? `${T.accent}18` : "transparent",
              color: range === d ? T.accent : T.text3, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              {d}d
            </button>
          ))}
          <button onClick={fetchAll} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: T.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {summaryCards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 14 }}>

        {/* User Registrations */}
        <ChartCard title={`User Registrations — Last ${range} Days`} span={2}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={regData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="reg-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="day" tick={{ fill: T.text3, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Registrations" stroke={T.accent} strokeWidth={2} fill="url(#reg-grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Coin Flow */}
        <ChartCard title="Coin Flow — Credits vs Debits">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={coinFlow} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="credit-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="debit-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="day" tick={{ fill: T.text3, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="credits" name="Credits" stroke={T.green} strokeWidth={2} fill="url(#credit-grad)" dot={false} />
              <Area type="monotone" dataKey="debits" name="Debits" stroke={T.red} strokeWidth={2} fill="url(#debit-grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tournament Status Pie */}
        <ChartCard title="Tournament Status Breakdown">
          {tourBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tourBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {tourBreakdown.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.text3, fontSize: 12 }}>No data yet</div>
          )}
        </ChartCard>

      </div>

      {/* Weekly Tournaments Bar Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <ChartCard title="Tournaments Per Week">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tourneyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="week" tick={{ fill: T.text3, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: T.text3, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="created" name="Created" fill={T.purple} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="completed" name="Completed" fill={T.green} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Referral Stats */}
        <ChartCard title="Referral System">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {[
              { label: "Active Codes",   value: referralSummary.active_codes,    color: T.accent  },
              { label: "Total Referrals",value: referralSummary.total_referrals, color: T.purple  },
              { label: "Rewarded",       value: referralSummary.rewarded,        color: T.green   },
              { label: "CP Distributed", value: referralSummary.coins_spent,     color: T.amber   },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: T.text2 }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{fmt(r.value ?? 0)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Top Earners */}
      <ChartCard title="Top 10 Earners by Balance">
        {topEarners.length === 0 ? (
          <p style={{ fontSize: 12, color: T.text3, textAlign: "center", padding: "20px 0" }}>No data yet</p>
        ) : (
          <div>
            {topEarners.map((e, i) => (
              <TopEarnerRow
                key={i}
                rank={i + 1}
                username={e.username}
                balance={e.balance}
                fairPlayScore={e.fair_play_score}
                isVerified={e.is_verified}
              />
            ))}
          </div>
        )}
      </ChartCard>

    </motion.div>
  );
}
