const CSS = `
.cp-rainbow-border::before,
.cp-rainbow-border::after {
  content: '';
  position: absolute;
  left: -2px;
  top: -2px;
  border-radius: inherit;
  background: linear-gradient(45deg,#06b6d4,#0891b2,#f97316,#fb923c,#06b6d4,#0891b2,#f97316,#fb923c);
  background-size: 400%;
  width: calc(100% + 4px);
  height: calc(100% + 4px);
  z-index: -1;
  animation: cp-rainbow 20s linear infinite;
}
.cp-rainbow-border::after {
  filter: blur(50px);
}
@keyframes cp-rainbow {
  0%   { background-position: 0 0; }
  50%  { background-position: 400% 0; }
  100% { background-position: 0 0; }
}
`;

export const RainbowButton = ({ children = "Button", onClick, className = "", type = "button" }) => {
  return (
    <>
      <style>{CSS}</style>
      <button
        type={type}
        onClick={onClick}
        className={`cp-rainbow-border relative inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-[#0c0c1a] rounded-xl border-none text-white cursor-pointer font-bold transition-all duration-200 hover:bg-[#1a1a2e] active:scale-95 ${className}`}
      >
        {children}
      </button>
    </>
  );
};

export default RainbowButton;
