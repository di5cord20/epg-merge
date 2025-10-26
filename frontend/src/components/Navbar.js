import React from 'react';

const TABS = [
  { id: 'sources', label: 'Sources', icon: '📁' },
  { id: 'channels', label: 'Channels', icon: '📺' },
  { id: 'merge', label: 'Merge', icon: '⚡' },
  { id: 'archives', label: 'Archives', icon: '📦' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

/**
 * Navigation bar component
 * Displays app title, navigation tabs, and theme toggle
 * 
 * @param {string} currentPage - Currently active page
 * @param {function} onPageChange - Callback when page changes
 * @param {function} onThemeToggle - Callback when theme toggled
 * @param {boolean} darkMode - Current theme mode
 * @returns {React.ReactElement} Navbar component
 */
export const Navbar = ({ currentPage, onPageChange, onThemeToggle, darkMode }) => {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <h1>🎬 EPG Merge</h1>
        <div className="nav-links">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-link ${currentPage === tab.id ? 'active' : ''}`}
              onClick={() => onPageChange(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="nav-right">
        <span className="version">v0.1.0</span>
        <button 
          className="theme-toggle" 
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  );
};