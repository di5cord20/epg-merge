import React, { useState, useEffect } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

/**
 * SettingsSchedule Component - v0.5.0
 * Manages merge schedule, timeframe, source/channels selection
 * UPDATED: Source/Channels dropdowns now 50/50 side-by-side layout
 */
export const SettingsSchedule = ({
  settings,
  onSettingChange,
  sourceVersions,
  selectedSourceVersion,
  selectedSourceDetails,
  onSourceVersionChange,
  cronExpression,
  timezone,
  savedPanel,
  onSave
}) => {
  const [channelVersions, setChannelVersions] = useState([]);
  const { call } = useApi();

  const DAYS_OF_WEEK = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ];

  const TIMEFRAMES = [
    { value: '3', label: '3 days' },
    { value: '7', label: '7 days' },
    { value: '14', label: '14 days' }
  ];

  // Load available channel versions
  useEffect(() => {
    loadChannelVersions();
  }, []);

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

  // NEW: 50/50 layout for source/channels dropdowns
  const dropdownRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '25px',
    marginBottom: '25px'
  };

  const dropdownColumnStyle = {
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

  const selectFieldStyle = {
    ...inputFieldStyle,
    appearance: 'none',
    paddingRight: '30px',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23e2e8f0' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    color: '#e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    colorScheme: 'dark'
  };

  const selectOptionStyle = {
    color: '#e2e8f0',
    backgroundColor: '#1e293b'
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

  const handleDayToggle = (day) => {
    const newDays = settings.merge_days.includes(day)
      ? settings.merge_days.filter(d => d !== day)
      : [...settings.merge_days, day];
    onSettingChange('merge_days', newDays);
  };

  const handleSelectAllDays = () => {
    onSettingChange('merge_days', ['0', '1', '2', '3', '4', '5', '6']);
  };

  const handleClearAllDays = () => {
    onSettingChange('merge_days', []);
  };

  return (
    <div style={panelContainerStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={{ margin: 0 }}>📅 Merge Schedule</h2>
        <button onClick={() => onSave('schedule')} style={buttonStyle}>
          <Save size={16} /> Save
        </button>
      </div>

      {savedPanel === 'schedule' && (
        <div style={{
          marginBottom: '15px',
          padding: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: '#86efac',
          fontSize: '12px'
        }}>
          ✅ Schedule settings saved
        </div>
      )}

      {/* Schedule Frequency + Merge Time */}
      <div style={rowStyle}>
        <div style={sectionStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
            Schedule Frequency
          </label>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['daily', 'weekly'].map(val => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="schedule"
                  value={val}
                  checked={settings.merge_schedule === val}
                  onChange={(e) => onSettingChange('merge_schedule', e.target.value)}
                />
                {val === 'daily' ? 'Daily' : 'Weekly'}
              </label>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
            Merge Time ({timezone})
          </label>
          <input
            type="time"
            style={inputFieldStyle}
            value={settings.merge_time}
            onChange={(e) => onSettingChange('merge_time', e.target.value)}
          />
          <div style={helperTextStyle}>
            When to run automatic merges
          </div>
        </div>
      </div>

      {/* EPG Timeframe Selection */}
      <div style={sectionStyle}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
          EPG Timeframe for Scheduled Merge
        </label>
        <div style={{ display: 'flex', gap: '15px' }}>
          {TIMEFRAMES.map(tf => (
            <label key={tf.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="timeframe"
                value={tf.value}
                checked={settings.merge_timeframe === tf.value}
                onChange={(e) => onSettingChange('merge_timeframe', e.target.value)}
              />
              {tf.label}
            </label>
          ))}
        </div>
        <div style={{ ...helperTextStyle, marginTop: '10px' }}>
          EPG data timeframe to use when scheduled merge runs
        </div>
      </div>

      {/* ===== NEW: 50/50 SOURCE & CHANNELS DROPDOWNS ===== */}
      <div style={dropdownRowStyle}>
        
        {/* SOURCE CONFIGURATION SELECTION - 50% WIDTH */}
        <div style={dropdownColumnStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
            Sources to Use
          </label>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <select
              style={selectFieldStyle}
              value={selectedSourceVersion || ''}
              onChange={(e) => onSourceVersionChange(e.target.value)}
            >
              <option value="">No source versions saved</option>
              {Array.isArray(sourceVersions) && sourceVersions.length > 0 && sourceVersions.map(version => (
                <option
                  key={version?.filename || 'unknown'}
                  value={version?.filename || ''}
                  style={selectOptionStyle}
                >
                  {version?.filename === 'sources.json' 
                    ? `${version.filename} (Current)` 
                    : (version?.filename || '').replace('sources.json.', '')} ({version?.sources?.length || 0} sources)
                </option>
              ))}
            </select>
          </div>
          <div style={helperTextStyle}>
            Which saved sources to use for automated merge
          </div>

          {/* Show selected source details */}
          {selectedSourceDetails && selectedSourceVersion && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              {selectedSourceDetails?.saved_at && (
                <div style={{ marginBottom: '8px', color: '#94a3b8' }}>
                  <strong style={{ color: '#60a5fa' }}>Saved:</strong> {selectedSourceDetails.saved_at}
                </div>
              )}
              {selectedSourceDetails?.feed_type && (
                <div style={{ marginBottom: '8px', color: '#94a3b8' }}>
                  <strong style={{ color: '#60a5fa' }}>Feed Type:</strong> {selectedSourceDetails.feed_type.toUpperCase()}
                </div>
              )}
              <div style={{ color: '#94a3b8' }}>
                <strong style={{ color: '#60a5fa' }}>Sources Included ({Array.isArray(selectedSourceDetails?.sources) ? selectedSourceDetails.sources.length : 0}):</strong>
                <div style={{
                  marginTop: '6px',
                  paddingLeft: '12px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }}>
                  {Array.isArray(selectedSourceDetails?.sources) && selectedSourceDetails.sources.length > 0 ? (
                    selectedSourceDetails.sources.map((src, idx) => (
                      <div key={idx} style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>
                        • {src}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      No sources found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CHANNELS VERSION SELECTION - 50% WIDTH */}
        <div style={dropdownColumnStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
            Channels to Use
          </label>
          <select
            style={selectFieldStyle}
            value={settings?.merge_channels_version || ''}
            onChange={(e) => onSettingChange('merge_channels_version', e.target.value)}
          >
            <option value="">No channel versions saved</option>
            {Array.isArray(channelVersions) && channelVersions.length > 0 && channelVersions.map(version => (
              <option
                key={version?.filename || 'unknown'}
                value={version?.filename || ''}
                style={selectOptionStyle}
              >
                {version?.is_current ? `${version.filename} (Current)` : version?.filename || ''} ({version?.channels_count || 0} channels)
              </option>
            ))}
          </select>
          <div style={helperTextStyle}>
            Which saved channels to filter with during merge
          </div>
        </div>
      </div>

      {/* Weekly Days Selection */}
      {settings.merge_schedule === 'weekly' && (
        <div style={sectionStyle}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px' }}>
            Select Days of Week
          </label>
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSelectAllDays}
              style={{
                padding: '6px 12px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#3b82f6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Select All
            </button>
            <button
              onClick={handleClearAllDays}
              style={{
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Clear All
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '8px'
          }}>
            {DAYS_OF_WEEK.map(day => (
              <label
                key={day.value}
                style={{
                  padding: '10px',
                  background: settings.merge_days.includes(day.value)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid ' + (settings.merge_days.includes(day.value)
                    ? 'rgba(16, 185, 129, 0.5)'
                    : 'rgba(255, 255, 255, 0.1)'),
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                <input
                  type="checkbox"
                  checked={settings.merge_days.includes(day.value)}
                  onChange={() => handleDayToggle(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
            {!settings.merge_days || settings.merge_days.length === 0
              ? '⚠️ Please select at least one day'
              : `${settings.merge_days.length} day(s) selected`}
          </div>
        </div>
      )}

      {/* Cron Expression Display */}
      <div style={{
        padding: '12px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '6px',
        fontSize: '13px',
        fontFamily: 'monospace'
      }}>
        <strong>Cron Expression:</strong> <code>{cronExpression}</code>
      </div>
    </div>
  );
};