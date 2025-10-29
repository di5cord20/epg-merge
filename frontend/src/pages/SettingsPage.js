import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Send } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';

/**
 * Settings Page Component - v0.3.7
 * Enhanced validation, timezone support, test notifications
 */
export const SettingsPage = () => {
  const [settings, setSettings] = useLocalStorage('appSettings', getDefaultSettings());
  const [saved, setSaved] = useState(false);
  const [savedPanel, setSavedPanel] = useState(null);
  const [error, setError] = useState(null);
  const [cronExpression, setCronExpression] = useState('');
  const [timezone, setTimezone] = useState('');
  const [testingNotification, setTestingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const { call } = useApi();

  const panelRefs = {
    summary: useRef(null),
    output: useRef(null),
    schedule: useRef(null),
    timeouts: useRef(null),
    quality: useRef(null),
    notifications: useRef(null)
  };

  const DAYS_OF_WEEK = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ];

  const TABS = [
    { id: 'summary', label: 'Summary', icon: '📋' },
    { id: 'output', label: 'Output File', icon: '📦' },
    { id: 'schedule', label: 'Merge Schedule', icon: '📅' },
    { id: 'timeouts', label: 'Timeouts', icon: '⏱️' },
    { id: 'quality', label: 'Quality & Retention', icon: '📊' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' }
  ];

  // =========== INITIALIZATION & TIMEZONE ===========

  useEffect(() => {
    // Get local timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCronExpression(generateCronExpression(
      settings.merge_time,
      settings.merge_schedule,
      settings.merge_days
    ));
  }, [settings.merge_time, settings.merge_schedule, settings.merge_days]);

  // =========== VALIDATION ===========

  const validateMergedFilename = (filename) => {
    if (!filename) return "Filename is required";
    if (!filename.match(/\.(xml|xml\.gz)$/i)) {
      return "Must end with .xml or .xml.gz";
    }
    return null;
  };

  const validateDiscordWebhook = (url) => {
    if (!url) return null; // Optional field
    if (!url.match(/^https:\/\/discordapp\.com\/api\/webhooks\/\d+\/.+$/) &&
        !url.match(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/)) {
      return "Invalid Discord webhook URL format";
    }
    return null;
  };

  const validateSettings = () => {
    const errors = {};
    
    const filenameError = validateMergedFilename(settings.output_filename);
    if (filenameError) errors.output_filename = filenameError;
    
    const webhookError = validateDiscordWebhook(settings.discord_webhook);
    if (webhookError) errors.discord_webhook = webhookError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // =========== API CALLS ===========

  const loadSettings = async () => {
    try {
      const data = await call('/api/settings/get');
      if (data && Object.keys(data).length > 0) {
        let mergeDays = getDefaultSettings().merge_days;
        if (data.merge_days) {
          try {
            mergeDays = typeof data.merge_days === 'string' 
              ? JSON.parse(data.merge_days) 
              : data.merge_days;
            if (!Array.isArray(mergeDays)) {
              mergeDays = getDefaultSettings().merge_days;
            }
          } catch (e) {
            mergeDays = getDefaultSettings().merge_days;
          }
        }

        setSettings({
          output_filename: data.output_filename || settings.output_filename,
          merge_schedule: data.merge_schedule || settings.merge_schedule,
          merge_time: data.merge_time || settings.merge_time,
          merge_days: mergeDays,
          download_timeout: parseInt(data.download_timeout) || settings.download_timeout,
          merge_timeout: parseInt(data.merge_timeout) || settings.merge_timeout,
          channel_drop_threshold: data.channel_drop_threshold !== undefined ? data.channel_drop_threshold : settings.channel_drop_threshold,
          archive_retention: parseInt(data.archive_retention) || settings.archive_retention,
          discord_webhook: data.discord_webhook || settings.discord_webhook
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const saveAllSettings = async () => {
    if (!validateSettings()) {
      setError('Please fix validation errors before saving');
      return;
    }

    try {
      setError(null);
      await call('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify({
          output_filename: settings.output_filename,
          merge_schedule: settings.merge_schedule,
          merge_time: settings.merge_time,
          merge_days: JSON.stringify(settings.merge_days),
          download_timeout: settings.download_timeout.toString(),
          merge_timeout: settings.merge_timeout.toString(),
          channel_drop_threshold: settings.channel_drop_threshold,
          archive_retention: settings.archive_retention.toString(),
          discord_webhook: settings.discord_webhook
        })
      });
      setSaved(true);
      setSavedPanel(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    }
  };

  const sendTestNotification = async () => {
    if (!settings.discord_webhook) {
      setNotificationStatus({ type: 'error', message: 'No webhook URL configured' });
      return;
    }

    if (validateDiscordWebhook(settings.discord_webhook)) {
      setNotificationStatus({ type: 'error', message: 'Invalid webhook URL' });
      return;
    }

    setTestingNotification(true);
    try {
      // Send test message to Discord webhook
      const response = await fetch(settings.discord_webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '✅ **EPG Merge App - Test Notification**',
          embeds: [{
            title: 'Webhook Configuration Test',
            description: 'This is a test message to verify your Discord webhook is working correctly.',
            color: 3066993, // Green
            timestamp: new Date().toISOString(),
            footer: { text: 'EPG Merge v0.3.7' }
          }]
        })
      });

      if (response.ok) {
        setNotificationStatus({ type: 'success', message: 'Test notification sent successfully!' });
        setTimeout(() => setNotificationStatus(null), 5000);
      } else {
        setNotificationStatus({ type: 'error', message: `Failed: HTTP ${response.status}` });
      }
    } catch (err) {
      setNotificationStatus({ type: 'error', message: `Error: ${err.message}` });
    } finally {
      setTestingNotification(false);
    }
  };

  // =========== HELPERS ===========

  const savePanelSettings = (panelId) => {
    saveAllSettings();
    setSavedPanel(panelId);
    setTimeout(() => setSavedPanel(null), 3000);
  };

  const scrollToPanel = (panelId) => {
    panelRefs[panelId]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setSettings(getDefaultSettings());
      setValidationErrors({});
    }
  };

  const generateCronExpression = (time, schedule, days) => {
    const [hours, minutes] = time.split(':');
    if (schedule === 'daily') {
      return `${minutes} ${hours} * * *`;
    } else if (schedule === 'weekly' && days && days.length > 0) {
      const sortedDays = days.map(d => parseInt(d)).sort().join(',');
      return `${minutes} ${hours} * * ${sortedDays}`;
    }
    return 'Invalid schedule';
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const handleDayToggle = (day) => {
    setSettings(prev => {
      const newDays = prev.merge_days.includes(day)
        ? prev.merge_days.filter(d => d !== day)
        : [...prev.merge_days, day];
      return { ...prev, merge_days: newDays };
    });
  };

  const handleSelectAllDays = () => {
    setSettings(prev => ({ ...prev, merge_days: ['0', '1', '2', '3', '4', '5', '6'] }));
  };

  const handleClearAllDays = () => {
    setSettings(prev => ({ ...prev, merge_days: [] }));
  };

  // =========== STYLES ===========

  const sidebarStyle = {
    width: '200px',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px 0',
    position: 'fixed',
    top: '70px',
    left: '0',
    height: 'calc(100vh - 70px)',
    overflowY: 'auto',
    zIndex: 100
  };

  const navItemStyle = {
    display: 'block',
    width: '100%',
    padding: '10px 20px',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  };

  const panelStyle = {
    flex: 1,
    padding: '30px',
    marginLeft: '200px'
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

  const buttonDisabledStyle = {
    ...buttonStyle,
    background: '#6b7280',
    cursor: 'not-allowed',
    opacity: 0.6
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

  // =========== RENDER ===========

  return (
    <div className="page-container">
      <div style={{ display: 'flex', gap: '0', minHeight: '100vh' }}>
        {/* SIDEBAR */}
        <div style={sidebarStyle}>
          <div style={{ padding: '0 20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
              Settings
            </h3>
          </div>

          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => scrollToPanel(tab.id)}
              style={navItemStyle}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          {/* SAVE ALL */}
          <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '20px' }}>
            <button
              onClick={saveAllSettings}
              style={{
                ...buttonStyle,
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <Save size={16} /> Save All
            </button>
            {saved && (
              <div style={{
                marginTop: '10px',
                padding: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '4px',
                color: '#86efac',
                fontSize: '12px',
                textAlign: 'center'
              }}>
                ✅ All saved
              </div>
            )}
          </div>
        </div>

        {/* PANELS */}
        <div style={panelStyle}>
          {/* GLOBAL ERROR */}
          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#fca5a5'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* SUMMARY PANEL */}
          <div ref={panelRefs.summary} style={panelContainerStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>📋 Configuration Summary</h2>
            </div>
            
            <div style={sectionStyle}>
              <h3 style={{ marginTop: '0', marginBottom: '15px', fontSize: '14px', fontWeight: '600' }}>Current Settings</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>📦 Output Filename</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                    {settings.output_filename || 'Not set'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>📅 Merge Schedule</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                    {settings.merge_schedule === 'daily' 
                      ? `Daily at ${settings.merge_time}` 
                      : `Weekly at ${settings.merge_time}`}
                  </div>
                </div>

                {settings.merge_schedule === 'weekly' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>📆 Days Selected</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                      {settings.merge_days && settings.merge_days.length > 0
                        ? DAYS_OF_WEEK.filter(d => settings.merge_days.includes(d.value)).map(d => d.label).join(', ')
                        : 'No days selected'}
                    </div>
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>⏰ Cron Expression</div>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: '500', color: '#3b82f6' }}>
                    {cronExpression}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>⏱️ Download Timeout</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>{settings.download_timeout}s</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>⏱️ Merge Timeout</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>{settings.merge_timeout}s</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>📊 Channel Drop Threshold</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: settings.channel_drop_threshold === '' ? '#f59e0b' : '#e2e8f0' }}>
                    {settings.channel_drop_threshold === '' ? 'DISABLED' : `${settings.channel_drop_threshold}%`}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>📦 Archive Retention</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>{settings.archive_retention} days</div>
                </div>

                {settings.discord_webhook && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>🔔 Discord Webhook</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#86efac' }}>Configured & Enabled</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OUTPUT FILE PANEL */}
          <div ref={panelRefs.output} style={panelContainerStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>📦 Output File</h2>
              <button
                onClick={() => savePanelSettings('output')}
                style={buttonStyle}
              >
                <Save size={16} /> Save
              </button>
            </div>
            {savedPanel === 'output' && (
              <div style={{ marginBottom: '15px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', color: '#86efac', fontSize: '12px' }}>
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
                onChange={(e) => handleSettingChange('output_filename', e.target.value)}
                placeholder="merged.xml.gz"
              />
              <div style={validationErrors.output_filename ? errorTextStyle : helperTextStyle}>
                {validationErrors.output_filename ? `❌ ${validationErrors.output_filename}` : 'Must end with .xml or .xml.gz'}
              </div>
            </div>
          </div>

          {/* SCHEDULE PANEL */}
          <div ref={panelRefs.schedule} style={panelContainerStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>📅 Merge Schedule</h2>
              <button
                onClick={() => savePanelSettings('schedule')}
                style={buttonStyle}
              >
                <Save size={16} /> Save
              </button>
            </div>
            {savedPanel === 'schedule' && (
              <div style={{ marginBottom: '15px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', color: '#86efac', fontSize: '12px' }}>
                ✅ Schedule settings saved
              </div>
            )}
            
            {/* Schedule Frequency + Merge Time - 50% width each */}
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
                        onChange={(e) => handleSettingChange('merge_schedule', e.target.value)}
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
                  onChange={(e) => handleSettingChange('merge_time', e.target.value)}
                />
                <div style={helperTextStyle}>
                  When to run automatic merges
                </div>
              </div>
            </div>

            {/* Weekly Days */}
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

            {/* Cron Expression */}
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

          {/* TIMEOUTS PANEL */}
          <div ref={panelRefs.timeouts} style={panelContainerStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>⏱️ Timeouts</h2>
              <button
                onClick={() => savePanelSettings('timeouts')}
                style={buttonStyle}
              >
                <Save size={16} /> Save
              </button>
            </div>
            {savedPanel === 'timeouts' && (
              <div style={{ marginBottom: '15px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', color: '#86efac', fontSize: '12px' }}>
                ✅ Timeout settings saved
              </div>
            )}
            
            {/* Download + Merge Timeout - 50% width each */}
            <div style={rowStyle}>
              <div style={sectionStyle}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Download Timeout (seconds)
                </label>
                <input
                  type="number"
                  style={inputFieldStyle}
                  value={settings.download_timeout}
                  onChange={(e) => handleSettingChange('download_timeout', parseInt(e.target.value) || 0)}
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
                  onChange={(e) => handleSettingChange('merge_timeout', parseInt(e.target.value) || 0)}
                  min="30"
                  max="1800"
                />
                <div style={helperTextStyle}>
                  Maximum time to process merge (30-1800 seconds)
                </div>
              </div>
            </div>
          </div>

          {/* QUALITY & RETENTION PANEL */}
          <div ref={panelRefs.quality} style={panelContainerStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>📊 Quality & Retention</h2>
              <button
                onClick={() => savePanelSettings('quality')}
                style={buttonStyle}
              >
                <Save size={16} /> Save
              </button>
            </div>
            {savedPanel === 'quality' && (
              <div style={{ marginBottom: '15px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', color: '#86efac', fontSize: '12px' }}>
                ✅ Quality settings saved
              </div>
            )}
            
            {/* Channel Drop + Archive Retention - 50% width each */}
            <div style={rowStyle}>
              <div style={sectionStyle}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Channel Drop Threshold
                </label>
                <input
                  type="number"
                  style={inputFieldStyle}
                  value={settings.channel_drop_threshold}
                  onChange={(e) => handleSettingChange('channel_drop_threshold', e.target.value)}
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
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Archive Retention (days)
                </label>
                <input
                  type="number"
                  style={inputFieldStyle}
                  value={settings.archive_retention}
                  onChange={(e) => handleSettingChange('archive_retention', parseInt(e.target.value) || 0)}
                  min="1"
                  max="365"
                />
                <div style={helperTextStyle}>
                  Keep archives for this many days (1-365)
                </div>
              </div>
            </div>
          </div>

          {/* NOTIFICATIONS PANEL */}
          <div ref={panelRefs.notifications} style={panelContainerStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>🔔 Notifications</h2>
              <button
                onClick={() => savePanelSettings('notifications')}
                style={buttonStyle}
              >
                <Save size={16} /> Save
              </button>
            </div>
            {savedPanel === 'notifications' && (
              <div style={{ marginBottom: '15px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', color: '#86efac', fontSize: '12px' }}>
                ✅ Notification settings saved
              </div>
            )}
            
            <div style={sectionStyle}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                Discord Webhook (Optional)
              </label>
              <input
                type="text"
                style={validationErrors.discord_webhook ? errorInputStyle : inputFieldStyle}
                value={settings.discord_webhook}
                onChange={(e) => handleSettingChange('discord_webhook', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
              <div style={validationErrors.discord_webhook ? errorTextStyle : helperTextStyle}>
                {validationErrors.discord_webhook 
                  ? `❌ ${validationErrors.discord_webhook}` 
                  : 'Send merge notifications to Discord channel'}
              </div>
            </div>

            {/* Test Notification Button */}
            {settings.discord_webhook && !validationErrors.discord_webhook && (
              <div style={sectionStyle}>
                <button
                  onClick={sendTestNotification}
                  disabled={testingNotification || !settings.discord_webhook}
                  style={
                    testingNotification || !settings.discord_webhook 
                      ? buttonDisabledStyle 
                      : buttonStyle
                  }
                >
                  <Send size={16} />
                  {testingNotification ? 'Sending...' : 'Send Test Notification'}
                </button>
                
                {notificationStatus && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    background: notificationStatus.type === 'success' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${notificationStatus.type === 'success' 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '4px',
                    color: notificationStatus.type === 'success' ? '#86efac' : '#fca5a5',
                    fontSize: '12px'
                  }}>
                    {notificationStatus.type === 'success' ? '✅' : '❌'} {notificationStatus.message}
                  </div>
                )}
              </div>
            )}

            {!settings.discord_webhook && (
              <div style={{
                ...sectionStyle,
                background: 'rgba(107, 114, 128, 0.1)',
                borderColor: 'rgba(107, 114, 128, 0.3)',
                color: '#9ca3af'
              }}>
                ℹ️ Configure a valid Discord webhook URL above to enable test notifications
              </div>
            )}
          </div>

          {/* RESET BUTTON */}
          <div style={{ marginTop: '40px', marginBottom: '40px' }}>
            <button
              onClick={resetToDefaults}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={16} /> Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getDefaultSettings() {
  return {
    output_filename: 'merged.xml.gz',
    merge_schedule: 'daily',
    merge_time: '00:00',
    merge_days: ['0', '1', '2', '3', '4', '5', '6'],
    download_timeout: 120,
    merge_timeout: 300,
    channel_drop_threshold: '10',
    archive_retention: 30,
    discord_webhook: ''
  };
}