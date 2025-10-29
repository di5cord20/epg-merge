import React, { useState } from 'react';
import { Save, Send } from 'lucide-react';

/**
 * SettingsNotifications Component - v0.4.2
 * Manages Discord webhook configuration and testing
 */
export const SettingsNotifications = ({ settings, onSettingChange, validationErrors, savedPanel, onSave }) => {
  const [testingNotification, setTestingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);

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

  const buttonDisabledStyle = {
    ...buttonStyle,
    background: '#6b7280',
    cursor: 'not-allowed',
    opacity: 0.6
  };

  const sendTestNotification = async () => {
    if (!settings.discord_webhook) {
      setNotificationStatus({ type: 'error', message: 'No webhook URL configured' });
      return;
    }

    if (validationErrors.discord_webhook) {
      setNotificationStatus({ type: 'error', message: 'Invalid webhook URL' });
      return;
    }

    setTestingNotification(true);
    try {
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
            footer: { text: 'EPG Merge v0.4.2' }
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

  return (
    <div style={panelContainerStyle}>
      <div style={panelHeaderStyle}>
        <h2 style={{ margin: 0 }}>🔔 Notifications</h2>
        <button onClick={() => onSave('notifications')} style={buttonStyle}>
          <Save size={16} /> Save
        </button>
      </div>

      {savedPanel === 'notifications' && (
        <div style={{
          marginBottom: '15px',
          padding: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '4px',
          color: '#86efac',
          fontSize: '12px'
        }}>
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
          onChange={(e) => onSettingChange('discord_webhook', e.target.value)}
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
            style={testingNotification || !settings.discord_webhook ? buttonDisabledStyle : buttonStyle}
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
  );
};