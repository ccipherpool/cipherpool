import { motion } from "framer-motion";

export const WordsPullUp = ({ text = "", className = "", showAsterisk = false, style }) => {
  const words = text.split(" ");

  return (
    <span className={className} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.33, 1, 0.68, 1] }}
          style={{ display: "inline-block", marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
      {showAsterisk && (
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: words.length * 0.07 }}
          style={{ display: "inline-block", color: "#06b6d4", marginLeft: "0.1em" }}
        >
          *
        </motion.span>
      )}
    </span>
  );
};

export const WordsPullUpMultiStyle = ({ segments = [], className = "", style }) => {
  let wordOffset = 0;

  return (
    <span className={className} style={style}>
      {segments.map((segment, si) => {
        const words = segment.text.split(" ");
        const currentOffset = wordOffset;
        wordOffset += words.length;
        return (
          <span key={si} style={segment.style}>
            {words.map((word, wi) => (
              <motion.span
                key={wi}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.5,
                  delay: (currentOffset + wi) * 0.07,
                  ease: [0.33, 1, 0.68, 1],
                }}
                style={{ display: "inline-block", marginRight: "0.25em" }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        );
      })}
    </span>
  );
};

export default WordsPullUp;
