import React from 'react';
import { Save } from 'lucide-react';

/**
 * SettingsOutput Component - v0.5.0
 * Manages output filenames and directory paths
 * UPDATED: Added sources_filename and sources_dir settings
 */
export const SettingsOutput = ({ settings, onSettingChange, validationErrors, savedPanel, onSave }) => {
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

  const errorInputStyle = {
    ...inputFieldStyle,
    borderColor: '#f87171',
    background: 'rgba(239, 68, 68, 0.05)'
  };

  const helperTextStyle = {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '8px'
  };

  const errorTextStyle = {
    fontSize: '12px',
    color: '#fca5a5',
    marginBottom: '8px',
    fontWeight: '600'
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
        <h2 style={{ margin: 0 }}>📂 Output & Paths</h2>
        <button onClick={() => onSave('output')} style={buttonStyle}>
          <Save size={16} /> Save
        </button>
      </div>

      {savedPanel === 'output' && (
        <div style={{
          marginBottom: '15px',
          padding: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: '#86efac',
          fontSize: '12px'
        }}>
          ✅ Output settings saved
        </div>
      )}

      {/* Merged EPG File */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📦 Merged EPG File Name
        </label>
        <input
          type="text"
          style={validationErrors.output_filename ? errorInputStyle : inputFieldStyle}
          value={settings.output_filename}
          onChange={(e) => onSettingChange('output_filename', e.target.value)}
        />
        <div style={validationErrors.output_filename ? errorTextStyle : helperTextStyle}>
          {validationErrors.output_filename 
            ? `❌ ${validationErrors.output_filename}` 
            : 'Must end with .xml or .xml.gz'}
        </div>
      </div>

      {/* Sources JSON File (NEW v0.5.0) */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📦 Sources JSON File Name (Fallback Default)
        </label>
        <input
          type="text"
          style={validationErrors.sources_filename ? errorInputStyle : inputFieldStyle}
          value={settings.sources_filename}
          onChange={(e) => onSettingChange('sources_filename', e.target.value)}
        />
        <div style={validationErrors.sources_filename ? errorTextStyle : helperTextStyle}>
          {validationErrors.sources_filename 
            ? `❌ ${validationErrors.sources_filename}` 
            : 'Used if no custom name provided when saving sources. You can override this on each save.'}
        </div>
      </div>

      {/* Channels JSON File */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📦 Channels JSON File Name (Fallback Default)
        </label>
        <input
          type="text"
          style={validationErrors.channels_filename ? errorInputStyle : inputFieldStyle}
          value={settings.channels_filename}
          onChange={(e) => onSettingChange('channels_filename', e.target.value)}
        />
        <div style={validationErrors.channels_filename ? errorTextStyle : helperTextStyle}>
          {validationErrors.channels_filename 
            ? `❌ ${validationErrors.channels_filename}` 
            : 'Used if no custom name provided when saving channels. You can override this on each save.'}
        </div>
      </div>

      {/* Current Directory Path */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📂 Current (Live) Directory
        </label>
        <input
          type="text"
          style={validationErrors.current_dir ? errorInputStyle : inputFieldStyle}
          value={settings.current_dir}
          onChange={(e) => onSettingChange('current_dir', e.target.value)}
        />
        <div style={validationErrors.current_dir ? errorTextStyle : helperTextStyle}>
          {validationErrors.current_dir 
            ? `❌ ${validationErrors.current_dir}` 
            : 'Where the live merged file is stored'}
        </div>
      </div>

      {/* Archive Directory Path */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📁 Archive Directory
        </label>
        <input
          type="text"
          style={validationErrors.archive_dir ? errorInputStyle : inputFieldStyle}
          value={settings.archive_dir}
          onChange={(e) => onSettingChange('archive_dir', e.target.value)}
        />
        <div style={validationErrors.archive_dir ? errorTextStyle : helperTextStyle}>
          {validationErrors.archive_dir 
            ? `❌ ${validationErrors.archive_dir}` 
            : 'Where previous versions are stored with timestamps'}
        </div>
      </div>

      {/* Sources Directory Path (NEW v0.5.0) */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📁 Sources Directory
        </label>
        <input
          type="text"
          style={validationErrors.sources_dir ? errorInputStyle : inputFieldStyle}
          value={settings.sources_dir}
          onChange={(e) => onSettingChange('sources_dir', e.target.value)}
        />
        <div style={validationErrors.sources_dir ? errorTextStyle : helperTextStyle}>
          {validationErrors.sources_dir 
            ? `❌ ${validationErrors.sources_dir}` 
            : 'Where saved source versions are stored'}
        </div>
      </div>

      {/* Channels Directory Path */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          📁 Channels Directory
        </label>
        <input
          type="text"
          style={validationErrors.channels_dir ? errorInputStyle : inputFieldStyle}
          value={settings.channels_dir}
          onChange={(e) => onSettingChange('channels_dir', e.target.value)}
        />
        <div style={validationErrors.channels_dir ? errorTextStyle : helperTextStyle}>
          {validationErrors.channels_dir 
            ? `❌ ${validationErrors.channels_dir}` 
            : 'Where saved channel versions are stored'}
        </div>
      </div>
    </div>
  );
};