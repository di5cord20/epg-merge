// ============================================================================
// REFACTORED FRONTEND ARCHITECTURE
// Split monolithic App.js into reusable components
// ============================================================================

// 1. HOOKS - Custom hooks for reusable logic

// hooks/useApi.js
import { useState, useCallback } from 'react';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const call = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${window.location.origin}${endpoint}`,
        {
          headers: { 'Content-Type': 'application/json' },
          ...options
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { call, loading, error };
};

// hooks/useLocalStorage.js
import { useState, useEffect } from 'react';

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.error(`Error reading localStorage[${key}]:`, err);
      return initialValue;
    }
  });
  
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(`Error writing to localStorage[${key}]:`, err);
    }
  };
  
  return [storedValue, setValue];
};

// hooks/useTheme.js
import { useLocalStorage } from './useLocalStorage';
import { useEffect } from 'react';

export const useTheme = () => {
  const [darkMode, setDarkMode] = useLocalStorage('theme_mode', true);
  
  useEffect(() => {
    const isDark = darkMode === true || darkMode === 'dark';
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [darkMode]);
  
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };
  
  return { darkMode, toggleTheme };
};

// ============================================================================
// 2. COMPONENTS - Reusable UI components

// components/Navbar.js
import React from 'react';

const TABS = [
  { id: 'sources', label: 'Sources', icon: '📁' },
  { id: 'channels', label: 'Channels', icon: '📺' },
  { id: 'merge', label: 'Merge', icon: '⚡' },
  { id: 'archives', label: 'Archives', icon: '📦' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export const Navbar = ({ currentPage, onPageChange, onThemeToggle, darkMode }) => {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <h1>🎬 EPG Merge</h1>
        <div className="nav-links">
          {TABS.map(tab => (
            <button
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

// components/LoadingSpinner.js
export const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="spinner">
    <div className="spinner-icon">⏳</div>
    <p>{message}</p>
  </div>
);

// components/ErrorBoundary.js
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error("Error caught:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>❌ Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// components/DualListSelector.js
import React, { useState } from 'react';

export const DualListSelector = ({ 
  available = [], 
  selected = [], 
  onSelectionChange,
  title = "Items"
}) => {
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  
  const filteredAvailable = available
    .filter(item => !selected.includes(item))
    .filter(item => item.toLowerCase().includes(availableSearch.toLowerCase()))
    .sort();
  
  const filteredSelected = selected
    .filter(item => item.toLowerCase().includes(selectedSearch.toLowerCase()))
    .sort();
  
  const moveItem = (item, toSelected) => {
    let newSelected;
    if (toSelected && !selected.includes(item)) {
      newSelected = [...selected, item];
    } else if (!toSelected) {
      newSelected = selected.filter(i => i !== item);
    } else {
      return;
    }
    onSelectionChange(newSelected);
  };
  
  const moveAll = (toSelected) => {
    if (toSelected) {
      const toAdd = available.filter(i => !selected.includes(i));
      onSelectionChange([...selected, ...toAdd]);
    } else {
      onSelectionChange([]);
    }
  };
  
  return (
    <div className="dual-list">
      <div className="list-container">
        <div className="list-header">
          Available {title} ({filteredAvailable.length})
        </div>
        <input
          type="text"
          className="input-field list-search"
          placeholder="Search..."
          value={availableSearch}
          onChange={(e) => setAvailableSearch(e.target.value)}
        />
        <div className="list-items">
          {filteredAvailable.length === 0 && available.length === 0 ? (
            <div className="empty-state">No items available</div>
          ) : (
            filteredAvailable.map(item => (
              <div
                key={item}
                className="list-item"
                onClick={() => moveItem(item, true)}
              >
                {item}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="move-buttons">
        <button 
          className="btn btn-primary move-btn" 
          onClick={() => moveAll(true)}
        >
          ⇒⇒
        </button>
        <button 
          className="btn btn-primary move-btn" 
          onClick={() => moveAll(false)}
        >
          ⇐⇐
        </button>
      </div>
      
      <div className="list-container">
        <div className="list-header">
          Selected {title} ({filteredSelected.length})
        </div>
        <input
          type="text"
          className="input-field list-search"
          placeholder="Search..."
          value={selectedSearch}
          onChange={(e) => setSelectedSearch(e.target.value)}
        />
        <div className="list-items">
          {filteredSelected.length === 0 ? (
            <div className="empty-state">No items selected</div>
          ) : (
            filteredSelected.map(item => (
              <div
                key={item}
                className="list-item selected"
                onClick={() => moveItem(item, false)}
              >
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// components/Terminal.js
import React, { useEffect, useRef } from 'react';

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

// components/ProgressBar.js
export const ProgressBar = ({ progress = 0, showLabel = true }) => (
  <div className="progress-bar">
    <div className="progress-fill" style={{ width: `${progress}%` }}>
      {showLabel && <span>{progress}%</span>}
    </div>
  </div>
);

// ============================================================================
// 3. PAGES - Page components

// pages/SourcesPage.js
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const SourcesPage = ({ onSave }) => {
  const [availableSources, setAvailableSources] = useState([]);
  const [selectedSources, setSelectedSources] = useLocalStorage('selectedSources', []);
  const [timeframe, setTimeframe] = useState('3');
  const [feedType, setFeedType] = useState('iptv');
  const { call, loading, error } = useApi();
  
  useEffect(() => {
    onSave(selectedSources);
  }, [selectedSources, onSave]);
  
  const loadSources = async () => {
    try {
      const data = await call(
        `/api/sources/list?timeframe=${timeframe}&feed_type=${feedType}`
      );
      setAvailableSources(data.sources || []);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  };
  
  useEffect(() => {
    loadSources();
  }, [timeframe, feedType]);
  
  const saveSources = async () => {
    try {
      await call('/api/sources/select', {
        method: 'POST',
        body: JSON.stringify({ sources: selectedSources })
      });
      alert('Sources saved');
    } catch (err) {
      alert('Error saving sources: ' + err.message);
    }
  };
  
  return (
    <div className="page-container">
      <h2>📁 Select Sources</h2>
      
      <div className="section">
        <div className="config-row">
          <div className="config-group">
            <label>Timeframe</label>
            <div className="radio-group">
              {['3', '7', '14'].map(val => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    value={val}
                    checked={timeframe === val}
                    onChange={(e) => setTimeframe(e.target.value)}
                  />
                  {val} days
                </label>
              ))}
            </div>
          </div>
          
          <div className="config-group">
            <label>Feed Type</label>
            <div className="radio-group">
              {['iptv', 'gracenote'].map(val => (
                <label key={val} className="radio-label">
                  <input
                    type="radio"
                    value={val}
                    checked={feedType === val}
                    onChange={(e) => setFeedType(e.target.value)}
                  />
                  {val.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="button-group">
          <button 
            className="btn btn-primary btn-lg" 
            onClick={loadSources} 
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh Files'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <h3 style={{ marginTop: '30px' }}>Select Sources</h3>
        
        <DualListSelector
          available={availableSources}
          selected={selectedSources}
          onSelectionChange={setSelectedSources}
          title="Sources"
        />
        
        <div className="button-group">
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => setSelectedSources(['FullGuide.xml.gz'])}
          >
            Select All (FullGuide)
          </button>
          <button 
            className="btn btn-secondary btn-lg"
            onClick={() => setSelectedSources([])}
          >
            Clear All
          </button>
          <button 
            className="btn btn-success btn-lg"
            onClick={saveSources}
          >
            💾 Save Sources
          </button>
        </div>
      </div>
    </div>
  );
};

// pages/ChannelsPage.js
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';

export const ChannelsPage = ({ selectedSources }) => {
  const [availableChannels, setAvailableChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useLocalStorage('selectedChannels', []);
  const { call, loading, error } = useApi();
  
  const loadChannels = async () => {
    if (selectedSources.length === 0) {
      alert('Please select sources first');
      return;
    }
    
    try {
      const data = await call(
        `/api/channels/from-sources?sources=${selectedSources.join(',')}`
      );
      setAvailableChannels(data.channels || []);
      if (data.channels?.length === 0) {
        alert('No channels found');
      }
    } catch (err) {
      alert('Error loading channels: ' + err.message);
    }
  };
  
  const saveChannels = async () => {
    try {
      await call('/api/channels/select', {
        method: 'POST',
        body: JSON.stringify({ channels: selectedChannels })
      });
      alert(`Channels saved (${selectedChannels.length} selected)`);
    } catch (err) {
      alert('Error saving channels: ' + err.message);
    }
  };
  
  return (
    <div className="page-container">
      <h2>📺 Select Channels</h2>
      
      <div className="section">
        <button 
          className="btn btn-primary" 
          onClick={loadChannels}
          disabled={loading || selectedSources.length === 0}
        >
          {loading ? '⏳ Loading...' : `📥 Load from Sources (${selectedSources.length})`}
        </button>
        
        {error && <div className="error-message">{error}</div>}
        
        <h3 style={{ marginTop: '30px' }}>Select Channels</h3>
        
        <DualListSelector
          available={availableChannels}
          selected={selectedChannels}
          onSelectionChange={setSelectedChannels}
          title="Channels"
        />
        
        <div className="button-group">
          <button 
            className="btn btn-success btn-lg"
            onClick={saveChannels}
          >
            💾 Save Channels ({selectedChannels.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// pages/MergePage.js
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Terminal } from '../components/Terminal';
import { ProgressBar } from '../components/ProgressBar';

export const MergePage = ({ selectedSources }) => {
  const [logs, setLogs] = useState(['Ready to merge...']);
  const [progress, setProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [mergeComplete, setMergeComplete] = useState(false);
  const [mergedFilename, setMergedFilename] = useState('');
  const { call } = useApi();
  
  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
  };
  
  const startMerge = async () => {
    if (selectedSources.length === 0) {
      alert('Please select sources first');
      return;
    }
    
    const channels = JSON.parse(localStorage.getItem('selectedChannels') || '[]');
    if (channels.length === 0) {
      alert('Please select channels first');
      return;
    }
    
    setMerging(true);
    setMergeComplete(false);
    setLogs(['🟢 Merge started...']);
    setProgress(0);
    
    try {
      addLog(`📁 Sources: ${selectedSources.length}`);
      addLog(`📺 Channels: ${channels.length}`);
      setProgress(25);
      
      const data = await call('/api/merge/execute', {
        method: 'POST',
        body: JSON.stringify({
          sources: selectedSources,
          channels: channels,
          output_filename: 'merged.xml.gz'
        })
      });
      
      setProgress(75);
      addLog('');
      addLog(`✅ Merge complete!`);
      addLog(`📦 File: ${data.filename}`);
      addLog(`📊 Channels: ${data.channels_included}, Programs: ${data.programs_included}`);
      addLog(`📏 Size: ${data.file_size}`);
      
      setMergedFilename(data.filename);
      setProgress(100);
      setMergeComplete(true);
    } catch (err) {
      addLog('');
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setMerging(false);
    }
  };
  
  const downloadMerged = () => {
    if (mergedFilename) {
      window.location.href = `${window.location.origin}/api/archives/download/${mergedFilename}`;
    }
  };
  
  return (
    <div className="page-container">
      <h2>⚡ Execute Merge</h2>
      
      <div className="section">
        <button 
          className="btn btn-primary btn-lg"
          onClick={startMerge}
          disabled={merging || selectedSources.length === 0}
        >
          {merging ? '⏳ Merging...' : '▶ Start Merge'}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => setLogs(['Ready to merge...'])}
          style={{ marginLeft: '10px' }}
        >
          🗑 Clear Log
        </button>
        
        <Terminal logs={logs} />
        <ProgressBar progress={progress} />
        
        {mergeComplete && (
          <div className="button-group">
            <button 
              className="btn btn-success btn-lg"
              onClick={downloadMerged}
            >
              ⬇️ Download {mergedFilename}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN APP - Refactored
// src/App.js

import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { useTheme } from './hooks/useTheme';
import { SourcesPage } from './pages/SourcesPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { MergePage } from './pages/MergePage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('sources');
  const [selectedSources, setSelectedSources] = useState([]);
  const { darkMode, toggleTheme } = useTheme();
  
  const renderPage = () => {
    switch(currentPage) {
      case 'sources':
        return <SourcesPage onSave={setSelectedSources} />;
      case 'channels':
        return <ChannelsPage selectedSources={selectedSources} />;
      case 'merge':
        return <MergePage selectedSources={selectedSources} />;
      case 'archives':
        return <div>Archives coming soon...</div>;
      case 'settings':
        return <div>Settings coming soon...</div>;
      default:
        return null;
    }
  };
  
  return (
    <ErrorBoundary>
      <div className={`app ${!darkMode ? 'light-mode' : ''}`}>
        <Navbar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onThemeToggle={toggleTheme}
          darkMode={darkMode}
        />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;key={tab.id}
              className={`nav-link ${currentPage === tab.id ? 'active' : ''}`}
              onClick={() => onPageChange(tab.id)}
            >