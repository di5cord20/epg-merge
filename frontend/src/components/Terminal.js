import React, { useEffect, useRef } from 'react';

/**
 * Terminal component
 * Displays log messages with color coding
 * Auto-scrolls to bottom when new messages arrive
 * 
 * @param {Array} logs - Array of log message strings
 * @returns {React.ReactElement} Terminal component
 */
export const Terminal = ({ logs = [] }) => {
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);
  
  return (
    <div className="terminal" ref={scrollRef}>
      {logs.map((line, i) => (
        <div 
          key={i} 
          className={`terminal-line ${
            line.includes('❌') ? 'error' : 
            line.includes('✅') ? 'success' : 
            line.includes('⚠️') ? 'warning' : ''
          }`}
        >
          {line}
        </div>
      ))}
    </div>
  );
};