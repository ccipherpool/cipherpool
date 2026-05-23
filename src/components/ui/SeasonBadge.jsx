import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * SeasonBadge — affiche la saison active partout
 * Utilisation: <SeasonBadge /> ou <SeasonBadge compact />
 */
export default function SeasonBadge({ compact = false, className = "" }) {
  const [season, setSeason] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("seasons")
          .select("number, name, theme_color")
          .eq("status", "active")
          .maybeSingle();
        if (!cancelled && data) setSeason(data);
      } catch {
        // season unavailable — badge stays hidden
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!season) return null;

  const color = season.theme_color || "#10b981";

  if (compact) {
    return (
      <Link
        to="/hall-of-fame"
        data-testid="season-badge-compact"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${className}`}
        style={{
          background: `${color}15`,
          border: `1px solid ${color}40`,
          color,
        }}
      >
        <Trophy size={10} />
        S{season.number}
      </Link>
    );
  }

  return (
    <Link
      to="/hall-of-fame"
      data-testid="season-badge"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 ${className}`}
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
        color,
      }}
    >
      <Trophy size={12} />
      Saison {season.number}
      <span className="text-white/60 font-medium normal-case tracking-normal ml-1 hidden sm:inline">
        · {season.name}
      </span>
    </Link>
  );
}
