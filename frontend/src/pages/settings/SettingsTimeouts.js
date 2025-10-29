import React from 'react';
import { Save } from 'lucide-react';

/**
 * SettingsTimeouts Component - v0.4.2
 * Manages download and merge timeout settings
 */
export const SettingsTimeouts = ({ settings, onSettingChange, savedPanel, onSave }) => {
  const panelContainerStyle = {
    padding: '25px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    marginBottom: '40px'
  };

  const panelHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const sectionStyle = {
    marginBottom: '25px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px'
  };

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '25px',
    marginBottom: '20px'
  };

  const inputFieldStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'inherit',
    marginBottom: '6px',
    boxSizing: 'border-box'
  };

  const helperTextStyle = {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '8px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  return (
    <div style={panelContainerStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={{ margin: 0 }}>⏱️ Timeouts</h2>
        <button onClick={() => onSave('timeouts')} style={buttonStyle}>
          <Save size={16} /> Save
        </button>
      </div>

      {savedPanel === 'timeouts' && (
        <div style={{
          marginBottom: '15px',
          padding: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: '#86efac',
          fontSize: '12px'
        }}>
          ✅ Timeout settings saved
        </div>
      )}

      {/* Download + Merge Timeout */}
      <div style={rowStyle}>
        <div style={sectionStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
            Download Timeout (seconds)
          </label>
          <input
            type="number"
            style={inputFieldStyle}
            value={settings.download_timeout}
            onChange={(e) => onSettingChange('download_timeout', parseInt(e.target.value) || 0)}
            min="10"
            max="600"
          />
          <div style={helperTextStyle}>
            Maximum time to download XML files (10-600 seconds)
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
            Merge Process Timeout (seconds)
          </label>
          <input
            type="number"
            style={inputFieldStyle}
            value={settings.merge_timeout}
            onChange={(e) => onSettingChange('merge_timeout', parseInt(e.target.value) || 0)}
            min="30"
            max="1800"
          />
          <div style={helperTextStyle}>
            Maximum time to process merge (30-1800 seconds)
          </div>
        </div>
      </div>
    </div>
  );
};