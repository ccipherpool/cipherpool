import React from "react";

const GlassFilter = () => (
  <svg style={{ display: "none" }} aria-hidden="true">
    <filter id="cp-glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export const GlassPanel = ({ children, className = "", style = {}, href, target = "_blank" }) => {
  const glassStyle = {
    boxShadow: "0 6px 6px rgba(0,0,0,0.2), 0 0 20px rgba(0,0,0,0.1)",
    transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
    ...style,
  };

  const content = (
    <div
      className={`relative flex font-semibold overflow-hidden text-white cursor-pointer transition-all duration-700 ${className}`}
      style={glassStyle}
    >
      <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl" style={{ backdropFilter: "blur(3px)", filter: "url(#cp-glass-distortion)", isolation: "isolate" }} />
      <div className="absolute inset-0 z-10" style={{ background: "rgba(255,255,255,0.1)" }} />
      <div className="absolute inset-0 z-20 rounded-3xl overflow-hidden" style={{ boxShadow: "inset 2px 2px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 1px 1px rgba(255,255,255,0.2)" }} />
      <div className="relative z-30">{children}</div>
    </div>
  );

  return (
    <>
      <GlassFilter />
      {href ? <a href={href} target={target} rel="noopener noreferrer" className="block">{content}</a> : content}
    </>
  );
};

export const GlassDock = ({ icons, href }) => (
  <GlassPanel href={href} className="rounded-3xl p-3 hover:p-4 hover:rounded-[2rem]">
    <div className="flex items-center justify-center gap-2 px-1 py-0 overflow-hidden">
      {icons.map((icon, index) => (
        <img
          key={index}
          src={icon.src}
          alt={icon.alt}
          className="w-14 h-14 transition-all duration-700 hover:scale-110 cursor-pointer"
          style={{ transformOrigin: "center center", transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}
          onClick={icon.onClick}
        />
      ))}
    </div>
  </GlassPanel>
);

export const GlassButton = ({ children, href, onClick }) => (
  <GlassPanel
    href={href}
    className="rounded-3xl px-8 py-4 hover:px-9 hover:py-5 hover:rounded-[2rem] overflow-hidden"
    style={onClick ? { cursor: "pointer" } : {}}
  >
    <div
      className="transition-all duration-700 hover:scale-95"
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}
      onClick={onClick}
    >
      {children}
    </div>
  </GlassPanel>
);

export default GlassPanel;
