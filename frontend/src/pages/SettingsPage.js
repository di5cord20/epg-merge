import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SettingsSummary } from './settings/SettingsSummary';
import { SettingsOutput } from './settings/SettingsOutput';
import { SettingsSchedule } from './settings/SettingsSchedule';
import { SettingsTimeouts } from './settings/SettingsTimeouts';
import { SettingsQuality } from './settings/SettingsQuality';
import { SettingsNotifications } from './settings/SettingsNotifications';

/**
 * SettingsPage - v0.5.0 (Enhanced with Source Selection)
 * Main orchestrator for all settings sub-components
 * Manages state, validation, persistence, and API communication
 */
export const SettingsPage = ({ jobStatus }) => {
  const [settings, setSettings] = useLocalStorage('appSettings', getDefaultSettings());
  const [saved, setSaved] = useState(false);
  const [savedPanel, setSavedPanel] = useState(null);
  const [error, setError] = useState(null);
  const [cronExpression, setCronExpression] = useState('');
  const [timezone, setTimezone] = useState('');
  const [sourceVersions, setSourceVersions] = useState([]);
  const [selectedSourceVersion, setSelectedSourceVersion] = useState('sources.json');
  const [selectedSourceDetails, setSelectedSourceDetails] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const { call } = useApi();

  const panelRefs = {
    summary: useRef(null),
    output: useRef(null),
    schedule: useRef(null),
    timeouts: useRef(null),
    quality: useRef(null),
    notifications: useRef(null)
  };

  // =========================================================================
  // ERROR BOUNDARY
  // =========================================================================
  
  useEffect(() => {
    const errorHandler = (event) => {
      console.error('Settings Page Error:', event.error);
      setRenderError(`Error: ${event.error?.message || 'Unknown error'}`);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate cron expression whenever relevant settings change
  useEffect(() => {
    setCronExpression(generateCronExpression(
      settings.merge_time,
      settings.merge_schedule,
      settings.merge_days
    ));
  }, [settings.merge_time, settings.merge_schedule, settings.merge_days]);

  // Load source versions
  useEffect(() => {
    const loadVersions = async () => {
      try {
        const data = await call('/api/sources/versions');
        const versions = Array.isArray(data?.versions) ? data.versions : [];
        setSourceVersions(versions);
        setPageLoading(false);
      } catch (err) {
        console.error('Error loading source versions:', err);
        setSourceVersions([]);
        setPageLoading(false);
      }
    };
    loadVersions();
  }, [call]);

  // Update source details when selection changes
  useEffect(() => {
    const selected = sourceVersions.find(v => v.filename === selectedSourceVersion);
    setSelectedSourceDetails(selected || null);
  }, [selectedSourceVersion, sourceVersions]);

  // =========================================================================
  // VALIDATION
  // =========================================================================

  const validateMergedFilename = (filename) => {
    if (!filename) return "Filename is required";
    if (!filename.match(/\.(xml|xml\.gz)$/i)) {
      return "Must end with .xml or .xml.gz";
    }
    return null;
  };

  const validateChannelsFilename = (filename) => {
    if (!filename) return "Filename is required";
    if (!filename.match(/\.json$/i)) {
      return "Must end with .json";
    }
    return null;
  };

  const validateDirectoryPath = (path) => {
    if (!path) return "Path is required";
    if (!path.startsWith('/')) {
      return "Must be absolute path (start with /) - Examples: /data/current, /opt/epg-merge/data";
    }
    if (path.includes('~')) {
      return "Use absolute path, not ~ - Example: /home/user/data instead of ~/data";
    }
    if (path.includes('..')) {
      return "Use absolute path, not relative - Example: /data/archives instead of ../data/archives";
    }
    if (path.endsWith('/')) {
      return "Path should not end with / - Example: /data/current not /data/current/";
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
    
    const channelsError = validateChannelsFilename(settings.channels_filename);
    if (channelsError) errors.channels_filename = channelsError;
    
    const currentDirError = validateDirectoryPath(settings.current_dir);
    if (currentDirError) errors.current_dir = currentDirError;
    
    const archiveDirError = validateDirectoryPath(settings.archive_dir);
    if (archiveDirError) errors.archive_dir = archiveDirError;
    
    const channelsDirError = validateDirectoryPath(settings.channels_dir);
    if (channelsDirError) errors.channels_dir = channelsDirError;

    const webhookError = validateDiscordWebhook(settings.discord_webhook);
    if (webhookError) errors.discord_webhook = webhookError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // =========================================================================
  // API CALLS
  // =========================================================================

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
          channels_filename: data.channels_filename || settings.channels_filename,
          current_dir: data.current_dir || settings.current_dir,
          archive_dir: data.archive_dir || settings.archive_dir,
          channels_dir: data.channels_dir || settings.channels_dir,
          merge_schedule: data.merge_schedule || settings.merge_schedule,
          merge_time: data.merge_time || settings.merge_time,
          merge_days: mergeDays,
          merge_timeframe: data.merge_timeframe || settings.merge_timeframe,
          selected_sources_version: data.selected_sources_version || settings.selected_sources_version,
          merge_channels_version: data.merge_channels_version || settings.merge_channels_version,
          download_timeout: parseInt(data.download_timeout) || settings.download_timeout,
          merge_timeout: parseInt(data.merge_timeout) || settings.merge_timeout,
          channel_drop_threshold: data.channel_drop_threshold !== undefined ? data.channel_drop_threshold : settings.channel_drop_threshold,
          archive_retention_cleanup_expired: data.archive_retention_cleanup_expired !== undefined ? data.archive_retention_cleanup_expired : settings.archive_retention_cleanup_expired,
          discord_webhook: data.discord_webhook || settings.discord_webhook
        });

        // Set selected source version from loaded settings
        if (data.selected_sources_version) {
          setSelectedSourceVersion(data.selected_sources_version);
        }
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
      
      // Get the selected sources from the selected version
      const selectedVersion = sourceVersions.find(v => v.filename === selectedSourceVersion);
      const selectedSourcesList = selectedVersion ? selectedVersion.sources : [];
      
      await call('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify({
          output_filename: settings.output_filename,
          channels_filename: settings.channels_filename,
          current_dir: settings.current_dir,
          archive_dir: settings.archive_dir,
          channels_dir: settings.channels_dir,
          merge_schedule: settings.merge_schedule,
          merge_time: settings.merge_time,
          merge_days: JSON.stringify(settings.merge_days),
          merge_timeframe: settings.merge_timeframe,
          selected_sources: JSON.stringify(selectedSourcesList),
          selected_sources_version: selectedSourceVersion,
          merge_channels_version: settings.merge_channels_version,
          download_timeout: settings.download_timeout.toString(),
          merge_timeout: settings.merge_timeout.toString(),
          channel_drop_threshold: settings.channel_drop_threshold,
          archive_retention_cleanup_expired: settings.archive_retention_cleanup_expired,
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

  // =========================================================================
  // HELPERS
  // =========================================================================

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

  const handleSourceVersionChange = (version) => {
    setSelectedSourceVersion(version);
  };

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
      setSelectedSourceVersion('sources.json');
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

  // =========================================================================
  // STYLES
  // =========================================================================

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
    marginLeft: '200px',
    padding: '30px'
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

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="page-container" style={{ display: 'flex', gap: '0', minHeight: '100vh' }}>
      {/* SIDEBAR NAVIGATION */}
      <div style={sidebarStyle}>
        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
            ⚙️ Settings
          </h3>
        </div>

        {[
          { id: 'summary', label: 'Summary', icon: '📋' },
          { id: 'output', label: 'Output & Paths', icon: '📂' },
          { id: 'schedule', label: 'Schedule', icon: '📅' },
          { id: 'timeouts', label: 'Timeouts', icon: '⏱️' },
          { id: 'quality', label: 'Quality', icon: '📊' },
          { id: 'notifications', label: 'Notifications', icon: '🔔' }
        ].map(section => (
          <button
            key={section.id}
            onClick={() => scrollToPanel(section.id)}
            style={navItemStyle}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
          >
            {section.icon} {section.label}
          </button>
        ))}

        {/* SIDEBAR SAVE ALL */}
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

      {/* MAIN PANELS */}
      <div style={panelStyle}>
        {/* LOADING STATE */}
        {pageLoading && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            ⏳ Loading settings...
          </div>
        )}

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

        {!pageLoading && (
          <>
            {renderError && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#fca5a5',
                fontSize: '12px'
              }}>
                ❌ {renderError}
              </div>
            )}
            
            {/* SUMMARY PANEL */}
            {!renderError && (
              <div ref={panelRefs.summary}>
                <SettingsSummary settings={settings} />
              </div>
            )}

            {/* OUTPUT FILE & PATHS PANEL */}
            {!renderError && (
              <div ref={panelRefs.output}>
                <SettingsOutput
                  settings={settings}
                  onSettingChange={handleSettingChange}
                  validationErrors={validationErrors}
                  savedPanel={savedPanel}
                  onSave={savePanelSettings}
                />
              </div>
            )}

            {/* SCHEDULE PANEL */}
            {!renderError && (
              <div ref={panelRefs.schedule}>
                <SettingsSchedule
                  settings={settings}
                  onSettingChange={handleSettingChange}
                  sourceVersions={Array.isArray(sourceVersions) ? sourceVersions : []}
                  selectedSourceVersion={selectedSourceVersion || 'sources.json'}
                  selectedSourceDetails={selectedSourceDetails}
                  onSourceVersionChange={handleSourceVersionChange}
                  cronExpression={cronExpression}
                  timezone={timezone}
                  savedPanel={savedPanel}
                  onSave={savePanelSettings}
                />
              </div>
            )}

            {/* TIMEOUTS PANEL */}
            {!renderError && (
              <div ref={panelRefs.timeouts}>
                <SettingsTimeouts
                  settings={settings}
                  onSettingChange={handleSettingChange}
                  savedPanel={savedPanel}
                  onSave={savePanelSettings}
                />
              </div>
            )}

            {/* QUALITY PANEL */}
            {!renderError && (
              <div ref={panelRefs.quality}>
                <SettingsQuality
                  settings={settings}
                  onSettingChange={handleSettingChange}
                  savedPanel={savedPanel}
                  onSave={savePanelSettings}
                />
              </div>
            )}

            {/* NOTIFICATIONS PANEL */}
            {!renderError && (
              <div ref={panelRefs.notifications}>
                <SettingsNotifications
                  settings={settings}
                  onSettingChange={handleSettingChange}
                  validationErrors={validationErrors}
                  savedPanel={savedPanel}
                  onSave={savePanelSettings}
                />
              </div>
            )}

            {/* RESET BUTTON */}
            {!renderError && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

function getDefaultSettings() {
  return {
    output_filename: 'merged.xml.gz',
    channels_filename: 'channels.json',
    current_dir: '/data/current',
    archive_dir: '/data/archives',
    channels_dir: '/data/channels',
    merge_schedule: 'daily',
    merge_time: '00:00',
    merge_days: ['0', '1', '2', '3', '4', '5', '6'],
    merge_timeframe: '3',
    selected_sources_version: 'sources.json',
    merge_channels_version: 'current',
    download_timeout: 120,
    merge_timeout: 300,
    channel_drop_threshold: '10',
    archive_retention_cleanup_expired: true,
    discord_webhook: ''
  };
}