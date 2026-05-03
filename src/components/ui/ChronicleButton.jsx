import { useState } from "react";

export function ChronicleButton({
  text,
  outlined = false,
  width = "auto",
  onClick,
  borderRadius = "20px",
  hoverColor = "#156ef6",
  customBackground = "#151419",
  customForeground = "#fff",
  hoverForeground = "#fff",
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      style={{
        width,
        padding: "10px 16px",
        borderRadius,
        backgroundColor: hovered ? hoverColor : outlined ? "transparent" : customBackground,
        color: hovered ? hoverForeground : customForeground,
        border: outlined ? `1px solid ${hovered ? hoverColor : customForeground}` : "none",
        cursor: "pointer",
        transition: "all 0.3s ease",
        fontWeight: 600,
        fontSize: "0.875rem",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {text}
    </button>
  );
}

export default ChronicleButton;
