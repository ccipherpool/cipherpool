import { useState, useEffect } from "react";

export default function SeasonCountdown({ endDate, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [ended,    setEnded]    = useState(false);

  useEffect(() => {
    if (!endDate) return;
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
    <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
      <span className="text-red-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Saison Terminée</span>
    </div>
  );

  if (!timeLeft) return null;

  const units = [
    { label: "j", value: timeLeft.days    },
    { label: "h", value: timeLeft.hours   },
    { label: "m", value: timeLeft.minutes },
    { label: "s", value: timeLeft.seconds },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-cyber-gold">
        {units.map((u, i) => (
          <span key={i}>{String(u.value).padStart(2, '0')}{u.label}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center min-w-[42px] p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <span className="text-lg font-black text-mint leading-none font-heading">{String(value).padStart(2, "0")}</span>
          <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}
