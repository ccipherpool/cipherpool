import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react";
import { motion } from "framer-motion";

export function ShaderBackground({ children, className = "" }) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-black ${className}`}>
      <MeshGradient
        className="absolute inset-0 w-full h-full"
        colors={["#000000", "#06b6d4", "#0891b2", "#164e63", "#f97316"]}
        speed={0.3}
        backgroundColor="#000000"
      />
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-40"
        colors={["#000000", "#ffffff", "#06b6d4", "#f97316"]}
        speed={0.2}
        wireframe={true}
        backgroundColor="transparent"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function PulsingRing({ size = 80, colors, style }) {
  const ringColors = colors || ["#06b6d4", "#0891b2", "#f97316", "#00FF88", "#FFD700"];
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <PulsingBorder
        colors={ringColors}
        colorBack="#00000000"
        speed={1.5}
        roundness={1}
        thickness={0.1}
        softness={0.2}
        intensity={5}
        spotsPerColor={5}
        spotSize={0.1}
        pulse={0.1}
        smoke={0.5}
        smokeSize={4}
        scale={0.65}
        style={{ width: size * 0.75, height: size * 0.75, borderRadius: "50%", ...style }}
      />
    </div>
  );
}

export default ShaderBackground;
