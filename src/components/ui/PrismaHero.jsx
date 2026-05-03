import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WordsPullUp } from "./WordsPullUp";

export const PrismaHero = ({
  videoSrc,
  posterSrc,
  logoText = "CP",
  navLinks = [],
  headline = "",
  subline = "",
  ctaPrimary = null,
  ctaSecondary = null,
  overlay = true,
}) => {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#07070f" }}>
      {/* Video background */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setLoaded(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 0.5 : 0,
            transition: "opacity 1s ease",
          }}
        />
      )}

      {/* Gradient overlay */}
      {overlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(7,7,15,0.6) 0%, rgba(7,7,15,0.2) 50%, rgba(7,7,15,0.85) 100%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Minimal top navbar */}
      <nav
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: "1.4rem",
            letterSpacing: "0.05em",
            background: "linear-gradient(135deg, #06b6d4, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {logoText}
        </span>
        {navLinks.length > 0 && (
          <div style={{ display: "flex", gap: "2rem" }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  color: "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#06b6d4")}
                onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.7)")}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* Hero content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 2rem",
          zIndex: 5,
        }}
      >
        {headline && (
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              marginBottom: "1.5rem",
              maxWidth: "900px",
            }}
          >
            <WordsPullUp text={headline} />
          </h1>
        )}

        {subline && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "rgba(255,255,255,0.6)",
              maxWidth: "600px",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
            }}
          >
            {subline}
          </motion.p>
        )}

        {(ctaPrimary || ctaSecondary) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            {ctaPrimary && (
              <button
                onClick={ctaPrimary.onClick}
                style={{
                  padding: "14px 36px",
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  color: "#000",
                  border: "none",
                  borderRadius: "100px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  transition: "opacity 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "scale(1.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {ctaPrimary.label}
              </button>
            )}
            {ctaSecondary && (
              <button
                onClick={ctaSecondary.onClick}
                style={{
                  padding: "14px 36px",
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "100px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  transition: "border-color 0.2s, transform 0.2s",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#06b6d4"; e.currentTarget.style.transform = "scale(1.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {ctaSecondary.label}
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "120px",
          background: "linear-gradient(to bottom, transparent, #07070f)",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />
    </div>
  );
};

export default PrismaHero;
