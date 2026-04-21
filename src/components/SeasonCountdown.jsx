import { useState, useEffect } from "react";

const C = {
  orange: "#FF6B35",
  card:   "rgba(26,26,53,0.6)",
  border: "rgba(255,255,255,0.06)",
  text3:  "#8B8BA7",
};

export default function SeasonCountdown({ endDate }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [ended,    setEnded]    = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) { setEnded(true); return; }
      setTimeLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000),
        seconds: Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (ended) return (
    <div style={{ textAlign: "center", padding: "12px 20px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
      <span style={{ color: C.orange, fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>SAISON TERMINÉE</span>
    </div>
  );

  if (!timeLeft) return null;

  const units = [
    { label: "JOURS",    value: timeLeft.days    },
    { label: "HEURES",   value: timeLeft.hours   },
    { label: "MINUTES",  value: timeLeft.minutes },
    { label: "SECONDES", value: timeLeft.seconds },
  ];

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {units.map(({ label, value }) => (
        <div key={label} style={{
          textAlign: "center", padding: "10px 14px", borderRadius: 12,
          background: C.card, border: `1px solid ${C.border}`, minWidth: 60,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, lineHeight: 1, fontFamily: "'JetBrains Mono',monospace" }}>
            {String(value).padStart(2, "0")}
          </div>
          <div style={{ fontSize: 8, color: C.text3, letterSpacing: 1.5, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
