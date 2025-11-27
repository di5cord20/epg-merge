import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';
import { SaveDialog } from '../components/SaveDialog';

/**
 * ChannelsPage - v0.5.0
 * Allows users to select channels from loaded sources
 * Features export/import of channel backups and save with versioning
 * UPDATED: Uses new SaveDialog component for custom filename selection
 */
export const ChannelsPage = ({ selectedSources }) => {
  const [availableChannels, setAvailableChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useLocalStorage('selectedChannels', []);
  const [channelVersions, setChannelVersions] = useState([]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loadedFromDisk, setLoadedFromDisk] = useState(null);
  const [defaultChannelsFilename, setDefaultChannelsFilename] = useState('channels.json');
  const { call, loading, error } = useApi();
  
  // Load available channel versions for "Load from Disk" modal and Save dialog
  const loadChannelVersions = async () => {
    try {
      const data = await call('/api/channels/versions');
      if (data.versions) {
        setChannelVersions(data.versions);
      }
    } catch (err) {
      console.error('Error loading channel versions:', err);
    }
  };

  // Load channel versions and default filename when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await call('/api/settings/get');
        if (settings.channels_filename) {
          setDefaultChannelsFilename(settings.channels_filename);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
    loadChannelVersions();
  }, []);
  
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
      setLoadedFromDisk(null);
      if (data.channels?.length === 0) {
        alert('No channels found');
      }
    } catch (err) {
      alert('Error loading channels: ' + err.message);
    }
  };
  
  const handleSaveClick = () => {
    // Open save dialog when user clicks Save button
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async (filename) => {
    try {
      // Save to backend with archive/versioning logic
      const data = await call('/api/channels/save', {
        method: 'POST',
        body: JSON.stringify({ 
          channels: selectedChannels,
          sources_count: selectedSources.length,
          filename: filename
        })
      });
      setShowSaveDialog(false);
      alert(`✅ Channels saved!\n${selectedChannels.length} selected (${selectedSources.length} sources)\nFile: ${filename}`);
      // Refresh channel versions after save
      loadChannelVersions();
    } catch (err) {
      alert('Error saving channels: ' + err.message);
    }
  };
  
  const exportChannels = async () => {
    try {
      const data = await call('/api/channels/export', {
        method: 'POST'
      });
      
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data.data, null, 2)));
      element.setAttribute('download', data.filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      alert('Error exporting channels: ' + err.message);
    }
  };
  
  const importChannels = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const channels = data.channels || [];
        await call('/api/channels/import', {
          method: 'POST',
          body: JSON.stringify({ channels })
        });
        setSelectedChannels(channels);
        setLoadedFromDisk(null);
        alert(`Imported ${channels.length} channels`);
      } catch (err) {
        alert('Error importing channels: ' + err.message);
      }
    };
    input.click();
  };

  // Load channels from saved disk version
  const loadFromDisk = async (filename) => {
    try {
      const data = await call('/api/channels/load-from-disk', {
        method: 'POST',
        body: JSON.stringify({ filename })
      });
      
      const channels = data.channels || [];
      setSelectedChannels(channels);
      setLoadedFromDisk(filename);
      setShowLoadModal(false);
      alert(`Loaded ${channels.length} channels from ${filename}`);
    } catch (err) {
      alert('Error loading channels: ' + err.message);
    }
  };
  
  return (
    <div className="page-container">
      <h2>🔺 Select Channels</h2>
      
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
          available={availableChannels}
          selected={selectedChannels}
          onSelectionChange={setSelectedChannels}
          title="Channels"
        />
        
        <div className="button-group">
          <button 
            className="btn btn-success btn-lg"
            onClick={handleSaveClick}
          >
            💾 Save Channels ({selectedChannels.length})
          </button>
          <button 
            className="btn btn-secondary"
            onClick={exportChannels}
          >
            ⬇️ Export Channels
          </button>
          <button 
            className="btn btn-secondary"
            onClick={importChannels}
          >
            ⬆️ Import Channels
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowLoadModal(true)}
          >
            💿 Load from Disk
          </button>
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
              📁 Load Channels from Disk
            </h3>
            
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
              Select a saved channel version to load:
            </p>

            {channelVersions.length === 0 ? (
              <div style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                color: '#94a3b8',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                No saved channel versions found
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {channelVersions.map(version => (
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
                      {version.channels_count} channels • {new Date(version.created_at).toLocaleString()}
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
          type="channels"
          versions={channelVersions}
          defaultFilename={defaultChannelsFilename}
          onSave={handleSaveConfirm}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
};