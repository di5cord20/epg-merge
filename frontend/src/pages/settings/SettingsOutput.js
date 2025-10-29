import React from 'react';
import { Save } from 'lucide-react';

/**
 * SettingsOutput Component - v0.4.2
 * Manages output filename configuration
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
        <h2 style={{ margin: 0 }}>📦 Output File</h2>
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

      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
          Merged File Name
        </label>
        <input
          type="text"
          style={validationErrors.output_filename ? errorInputStyle : inputFieldStyle}
          value={settings.output_filename}
          onChange={(e) => onSettingChange('output_filename', e.target.value)}
          placeholder="merged.xml.gz"
        />
        <div style={validationErrors.output_filename ? errorTextStyle : helperTextStyle}>
          {validationErrors.output_filename 
            ? `❌ ${validationErrors.output_filename}` 
            : 'Must end with .xml or .xml.gz'}
        </div>
      </div>
    </div>
  );
};