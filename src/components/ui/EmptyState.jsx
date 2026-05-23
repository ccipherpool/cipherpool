// EmptyState — zero-data / no-results state
// Usage: <EmptyState icon={Search} title="No results" subtitle="Try a different query" action={<Button>Reset</Button>} />

export default function EmptyState({
  icon: Icon,
  title = "Nothing here yet",
  subtitle,
  action,
  compact = false,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 ${compact ? "py-10" : "py-20"} ${className}`}
    >
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
          style={{
            background: "var(--cp-accent-dim)",
            color: "var(--cp-accent)",
            border: "1px solid var(--cp-accent-border)",
          }}
        >
          <Icon size={24} />
        </div>
      )}
      <p
        className="font-heading font-bold text-base"
        style={{ color: "var(--cp-text-1)" }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-sm max-w-xs"
          style={{ color: "var(--cp-text-3)" }}
        >
          {subtitle}
        </p>
      )}
      {action && (
        <div className="mt-2">{action}</div>
      )}
    </div>
  );
}
