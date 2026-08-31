import React, { useState } from 'react';

/**
 * Tooltip component for hover/touch metric definitions and explanations.
 */
export const Tooltip = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="tooltip-container"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible(!visible)}
    >
      {children}
      {visible && (
        <span className={`tooltip-bubble tooltip-${position}`}>
          {content}
        </span>
      )}
    </span>
  );
};

/**
 * HelpTip helper icon component with predefined tooltip text
 */
export const HelpTip = ({ text }) => (
  <Tooltip content={text}>
    <span className="cursor-pointer text-[10px] text-teal-400/80 hover:text-teal-300 ml-1 select-none">
      ℹ️
    </span>
  </Tooltip>
);

export default Tooltip;
