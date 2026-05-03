import React, { useRef, useEffect } from "react";
import { ChronicleButton } from "./ChronicleButton";

const BAUHAUS_CSS = `
.bauhaus-card {
  position: relative;
  z-index: 1;
  max-width: 20rem;
  min-height: 20rem;
  width: 90%;
  display: grid;
  place-content: center;
  place-items: center;
  text-align: center;
  box-shadow: 1px 12px 25px rgb(0,0,0/78%);
  border-radius: var(--bc-radius, 20px);
  border: var(--bc-border-width, 2px) solid transparent;
  --rotation: 4.2rad;
  background-image:
    linear-gradient(var(--bc-bg, #0c0c1a), var(--bc-bg, #0c0c1a)),
    linear-gradient(calc(var(--rotation,4.2rad)), var(--bc-accent, #06b6d4) 0, var(--bc-bg, #0c0c1a) 30%, transparent 80%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  color: var(--bc-text-main, #f0f0f1);
}
.bauhaus-card-header {
  position: absolute; top: 0; left: 0; right: 0; width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.8em 0.5em 0em 1.5em;
}
.bauhaus-card-body {
  position: absolute; width: 100%;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  padding: 0.7em 1.25em 0.5em 1.5em;
}
.bauhaus-card-body h3 { font-size: 1.25rem; margin-top: -0.4em; margin-bottom: 0.2em; font-weight: 600; color: var(--bc-text-main, #f0f0f1); }
.bauhaus-card-body p  { color: var(--bc-text-sub, #a0a1b3); font-size: 0.95rem; letter-spacing: 0.03rem; }
.bauhaus-progress { margin-top: 0.9rem; }
.bauhaus-progress-bar { position: relative; width: 100%; background: var(--bc-progress-bg, #1e1e3a); height: 5px; display: block; border-radius: 50px; }
.bauhaus-progress span:first-of-type { text-align: left; font-weight: 600; width: 100%; display: block; margin-bottom: 0.3rem; color: var(--bc-text-label, #94a3b8); font-size: 0.8rem; }
.bauhaus-progress span:last-of-type  { margin-top: 0.3rem; text-align: right; display: block; color: var(--bc-text-value, #e7e7f7); font-size: 0.8rem; }
.bauhaus-card-footer {
  position: absolute; bottom: 0; left: 0; right: 0; width: 100%;
  display: flex; justify-content: center; align-items: center;
  padding: 0.7em 1.25em 0.5em 1.5em;
  border-top: 1px solid var(--bc-separator, rgba(255,255,255,0.08));
}
.bauhaus-btn-row { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 7px 0; }
.bauhaus-size6 { width: 2.2rem; cursor: pointer; }
.bauhaus-date { color: var(--bc-text-top, #94a3b8); font-size: 0.8rem; }
`;

function injectBauhausCSS() {
  if (typeof window === "undefined" || document.getElementById("bauhaus-card-css")) return;
  const style = document.createElement("style");
  style.id = "bauhaus-card-css";
  style.innerHTML = BAUHAUS_CSS;
  document.head.appendChild(style);
}

export function BauhausCard({
  id,
  accentColor = "#06b6d4",
  backgroundColor = "#0c0c1a",
  separatorColor = "rgba(255,255,255,0.08)",
  borderRadius = "20px",
  borderWidth = "2px",
  topInscription = "CipherPool",
  mainText = "Title",
  subMainText = "Subtitle",
  progressBarInscription = "Progress",
  progress = 0,
  progressValue = "0%",
  filledButtonInscription = "Action",
  outlinedButtonInscription = "Cancel",
  onFilledButtonClick = () => {},
  onOutlinedButtonClick = () => {},
  onMoreOptionsClick = () => {},
  swapButtons = false,
  mirrored = false,
  textColorTop = "#94a3b8",
  textColorMain = "#f0f0f1",
  textColorSub = "#a0a1b3",
  textColorProgressLabel = "#94a3b8",
  textColorProgressValue = "#e7e7f7",
  progressBarBackground = "#1e1e3a",
  chronicleButtonBg = "#0c0c1a",
  chronicleButtonFg = "#fff",
  ChronicleButtonHoverColor,
}) {
  const cardRef = useRef(null);
  useEffect(() => {
    injectBauhausCSS();
    const card = cardRef.current;
    const handleMouseMove = (e) => {
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        card.style.setProperty("--rotation", Math.atan2(-x, y) + "rad");
      }
    };
    card?.addEventListener("mousemove", handleMouseMove);
    return () => card?.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const hoverColor = ChronicleButtonHoverColor || accentColor;

  return (
    <div
      className="bauhaus-card"
      ref={cardRef}
      style={{
        "--bc-bg": backgroundColor,
        "--bc-accent": accentColor,
        "--bc-radius": borderRadius,
        "--bc-border-width": borderWidth,
        "--bc-text-top": textColorTop,
        "--bc-text-main": textColorMain,
        "--bc-text-sub": textColorSub,
        "--bc-text-label": textColorProgressLabel,
        "--bc-text-value": textColorProgressValue,
        "--bc-separator": separatorColor,
        "--bc-progress-bg": progressBarBackground,
      }}
    >
      <div className="bauhaus-card-header" style={{ transform: mirrored ? "scaleX(-1)" : "none" }}>
        <div className="bauhaus-date" style={{ transform: mirrored ? "scaleX(-1)" : "none" }}>{topInscription}</div>
        <div onClick={() => onMoreOptionsClick(id)} style={{ cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="var(--bc-text-main)" className="bauhaus-size6">
            <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <div className="bauhaus-card-body">
        <h3>{mainText}</h3>
        <p>{subMainText}</p>
        <div className="bauhaus-progress">
          <span>{progressBarInscription}</span>
          <div className="bauhaus-progress-bar" style={{ transform: mirrored ? "scaleX(-1)" : "none" }}>
            <div style={{ height: 5, borderRadius: 50, width: `${Math.min(100, progress)}%`, backgroundColor: accentColor }} />
          </div>
          <span>{progressValue}</span>
        </div>
      </div>
      <div className="bauhaus-card-footer">
        <div className="bauhaus-btn-row">
          {swapButtons ? (
            <>
              <ChronicleButton text={outlinedButtonInscription} outlined width="110px" onClick={() => onOutlinedButtonClick(id)} borderRadius={borderRadius} hoverColor={hoverColor} customBackground={chronicleButtonBg} customForeground={chronicleButtonFg} />
              <ChronicleButton text={filledButtonInscription} width="110px" onClick={() => onFilledButtonClick(id)} borderRadius={borderRadius} hoverColor={hoverColor} customBackground={chronicleButtonBg} customForeground={chronicleButtonFg} />
            </>
          ) : (
            <>
              <ChronicleButton text={filledButtonInscription} width="110px" onClick={() => onFilledButtonClick(id)} borderRadius={borderRadius} hoverColor={hoverColor} customBackground={chronicleButtonBg} customForeground={chronicleButtonFg} />
              <ChronicleButton text={outlinedButtonInscription} outlined width="110px" onClick={() => onOutlinedButtonClick(id)} borderRadius={borderRadius} hoverColor={hoverColor} customBackground={chronicleButtonBg} customForeground={chronicleButtonFg} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BauhausCard;
