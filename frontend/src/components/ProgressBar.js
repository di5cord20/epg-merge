import React from 'react';

/**
 * Progress bar component
 * Shows progress as a filled bar with percentage label
 * 
 * @param {number} progress - Progress percentage (0-100)
 * @param {boolean} showLabel - Whether to show percentage label
 * @returns {React.ReactElement} Progress bar component
 */
export const ProgressBar = ({ progress = 0, showLabel = true }) => (
  <div className="progress-bar">
    <div className="progress-fill" style={{ width: `${progress}%` }}>
      {showLabel && <span>{progress}%</span>}
    </div>
  </div>
);