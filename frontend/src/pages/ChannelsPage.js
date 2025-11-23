import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';

/**
 * Channels page component - v0.4.8
 * Allows users to select channels from loaded sources
 * Features export/import of channel backups and save with versioning
 * 
 * @param {Array} selectedSources - Sources selected on previous page
 * @returns {React.ReactElement} Channels page component
 */
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
      // Save to backend with archive/versioning logic
      const data = await call('/api/channels/save', {
        method: 'POST',
        body: JSON.stringify({ 
          channels: selectedChannels,
          sources_count: selectedSources.length
        })
      });
      alert(`Channels saved (${selectedChannels.length} selected, ${selectedSources.length} sources)`);
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
        alert(`Imported ${channels.length} channels`);
      } catch (err) {
        alert('Error importing channels: ' + err.message);
      }
    };
    input.click();
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
        </div>
      </div>
    </div>
  );
};