import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DualListSelector } from '../components/DualListSelector';

export const SourcesPage = ({ onSave }) => {
  // Persist timeframe and feedType to localStorage
  const [timeframe, setTimeframe] = useLocalStorage('selectedTimeframe', '3');
  const [feedType, setFeedType] = useLocalStorage('selectedFeedType', 'iptv');
  const [selectedSources, setSelectedSources] = useLocalStorage('selectedSources', []);
  
  const [availableSources, setAvailableSources] = useState([]);
  const { call, loading, error } = useApi();
  
  // Notify parent component of selected sources
  useEffect(() => {
    onSave(selectedSources);
  }, [selectedSources, onSave]);
  
  // Load sources whenever timeframe or feedType changes
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
  
  // Load sources on component mount and when timeframe/feedType changes
  useEffect(() => {
    loadSources();
  }, [loadSources]);
  
  const saveSources = async () => {
    try {
      await call('/api/sources/select', {
        method: 'POST',
        body: JSON.stringify({ sources: selectedSources })
      });
      
      // Also save timeframe and feedType to backend settings
      await call('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify({
          selected_timeframe: timeframe,
          selected_feed_type: feedType
        })
      });
      
      alert('Sources and preferences saved');
    } catch (err) {
      alert('Error saving sources: ' + err.message);
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
            Feed Type: <strong style={{ color: '#60a5fa' }}>{feedType.toUpperCase()}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};