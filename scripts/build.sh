#!/bin/bash
set -e

FRONTEND_DIR="/opt/epg-merge-app/frontend"
BACKEND_DIR="/opt/epg-merge-app/backend"

echo "🎬 Building EPG Merge React Frontend"
echo "===================================="
echo ""

cd "$FRONTEND_DIR"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf build node_modules
echo "✅ Cleaned"

# Step 1: Install dependencies
echo "[1/6] Installing Node dependencies..."
npm install --legacy-peer-deps -q 2>/dev/null || npm install --legacy-peer-deps
echo "✅ Dependencies installed"

# Step 2: Create App.js with complete implementation
echo "[2/6] Creating App component..."
cat > src/App.css << 'APP_JS_EOF'
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('sources');
  const [darkMode, setDarkMode] = useState(true);
  const [selectedSources, setSelectedSources] = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    
    if (!isDark) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    
    if (newMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  };

  return (
    <div className={`app ${!darkMode ? 'light-mode' : ''}`}>
      <nav className="navbar">
        <div className="nav-left">
          <h1>🎬 EPG Merge</h1>
          <div className="nav-links">
            <button className={`nav-link ${currentPage === 'sources' ? 'active' : ''}`} onClick={() => setCurrentPage('sources')}>📁 Sources</button>
            <button className={`nav-link ${currentPage === 'channels' ? 'active' : ''}`} onClick={() => setCurrentPage('channels')}>📺 Channels</button>
            <button className={`nav-link ${currentPage === 'merge' ? 'active' : ''}`} onClick={() => setCurrentPage('merge')}>⚡ Merge</button>
            <button className={`nav-link ${currentPage === 'archives' ? 'active' : ''}`} onClick={() => setCurrentPage('archives')}>📦 Archives</button>
            <button className={`nav-link ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => setCurrentPage('settings')}>⚙️ Settings</button>
          </div>
        </div>
        <div className="nav-right">
          <span className="version">v1.0.0</span>
          <button className="theme-toggle" onClick={toggleTheme}>{darkMode ? '🌙' : '☀️'}</button>
        </div>
      </nav>

      <main className="main-content">
        {currentPage === 'sources' && <SourcesPage onSave={setSelectedSources} />}
        {currentPage === 'channels' && <ChannelsPage selectedSources={selectedSources} />}
        {currentPage === 'merge' && <MergePage selectedSources={selectedSources} />}
        {currentPage === 'archives' && <ArchivesPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

function SourcesPage({ onSave }) {
  const [availableSources, setAvailableSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [timeframe, setTimeframe] = useState('3');
  const [feedType, setFeedType] = useState('iptv');
  const [loading, setLoading] = useState(false);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');

  const API_BASE = window.location.origin;

  useEffect(() => {
    const saved = localStorage.getItem('selectedSources');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSelectedSources(parsed);
      onSave(parsed);
    }
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sources/list?timeframe=${timeframe}&feed_type=${feedType}`);
      const data = await response.json();
      setAvailableSources(data.sources || []);
      setAvailableSearch('');
      setSelectedSearch('');
    } catch (err) {
      console.error('Error loading sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [timeframe, feedType]);

  const selectAll = () => {
    setSelectedSources(['FullGuide.xml.gz']);
  };

  const clearAll = () => {
    setSelectedSources([]);
  };

  const moveSource = (source, toSelected) => {
    if (toSelected && !selectedSources.includes(source)) {
      setSelectedSources(prev => [...prev, source]);
    } else if (!toSelected) {
      setSelectedSources(prev => prev.filter(s => s !== source));
    }
  };

  const filteredAvailable = availableSources
    .filter(s => !selectedSources.includes(s))
    .filter(s => s.toLowerCase().includes(availableSearch.toLowerCase()))
    .sort();

  const filteredSelected = selectedSources
    .filter(s => s.toLowerCase().includes(selectedSearch.toLowerCase()))
    .sort();

  const saveSources = async () => {
    localStorage.setItem('selectedSources', JSON.stringify(selectedSources));
    onSave(selectedSources);
    try {
      await fetch(`${API_BASE}/api/sources/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedSources })
      });
      alert('Sources saved');
    } catch (err) {
      console.error('Error saving sources:', err);
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
              <label className="radio-label">
                <input type="radio" name="timeframe" value="3" checked={timeframe === '3'} onChange={(e) => setTimeframe(e.target.value)} />
                3 days
              </label>
              <label className="radio-label">
                <input type="radio" name="timeframe" value="7" checked={timeframe === '7'} onChange={(e) => setTimeframe(e.target.value)} />
                7 days
              </label>
              <label className="radio-label">
                <input type="radio" name="timeframe" value="14" checked={timeframe === '14'} onChange={(e) => setTimeframe(e.target.value)} />
                14 days
              </label>
            </div>
          </div>

          <div className="config-group">
            <label>Feed Type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" name="feedtype" value="iptv" checked={feedType === 'iptv'} onChange={(e) => setFeedType(e.target.value)} />
                IPTV
              </label>
              <label className="radio-label">
                <input type="radio" name="feedtype" value="gracenote" checked={feedType === 'gracenote'} onChange={(e) => setFeedType(e.target.value)} />
                Gracenote
              </label>
            </div>
          </div>
        </div>

        <div className="button-group">
          <button className="btn btn-primary btn-lg" onClick={loadSources} disabled={loading}>
            🔄 Refresh Files
          </button>
        </div>

        <h3 style={{ marginTop: '30px' }}>Select Sources</h3>

        <div className="dual-list">
          <div className="list-container">
            <div className="list-header">Available Sources ({filteredAvailable.length})</div>
            <input
              type="text"
              className="input-field list-search"
              placeholder="Search..."
              value={availableSearch}
              onChange={(e) => setAvailableSearch(e.target.value)}
            />
            <div className="list-items">
              {filteredAvailable.map(source => (
                <div
                  key={source}
                  className="list-item"
                  onClick={() => moveSource(source, true)}
                >
                  {source}
                </div>
              ))}
            </div>
          </div>

          <div className="move-buttons">
            <button className="btn btn-primary move-btn" onClick={() => filteredAvailable.forEach(s => moveSource(s, true))}>⇒</button>
            <button className="btn btn-primary move-btn" onClick={() => filteredSelected.forEach(s => moveSource(s, false))}>⇐</button>
          </div>

          <div className="list-container">
            <div className="list-header">Selected Sources ({filteredSelected.length})</div>
            <input
              type="text"
              className="input-field list-search"
              placeholder="Search..."
              value={selectedSearch}
              onChange={(e) => setSelectedSearch(e.target.value)}
            />
            <div className="list-items">
              {filteredSelected.length === 0 ? (
                <div className="empty-state">No sources selected</div>
              ) : (
                filteredSelected.map(source => (
                  <div
                    key={source}
                    className="list-item selected"
                    onClick={() => moveSource(source, false)}
                  >
                    {source}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="button-group">
          <button className="btn btn-primary btn-lg" onClick={selectAll}>Select All (FullGuide)</button>
          <button className="btn btn-secondary btn-lg" onClick={clearAll}>Clear All</button>
          <button className="btn btn-success btn-lg" onClick={saveSources}>💾 Save Sources</button>
        </div>
      </div>
    </div>
  );
}

function ChannelsPage({ selectedSources }) {
  const [availableChannels, setAvailableChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = window.location.origin;

  useEffect(() => {
    const saved = localStorage.getItem('selectedChannels');
    if (saved) {
      setSelectedChannels(JSON.parse(saved));
    }
  }, []);

  const loadChannels = async () => {
    if (selectedSources.length === 0) {
      alert('Please select sources first');
      return;
    }

    setLoading(true);
    try {
      const timeframe = localStorage.getItem('merge_timeframe') || '3';
      const feedType = localStorage.getItem('merge_feed_type') || 'iptv';
      
      const response = await fetch(
        `${API_BASE}/api/channels/from-sources?sources=${selectedSources.join(',')}&timeframe=${timeframe}&feed_type=${feedType}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load channels');
      }
      
      const data = await response.json();
      const channels = data.channels || [];
      
      setAvailableChannels(channels);
      setAvailableSearch('');
      
      if (channels.length === 0) {
        alert('No channels found in selected sources');
      } else {
        alert(`Loaded ${channels.length} channels from ${selectedSources.length} source(s)`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error loading channels from sources: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveChannel = (channel, toSelected) => {
    if (toSelected && !selectedChannels.includes(channel)) {
      setSelectedChannels(prev => [...prev, channel]);
    } else if (!toSelected) {
      setSelectedChannels(prev => prev.filter(ch => ch !== channel));
    }
  };

  const moveAllChannels = (toSelected) => {
    if (toSelected) {
      const toAdd = availableChannels.filter(ch => !selectedChannels.includes(ch));
      setSelectedChannels(prev => [...prev, ...toAdd]);
    } else {
      setSelectedChannels([]);
    }
  };

  const filteredAvailable = availableChannels
    .filter(ch => !selectedChannels.includes(ch))
    .filter(ch => ch.toLowerCase().includes(availableSearch.toLowerCase()))
    .sort();

  const filteredSelected = selectedChannels
    .filter(ch => ch.toLowerCase().includes(selectedSearch.toLowerCase()))
    .sort();

  const saveChannels = async () => {
    localStorage.setItem('selectedChannels', JSON.stringify(selectedChannels));
    try {
      await fetch(`${API_BASE}/api/channels/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: selectedChannels })
      });
      alert(`Channels saved (${selectedChannels.length} selected)`);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="page-container">
      <h2>📺 Select Channels</h2>

      <div className="section">
        <button className="btn btn-primary" onClick={loadChannels} disabled={loading || selectedSources.length === 0}>
          {loading ? '⏳ Loading...' : `📥 Load from Sources (${selectedSources.length})`}
        </button>

        <h3 style={{ marginTop: '30px' }}>Select Channels</h3>

        <div className="dual-list">
          <div className="list-container">
            <div className="list-header">Available Channels ({filteredAvailable.length})</div>
            <input
              type="text"
              className="input-field list-search"
              placeholder="Search..."
              value={availableSearch}
              onChange={(e) => setAvailableSearch(e.target.value)}
            />
            <div className="list-items">
              {filteredAvailable.length === 0 && availableChannels.length === 0 ? (
                <div className="empty-state">Click "Load from Sources" to fetch channels</div>
              ) : (
                filteredAvailable.map(ch => (
                  <div key={ch} className="list-item" onClick={() => moveChannel(ch, true)}>
                    {ch}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="move-buttons">
            <button className="btn btn-primary move-btn" onClick={() => moveAllChannels(true)}>⇒⇒</button>
            <button className="btn btn-primary move-btn" onClick={() => moveAllChannels(false)}>⇐⇐</button>
          </div>

          <div className="list-container">
            <div className="list-header">Selected Channels ({filteredSelected.length})</div>
            <input
              type="text"
              className="input-field list-search"
              placeholder="Search..."
              value={selectedSearch}
              onChange={(e) => setSelectedSearch(e.target.value)}
            />
            <div className="list-items">
              {filteredSelected.length === 0 ? (
                <div className="empty-state">No channels selected</div>
              ) : (
                filteredSelected.map(ch => (
                  <div key={ch} className="list-item selected" onClick={() => moveChannel(ch, false)}>
                    {ch}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="button-group">
          <button className="btn btn-success btn-lg" onClick={saveChannels}>
            💾 Save Channels ({selectedChannels.length})
          </button>
        </div>
      </div>
    </div>
  );
}

function MergePage({ selectedSources }) {
  const [mergeLog, setMergeLog] = useState(() => {
    const saved = sessionStorage.getItem('mergeLog');
    return saved ? JSON.parse(saved) : ['Ready to merge...'];
  });
  const [mergeProgress, setMergeProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [mergeComplete, setMergeComplete] = useState(false);
  const [mergedFilename, setMergedFilename] = useState('');
  const [outputFilename, setOutputFilename] = useState('merged.xml.gz');
  const [timeframe, setTimeframe] = useState('3');
  const [feedType, setFeedType] = useState('iptv');

  const API_BASE = window.location.origin;

  useEffect(() => {
    const saved = localStorage.getItem('output_filename');
    if (saved) {
      setOutputFilename(saved);
    }
    const savedTimeframe = localStorage.getItem('merge_timeframe');
    if (savedTimeframe) {
      setTimeframe(savedTimeframe);
    }
    const savedFeedType = localStorage.getItem('merge_feed_type');
    if (savedFeedType) {
      setFeedType(savedFeedType);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('mergeLog', JSON.stringify(mergeLog));
  }, [mergeLog]);

  const addLog = (msg) => {
    setMergeLog(prev => [...prev, msg]);
  };

  const startMerge = async () => {
    if (selectedSources.length === 0) {
      alert('Please select sources first');
      return;
    }

    const selectedChannels = JSON.parse(localStorage.getItem('selectedChannels') || '[]');
    if (selectedChannels.length === 0) {
      alert('Please select channels first');
      return;
    }

    setMerging(true);
    setMergeComplete(false);
    setMergeLog(['🟢 Merge started...']);
    setMergeProgress(0);

    try {
      addLog(`📁 Sources: ${selectedSources.length}`);
      addLog(`📺 Channels: ${selectedChannels.length}`);
      addLog(`⏱️  Timeframe: ${timeframe} days`);
      addLog(`📡 Feed Type: ${feedType.toUpperCase()}`);
      addLog('');
      addLog('Downloading source files...');
      setMergeProgress(25);

      const response = await fetch(`${API_BASE}/api/merge/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: selectedSources,
          channels: selectedChannels,
          output_filename: outputFilename,
          timeframe: timeframe,
          feed_type: feedType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      addLog(`✅ Downloaded ${selectedSources.length} source files`);
      setMergeProgress(50);
      
      addLog(`📋 Filtering ${selectedChannels.length} channels`);
      addLog(`🔄 Processing and merging XML...`);
      setMergeProgress(75);
      
      addLog(`📝 Creating output file: ${outputFilename}`);
      setMergeProgress(90);
      
      addLog('');
      addLog(`✅ Merge complete!`);
      addLog(`📦 File: ${data.filename}`);
      addLog(`📊 Channels: ${data.channels_included}, Programs: ${data.programs_included}`);
      addLog(`📏 Size: ${data.file_size}`);
      
      setMergedFilename(data.filename);
      setMergeProgress(100);
      setMergeComplete(true);
      setMerging(false);
    } catch (err) {
      addLog('');
      addLog(`❌ Error: ${err.message}`);
      setMerging(false);
    }
  };

  const downloadMerged = () => {
    if (mergedFilename) {
      window.location.href = `${API_BASE}/api/archives/download/${mergedFilename}`;
    }
  };

  const clearLog = () => {
    setMergeLog(['Ready to merge...']);
    sessionStorage.removeItem('mergeLog');
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
          onClick={clearLog}
          style={{ marginLeft: '10px' }}
        >
          🗑 Clear Log
        </button>

        <div className="terminal">
          {mergeLog.map((line, i) => (
            <div key={i} className={`terminal-line ${
              line.includes('❌') ? 'error' : 
              line.includes('✅') ? 'success' : 
              line.includes('⚠️') ? 'warning' : ''
            }`}>
              {line}
            </div>
          ))}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${mergeProgress}%` }}>
            {mergeProgress}%
          </div>
        </div>

        {mergeComplete && (
          <div className="button-group">
            <button className="btn btn-success btn-lg" onClick={downloadMerged}>
              ⬇️ Download {mergedFilename}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ArchivesPage() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = window.location.origin;

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/archives/list`);
      const data = await response.json();
      setArchives(data.archives || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>📦 Archives</h2>

      <div className="section">
        <button className="btn btn-secondary" onClick={loadArchives} disabled={loading}>
          🔄 Load Archives
        </button>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Created</th>
                <th>Channels</th>
                <th>Programs</th>
                <th>Size</th>
                <th>Days Left</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {archives.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No archives yet</td></tr>
              ) : (
                archives.map(a => (
                  <tr key={a.filename}>
                    <td>{a.filename}</td>
                    <td>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>{a.channels}</td>
                    <td>{a.programs}</td>
                    <td>{a.size}</td>
                    <td className={a.days_left <= 5 ? 'warning' : ''}>{a.days_left}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => window.location.href = `${API_BASE}/api/archives/download/${a.filename}`}>
                        ⬇
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState({
    output_filename: 'merged.xml.gz',
    merge_schedule: 'daily',
    merge_time: '00:00',
    download_timeout: 60000,
    merge_timeout: 300000,
    channel_drop_threshold: 10,
    archive_retention: 30,
    discord_webhook: ''
  });
  const [saved, setSaved] = useState(false);

  const API_BASE = window.location.origin;

  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  const generateCron = () => {
    const [hours, minutes] = settings.merge_time.split(':');
    return `${minutes} ${hours} * * ${settings.merge_schedule === 'daily' ? '*' : '0'}`;
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
      
      await fetch(`${API_BASE}/api/settings/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="page-container">
      <h2>⚙️ Settings</h2>

      <div className="section">
        <div className="setting-group">
          <label>Output Filename</label>
          <input
            type="text"
            className="input-field"
            value={settings.output_filename}
            onChange={(e) => setSettings({ ...settings, output_filename: e.target.value })}
          />
        </div>

        <div className="setting-group">
          <label>Merge Schedule</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="schedule"
                value="daily"
                checked={settings.merge_schedule === 'daily'}
                onChange={(e) => setSettings({ ...settings, merge_schedule: e.target.value })}
              />
              Daily
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="schedule"
                value="weekly"
                checked={settings.merge_schedule === 'weekly'}
                onChange={(e) => setSettings({ ...settings, merge_schedule: e.target.value })}
              />
              Weekly
            </label>
          </div>
        </div>

        <div className="setting-group">
          <label>Merge Time (UTC)</label>
          <input
            type="time"
            className="input-field"
            value={settings.merge_time}
            onChange={(e) => setSettings({ ...settings, merge_time: e.target.value })}
          />
          <div className="helper-text">Cron: {generateCron()}</div>
        </div>

        <div className="setting-group">
          <label>XML Download Timeout (ms)</label>
          <input
            type="number"
            className="input-field"
            value={settings.download_timeout}
            onChange={(e) => setSettings({ ...settings, download_timeout: parseInt(e.target.value) })}
          />
          <div className="helper-text">{(settings.download_timeout / 1000).toFixed(1)}s</div>
        </div>

        <div className="setting-group">
          <label>Merge Process Timeout (ms)</label>
          <input
            type="number"
            className="input-field"
            value={settings.merge_timeout}
            onChange={(e) => setSettings({ ...settings, merge_timeout: parseInt(e.target.value) })}
          />
          <div className="helper-text">{(settings.merge_timeout / 1000).toFixed(1)}s</div>
        </div>

        <div className="setting-group">
          <label>Channel Drop Threshold (%)</label>
          <input
            type="number"
            className="input-field"
            value={settings.channel_drop_threshold}
            min="0"
            max="100"
            onChange={(e) => setSettings({ ...settings, channel_drop_threshold: parseInt(e.target.value) })}
          />
        </div>

        <div className="setting-group">
          <label>Archive Retention (days)</label>
          <input
            type="number"
            className="input-field"
            value={settings.archive_retention}
            min="1"
            onChange={(e) => setSettings({ ...settings, archive_retention: parseInt(e.target.value) })}
          />
        </div>

        <div className="setting-group">
          <label>Discord Webhook (optional)</label>
          <input
            type="text"
            className="input-field"
            value={settings.discord_webhook}
            placeholder="https://discord.com/api/webhooks/..."
            onChange={(e) => setSettings({ ...settings, discord_webhook: e.target.value })}
          />
        </div>

        <div className="button-group">
          <button className="btn btn-primary btn-lg" onClick={saveSettings}>
            💾 Save Settings
          </button>
        </div>

        {saved && (
          <div style={{ color: '#86efac', marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
            ✅ Settings saved successfully
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
APP_JS_EOF

# Step 3: Create comprehensive CSS
echo "[3/6] Creating styles..."
cat > src/App.css << 'APP_CSS_EOF'
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

body.light-mode { background: #f8fafc; color: #1e293b; }

.app { display: flex; flex-direction: column; min-height: 100vh; }

.navbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 30px; height: 70px;
  background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

body.light-mode .navbar { background: linear-gradient(135deg, #3b82f6, #dbeafe); }

.navbar h1 { font-size: 24px; font-weight: 700; color: white; }

.nav-left { display: flex; align-items: center; gap: 40px; }
.nav-links { display: flex; gap: 5px; flex-wrap: wrap; }

.nav-link {
  background: transparent; border: none; color: #e0e7ff;
  padding: 8px 16px; border-radius: 6px; cursor: pointer;
  font-weight: 500; transition: all 0.2s;
}

body.light-mode .nav-link { color: #1e40af; }
.nav-link:hover { background: rgba(255, 255, 255, 0.1); }
.nav-link.active { background: #3b82f6; color: white; }

.nav-right { display: flex; align-items: center; gap: 20px; }
.version { font-size: 12px; opacity: 0.7; }

.theme-toggle {
  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
  color: white; width: 40px; height: 40px; border-radius: 6px; cursor: pointer; font-size: 18px;
}

.main-content { flex: 1; overflow-y: auto; padding: 30px; }
.page-container { max-width: 1200px; margin: 0 auto; }

h2 { font-size: 28px; margin-bottom: 25px; font-weight: 700; }
h3 { font-size: 18px; font-weight: 600; margin-bottom: 15px; }

.section {
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px; padding: 25px; margin-bottom: 25px;
}

body.light-mode .section { background: #ffffff; border-color: #e0e7ff; }

.config-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
.config-group { display: flex; flex-direction: column; }
.config-group label { font-weight: 600; margin-bottom: 10px; }

.input-field, select {
  padding: 12px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px;
  background: rgba(255, 255, 255, 0.05); color: inherit; font-size: 14px;
}

.input-field:focus, select:focus { outline: none; border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

.radio-group { display: flex; gap: 20px; flex-wrap: wrap; }
.radio-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; }

.btn {
  padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;
  font-weight: 600; font-size: 14px; transition: all 0.2s;
  display: inline-flex; align-items: center; gap: 8px;
}

.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover:not(:disabled) { background: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

.btn-secondary {
  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: inherit;
}
.btn-secondary:hover:not(:disabled) { background: rgba(255, 255, 255, 0.15); }

.btn-success { background: #10b981; color: white; }
.btn-success:hover:not(:disabled) { background: #059669; }

.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }

.btn-lg { padding: 14px 28px; font-size: 16px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.button-group { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 15px; }

.dual-list {
  display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; margin: 20px 0;
}

.list-container {
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px; padding: 15px; display: flex; flex-direction: column;
}

body.light-mode .list-container { background: #f8fafc; border-color: #e0e7ff; }

.list-header { font-weight: 600; margin-bottom: 10px; }
.list-search { margin-bottom: 10px; }
.list-items { flex: 1; overflow-y: auto; max-height: 400px; }

.list-item {
  padding: 10px; background: rgba(255, 255, 255, 0.03);
  border-radius: 4px; margin-bottom: 4px; cursor: pointer;
  font-size: 13px; user-select: none; transition: all 0.2s;
}

.list-item:hover { background: rgba(59, 130, 246, 0.1); }
.list-item.selected {
  background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #86efac;
}

.empty-state { text-align: center; padding: 40px 20px; opacity: 0.6; }

.move-buttons {
  display: flex; flex-direction: column; justify-content: center; gap: 10px;
}

.move-btn { padding: 12px; font-size: 18px; min-width: 50px; }

.terminal {
  background: #0a0e27; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px; padding: 15px; font-family: 'Courier New', monospace;
  font-size: 13px; line-height: 1.6; max-height: 400px; overflow-y: auto;
  margin-bottom: 20px; color: #00ff00;
}

.terminal-line { margin: 4px 0; }
.terminal-line.error { color: #ff4444; }
.terminal-line.warning { color: #ffaa00; }
.terminal-line.success { color: #44ff44; }

.progress-bar {
  width: 100%; height: 24px; background: rgba(255, 255, 255, 0.1);
  border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: 20px;
}

.progress-fill {
  height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 12px;
  transition: width 0.3s ease; width: 0%;
}

.table-container { overflow-x: auto; margin-top: 15px; }
table {
  width: 100%; border-collapse: collapse; font-size: 14px;
}

th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
th { background: rgba(255, 255, 255, 0.05); font-weight: 600; }

tbody tr:hover { background: rgba(59, 130, 246, 0.05); }

.warning { color: #f59e0b; }

.setting-group { margin-bottom: 25px; }
.setting-group label { display: block; font-weight: 600; margin-bottom: 10px; }
.helper-text { font-size: 12px; color: #94a3b8; margin-top: 5px; }

@media (max-width: 1024px) {
  .config-row { grid-template-columns: 1fr; }
  .dual-list { grid-template-columns: 1fr; }
  .move-buttons { flex-direction: row; }
}
APP_CSS_EOF

echo "✅ Styles created"

# Step 4: Build React
echo "[4/6] Building React application..."
npm run build
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo "❌ Build failed with status $BUILD_STATUS"
  exit 1
fi

if [ ! -d "build" ]; then
  echo "❌ Build directory not created!"
  exit 1
fi

BUILD_FILES=$(find build -type f | wc -l)
echo "✅ Build complete - $BUILD_FILES files generated"

# Step 5: Deploy to backend
echo "[5/6] Deploying to backend..."
rm -rf "$BACKEND_DIR/static"
mv "$FRONTEND_DIR/build" "$BACKEND_DIR/static"

# Fix nested static folder if it exists
if [ -d "$BACKEND_DIR/static/static" ]; then
  mv "$BACKEND_DIR/static/static"/* "$BACKEND_DIR/static/" || true
  rmdir "$BACKEND_DIR/static/static" 2>/dev/null || true
fi

STATIC_FILES=$(find "$BACKEND_DIR/static" -type f | wc -l)
echo "✅ Deployed $STATIC_FILES files"

echo "[6/6] Restarting service..."
systemctl restart epg-merge
sleep 3

if systemctl is-active --quiet epg-merge; then
  echo "✅ Service restarted"
else
  echo "❌ Service failed to restart"
  journalctl -u epg-merge -n 10
  exit 1
fi

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✅ Frontend build complete!"
echo "Access: http://$SERVER_IP:9193"