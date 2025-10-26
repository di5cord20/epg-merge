import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';

export const SourcesPage = ({ onSave }) => {
  const [availableSources, setAvailableSources] = useState([]);
  const [selectedSources, setSelectedSources] = useLocalStorage('selectedSources', []);
  const [timeframe, setTimeframe] = useState('3');
  const [feedType, setFeedType] = useState('iptv');
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
  
  // Note: loadSources is NOT called automatically to avoid timeout on page load
  // User must click "Refresh Files" button to load sources
  
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