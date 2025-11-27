import React, { useState } from 'react';

/**
 * SaveDialog Component - v0.5.0
 * Reusable modal for saving sources or channels with custom filename
 * 
 * @param {string} type - 'sources' or 'channels'
 * @param {Array} versions - List of existing saved versions
 * @param {string} defaultFilename - Default filename from settings (e.g., 'sources.json')
 * @param {function} onSave - Callback(filename) when user confirms save
 * @param {function} onCancel - Callback when user cancels
 */
export const SaveDialog = ({ type, versions, defaultFilename, onSave, onCancel }) => {
  const [saveMode, setSaveMode] = useState('default'); // 'default', 'custom', 'existing'
  const [customName, setCustomName] = useState('');
  const [selectedExisting, setSelectedExisting] = useState(null);

  const getTypeLabel = () => {
    return type === 'sources' ? 'Sources' : 'Channels';
  };

  const getTypeEmoji = () => {
    return type === 'sources' ? '📁' : '📋';
  };

  const handleSave = () => {
    let filename = '';

    if (saveMode === 'default') {
      filename = defaultFilename;
    } else if (saveMode === 'custom') {
      if (!customName.trim()) {
        alert('Please enter a custom filename');
        return;
      }
      // Ensure proper extension
      if (type === 'sources' && !customName.endsWith('.json')) {
        filename = customName + '.json';
      } else if (type === 'channels' && !customName.endsWith('.json')) {
        filename = customName + '.json';
      } else {
        filename = customName;
      }
    } else if (saveMode === 'existing') {
      if (!selectedExisting) {
        alert('Please select a version to overwrite');
        return;
      }
      filename = selectedExisting;
    }

    onSave(filename);
  };

  return (
    <div
      style={{
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
      }}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', color: '#e2e8f0' }}>
          {getTypeEmoji} Save {getTypeLabel()}
        </h3>

        <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
          Choose how to save this version:
        </p>

        {/* Save Mode Selection */}
        <div style={{ marginBottom: '25px' }}>
          {/* Default Mode */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '12px',
              marginBottom: '12px',
              background:
                saveMode === 'default'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
              border:
                saveMode === 'default'
                  ? '1px solid rgba(59, 130, 246, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setSaveMode('default')}
          >
            <input
              type="radio"
              name="saveMode"
              value="default"
              checked={saveMode === 'default'}
              onChange={() => setSaveMode('default')}
              style={{ marginRight: '12px', marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                Use Fallback Default
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Save as: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '2px' }}>{defaultFilename}</code>
              </div>
            </div>
          </label>

          {/* Custom Name Mode */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '12px',
              marginBottom: '12px',
              background:
                saveMode === 'custom'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
              border:
                saveMode === 'custom'
                  ? '1px solid rgba(59, 130, 246, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setSaveMode('custom')}
          >
            <input
              type="radio"
              name="saveMode"
              value="custom"
              checked={saveMode === 'custom'}
              onChange={() => setSaveMode('custom')}
              style={{ marginRight: '12px', marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
                Use Custom Name
              </div>
              <input
                type="text"
                placeholder={defaultFilename}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Tip: Use descriptive names like "{type === 'sources' ? 'us-sources' : 'hd-channels'}"
              </div>
            </div>
          </label>

          {/* Existing Version Mode */}
          {versions && versions.length > 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '12px',
                background:
                  saveMode === 'existing'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                border:
                  saveMode === 'existing'
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setSaveMode('existing')}
            >
              <input
                type="radio"
                name="saveMode"
                value="existing"
                checked={saveMode === 'existing'}
                onChange={() => setSaveMode('existing')}
                style={{ marginRight: '12px', marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
                  Overwrite Existing ({versions.length})
                </div>
                <select
                  value={selectedExisting || ''}
                  onChange={(e) => setSelectedExisting(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23e2e8f0' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '30px',
                    colorScheme: 'dark'
                  }}
                >
                  <option value="">Select a version...</option>
                  {versions.map((version) => (
                    <option key={version.filename} value={version.filename}>
                      {version.is_current ? '📌 ' : ''}
                      {version.filename}
                      {version.is_current ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '25px'
          }}
        >
          <button
            onClick={onCancel}
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
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};