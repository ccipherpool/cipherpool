import { motion } from "framer-motion";
import clsx from "clsx";
import { useState } from "react";

/**
 * Tabs Component - Tabbed Interface
 */
export function Tabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="w-full">
      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-primary-900/30 overflow-x-auto">
        {tabs.map((tab, index) => (
          <motion.button
            key={index}
            onClick={() => setActiveTab(index)}
            className={clsx(
              "px-4 py-3 font-medium text-sm transition-all relative whitespace-nowrap",
              activeTab === index
                ? "text-primary-300"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
            {activeTab === index && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="py-4"
      >
        {tabs[activeTab].content}
      </motion.div>
    </div>
  );
}

export default Tabs;
