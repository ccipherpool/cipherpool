// StatCard — animated metric card for dashboards
// color: "purple" | "cyan" | "green" | "gold" | "red"

const COLOR_MAP = {
  purple: { accent: "#7C3AED", dim: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)" },
  cyan:   { accent: "#06B6D4", dim: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.25)"  },
  green:  { accent: "#10B981", dim: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  gold:   { accent: "#F59E0B", dim: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  red:    { accent: "#EF4444", dim: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)"  },
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "purple",
  trend,          // { value: "+12%", up: true }
  className = "",
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.purple;

  return (
    <div
      className={`stat-card relative overflow-hidden ${className}`}
      style={{ borderColor: c.border }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-[15%] right-[15%] h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.accent}60, transparent)` }}
      />
      {/* Ambient orb */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.dim} 0%, transparent 70%)`, filter: "blur(20px)" }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-widest truncate"
            style={{ color: "var(--cp-text-3)", letterSpacing: "0.08em" }}
          >
            {label}
          </p>
          <p
            className="stat-card-value"
            style={{ color: c.accent }}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-0.5" style={{ color: "var(--cp-text-4)" }}>{sub}</p>
          )}
          {trend && (
            <p
              className="text-xs font-semibold mt-1"
              style={{ color: trend.up ? "#10B981" : "#EF4444" }}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: c.dim, color: c.accent }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
