import React from 'react';
import { Save } from 'lucide-react';

/**
 * SettingsQuality Component - v0.4.2
 * Manages channel drop threshold and archive cleanup
 */
export const SettingsQuality = ({ settings, onSettingChange, savedPanel, onSave }) => {
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
        <h2 style={{ margin: 0 }}>📊 Quality & Retention</h2>
        <button onClick={() => onSave('quality')} style={buttonStyle}>
          <Save size={16} /> Save
        </button>
      </div>

      {savedPanel === 'quality' && (
        <div style={{
          marginBottom: '15px',
          padding: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: '#86efac',
          fontSize: '12px'
        }}>
          ✅ Quality settings saved
        </div>
      )}

      {/* Channel Drop + Archive Cleanup */}
      <div style={rowStyle}>
        <div style={sectionStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
            Channel Drop Threshold
          </label>
          <input
            type="number"
            style={inputFieldStyle}
            value={settings.channel_drop_threshold}
            onChange={(e) => onSettingChange('channel_drop_threshold', e.target.value)}
            min="0"
            max="100"
            placeholder="Leave blank to ignore"
          />
          <div style={helperTextStyle}>
            Alert if more than this % of channels missing. Leave blank to disable.
          </div>
          {settings.channel_drop_threshold === '' && (
            <div style={{
              marginTop: '10px',
              padding: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#fcd34d'
            }}>
              ℹ️ Threshold disabled - channel drop alerts are OFF
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.archive_retention_cleanup_expired || false}
              onChange={(e) => onSettingChange('archive_retention_cleanup_expired', e.target.checked)}
              style={{ marginTop: '4px' }}
            />
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                Automatically delete archives
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>
                Delete archives that don't have any scheduled programs remaining
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};