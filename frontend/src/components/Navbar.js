import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'sources', label: 'Sources', icon: '📁' },
  { id: 'channels', label: 'Channels', icon: '📺' },
  { id: 'merge', label: 'Merge', icon: '⚡' },
  { id: 'archives', label: 'Archives', icon: '📦' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

/**
 * Navigation bar component - v0.3.7
 * Displays app title, navigation tabs, theme toggle, and version from API
 * 
 * @param {string} currentPage - Currently active page
 * @param {function} onPageChange - Callback when page changes
 * @param {function} onThemeToggle - Callback when theme toggled
 * @param {boolean} darkMode - Current theme mode
 * @returns {React.ReactElement} Navbar component
 */
export const Navbar = ({ currentPage, onPageChange, onThemeToggle, darkMode }) => {
  const [version, setVersion] = useState('0.3.7');

  // Fetch version from API on mount
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          if (data.version) {
            setVersion(data.version);
          }
        }
      } catch (err) {
        console.warn('Could not fetch version from API:', err);
        // Falls back to default version
      }
    };

    fetchVersion();
  }, []);

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
        <span className="version">v{version}</span>
        {/* Theme toggle - disabled for v0.3.7, re-add when light mode is redesigned */}
        {/* <button 
          className="theme-toggle" 
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          {darkMode ? '🌙' : '☀️'}
        </button> */}
      </div>
    </nav>
  );
};