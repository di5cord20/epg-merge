import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';
import { SaveDialog } from '../components/SaveDialog';

/**
 * SourcesPage - v0.5.0
 * Allows users to select sources from available options
 * Features: custom filename selection on save, load from disk, versioning
 */
export const SourcesPage = ({ onSave }) => {
  const [timeframe, setTimeframe] = useLocalStorage('selectedTimeframe', '3');
  const [feedType, setFeedType] = useLocalStorage('selectedFeedType', 'iptv');
  const [selectedSources, setSelectedSources] = useLocalStorage('selectedSources', []);
  
  const [availableSources, setAvailableSources] = useState([]);
  const [sourceVersions, setSourceVersions] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadedFromDisk, setLoadedFromDisk] = useState(null);
  const [defaultSourcesFilename, setDefaultSourcesFilename] = useState('sources.json');
  const { call, loading, error } = useApi();
  
  useEffect(() => {
    onSave(selectedSources);
  }, [selectedSources, onSave]);
  
  const loadSources = useCallback(async () => {
    try {
      const data = await call(
        `/api/sources/list?timeframe=${timeframe}&feed_type=${feedType}`
      );
      setAvailableSources(data.sources || []);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  }, [timeframe, feedType, call]);
  
  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Load default filename and source versions from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await call('/api/settings/get');
        if (settings.sources_filename) {
          setDefaultSourcesFilename(settings.sources_filename);
        }
        // Load source versions for the dialog
        loadSourceVersions();
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, [call]);

  // Load available source versions for the save dialog
  const loadSourceVersions = async () => {
    try {
      const data = await call('/api/sources/versions');
      if (data.versions) {
        setSourceVersions(data.versions);
      }
    } catch (err) {
      console.error('Error loading source versions:', err);
    }
  };
  
  const handleSaveClick = () => {
    // Open save dialog when user clicks Save button
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async (filename) => {
    if (selectedSources.length === 0) {
      alert('Please select at least one source');
      return;
    }

    try {
      // Save to backend with custom filename
      const data = await call('/api/sources/save', {
        method: 'POST',
        body: JSON.stringify({ 
          sources: selectedSources,
          timeframe: timeframe,
          feed_type: feedType,
          filename: filename
        })
      });
      
      // Also save to settings for automated merge
      await call('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify({
          selected_sources: selectedSources,
          selected_timeframe: timeframe,
          selected_feed_type: feedType
        })
      });
      
      setShowSaveDialog(false);
      alert(`✅ Sources saved!\n${selectedSources.length} source(s) selected\nFile: ${filename}`);
      // Refresh source versions after save
      loadSourceVersions();
    } catch (err) {
      alert('Error saving sources: ' + err.message);
    }
  };

  // Load sources from saved disk version
  const loadFromDisk = async (filename) => {
    try {
      const data = await call('/api/sources/load-from-disk', {
        method: 'POST',
        body: JSON.stringify({ filename })
      });
      
      const sources = data.sources || [];
      setSelectedSources(sources);
      setLoadedFromDisk(filename);
      setShowLoadModal(false);
      alert(`Loaded ${sources.length} sources from ${filename}`);
    } catch (err) {
      alert('Error loading sources: ' + err.message);
    }
  };
  
  return (
    <div className="page-container">
      <h2>📁 Select Sources</h2>
      
      <div className="section">
        {/* Feed Type Description Section */}
        <div style={{
          marginBottom: '25px',
          padding: '14px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#cbd5e1'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#60a5fa' }}>📖 Feed Format Guide:</strong>
          </div>
          <div style={{ marginLeft: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#a5f3fc' }}>IPTV:</strong> Channel identifiers use <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px' }}>channelname.countrycode</code> format. Best for matching to tvg-id in M3U playlists. Updated once daily in afternoon for 3/7-day feeds, or three times daily (Overnight, Morning, Evening) for 14-day feed.
            </div>
            <div>
              <strong style={{ color: '#a5f3fc' }}>Gracenote:</strong> Channel identifiers match Gracenote IDs directly. Use this if you have Gracenote IDs in your channel profile (Dispatcharr) or obtained via Channel Identifiarr. Updated once daily in afternoon for 3/7-day feeds, or three times daily (Overnight, Morning, Evening) for 14-day feed.
            </div>
          </div>
        </div>
        
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
        
        {/* Show currently loaded source */}
        {loadedFromDisk && (
          <div style={{
            marginBottom: '15px',
            padding: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#60a5fa'
          }}>
            📁 Currently loaded from: <strong>{loadedFromDisk}</strong>
          </div>
        )}
        
        <DualListSelector
          available={availableSources}
          selected={selectedSources}
          onSelectionChange={setSelectedSources}
          title="Sources"
        />
        
        <div className="button-group">
          <button 
            className="btn btn-secondary btn-lg"
            onClick={() => setSelectedSources(availableSources)}
          >
            Select All
          </button>
          <button 
            className="btn btn-secondary btn-lg"
            onClick={() => setSelectedSources([])}
          >
            Clear All
          </button>
          <button 
            className="btn btn-success btn-lg"
            onClick={handleSaveClick}
            disabled={selectedSources.length === 0}
          >
            💾 Save Sources ({selectedSources.length})
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowLoadModal(true)}
          >
            💿 Load from Disk
          </button>
        </div>

        {/* Info box showing current preferences */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          <strong style={{ color: '#cbd5e1' }}>Current Preferences:</strong>
          <div style={{ marginTop: '6px' }}>
            Timeframe: <strong style={{ color: '#60a5fa' }}>{timeframe} days</strong> | 
            Feed Type: <strong style={{ color: '#60a5fa' }}>{feedType.toUpperCase()}</strong> | 
            Selected: <strong style={{ color: '#60a5fa' }}>{selectedSources.length} source(s)</strong>
          </div>
          {selectedSources.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
              <strong>Sources:</strong> {selectedSources.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Load from Disk Modal */}
      {showLoadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#e2e8f0' }}>
              📁 Load Sources from Disk
            </h3>
            
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
              Select a saved sources version to load:
            </p>

            {sourceVersions.length === 0 ? (
              <div style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                color: '#94a3b8',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                No saved sources versions found
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {sourceVersions.map(version => (
                  <div
                    key={version.filename}
                    onClick={() => loadFromDisk(version.filename)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    <div style={{ color: '#60a5fa', fontWeight: '600', marginBottom: '4px' }}>
                      {version.is_current && '📌 '}
                      {version.filename}
                      {version.is_current && ' (Current)'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {version.sources_count} sources • {new Date(version.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowLoadModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveDialog
          type="sources"
          versions={sourceVersions}
          defaultFilename={defaultSourcesFilename}
          onSave={handleSaveConfirm}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
};