import React, { useState, useEffect } from 'react';

/**
 * SettingsSummary Component - v0.4.2
 * Displays current configuration overview
 */
export const SettingsSummary = ({ settings }) => {
  const [cronExpression, setCronExpression] = useState('');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);
  }, []);

  useEffect(() => {
    setCronExpression(generateCronExpression(
      settings.merge_time,
      settings.merge_schedule,
      settings.merge_days
    ));
  }, [settings.merge_time, settings.merge_schedule, settings.merge_days]);

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

  const sectionStyle = {
    marginBottom: '25px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px'
  };

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getDaysLabel = () => {
    if (!settings.merge_days || settings.merge_days.length === 0) return 'No days selected';
    return settings.merge_days.map(d => DAYS_OF_WEEK[parseInt(d)]).join(', ');
  };

  return (
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
            {settings.merge_schedule === 'daily' ? `Daily at ${settings.merge_time}` : `Weekly at ${settings.merge_time}`}
          </div>
        </div>

        {settings.merge_schedule === 'weekly' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>📆 Days Selected</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
              {getDaysLabel()}
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
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>🗑️ Archive Cleanup</div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: settings.archive_retention_cleanup_expired ? '#86efac' : '#94a3b8' }}>
            {settings.archive_retention_cleanup_expired ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {settings.discord_webhook && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>🔔 Discord Webhook</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#86efac' }}>Configured & Enabled</div>
          </div>
        )}
      </div>
    </div>
  );
};