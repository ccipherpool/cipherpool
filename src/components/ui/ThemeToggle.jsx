import { Sun, Moon } from "lucide-react";
import { useState } from "react";

export default function ThemeToggle({ variant = "default", buttonSize = 36 }) {
  const [dark, setDark] = useState(true);
  return (
    <button
      onClick={() => setDark(!dark)}
      title={dark ? "Mode clair" : "Mode sombre"}
      style={{ width: buttonSize, height: buttonSize }}
      className="flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-mint hover:border-mint/30 transition-all duration-300"
    >
      {dark ? <Moon size={buttonSize * 0.5} strokeWidth={2} /> : <Sun size={buttonSize * 0.5} strokeWidth={2} />}
    </button>
  );
}
