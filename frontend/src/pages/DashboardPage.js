import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, PlayCircle, Pause, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useApi } from '../hooks/useApi';

/**
 * Dashboard Page - v0.4.0
 * Displays scheduled job status, history, and quick actions
 * Run Now executes merge with saved sources/channels/settings
 */
export const DashboardPage = () => {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [running, setRunning] = useState(false);
  const { call } = useApi();

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  const fetchStatus = useCallback(async () => {
    try {
      console.log('Fetching job status...');
      const data = await call('/api/jobs/status');
      console.log('Status received:', data);
      setStatus(data);
    } catch (err) {
      setError('Failed to fetch job status: ' + err.message);
      console.error('Status fetch error:', err);
    }
  }, [call]);

  const fetchHistory = useCallback(async () => {
    try {
      console.log('Fetching job history...');
      const data = await call('/api/jobs/history?limit=10');
      console.log('History received:', data);
      setHistory(data.jobs || []);
    } catch (err) {
      setError('Failed to fetch job history: ' + err.message);
      console.error('History fetch error:', err);
    }
  }, [call]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStatus(), fetchHistory()]);
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, fetchHistory]);

  // =========================================================================
  // AUTO-REFRESH & INITIALIZATION
  // =========================================================================

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    // Refresh more frequently if job is running
    const interval = status?.is_running ? 2000 : 10000;
    const timer = setInterval(refreshData, interval);

    return () => clearInterval(timer);
  }, [autoRefresh, status?.is_running]);

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleRunNowTest = async () => {
    try {
      setError(null);
      setRunning(true);

      // Load saved sources, channels, and settings from localStorage
      const selectedSources = JSON.parse(localStorage.getItem('selectedSources') || '[]');
      const selectedChannels = JSON.parse(localStorage.getItem('selectedChannels') || '[]');
      
      // FIX: Parse timeframe as integer, not string
      const timeframe = localStorage.getItem('selectedTimeframe') || '3';
      const feedType = localStorage.getItem('selectedFeedType') || 'iptv';

      // Validate
      if (selectedSources.length === 0) {
        setError('❌ No sources selected. Please go to Sources page and select sources.');
        setRunning(false);
        return;
      }

      if (selectedChannels.length === 0) {
        setError('❌ No channels selected. Please go to Channels page and select channels.');
        setRunning(false);
        return;
      }

      console.log('Triggering merge with:', {
        sources: selectedSources.length,
        channels: selectedChannels.length,
        timeframe: timeframe,
        feedType: feedType
      });

      // Trigger scheduled merge job (which handles everything + saves job history)
      const jobResult = await call('/api/jobs/execute', {
        method: 'POST'
      });
      
      console.log('Job execution result:', jobResult);

      // Refresh status immediately
      await refreshData();
      alert('✅ Merge completed successfully!');
    } catch (err) {
      setError('Failed to run merge: ' + err.message);
      console.error('Merge error:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleCancelJob = async () => {
    if (!window.confirm('Cancel running job?')) return;

    try {
      setError(null);
      const result = await call('/api/jobs/cancel', { method: 'POST' });
      alert(result.message || 'Job cancelled');
      await refreshData();
    } catch (err) {
      setError('Failed to cancel job: ' + err.message);
    }
  };

  // =========================================================================
  // FORMATTERS
  // =========================================================================

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} color="#10b981" />;
      case 'failed': return <AlertCircle size={20} color="#ef4444" />;
      case 'running': return <RefreshCw size={20} color="#3b82f6" style={{ animation: 'spin 2s linear infinite' }} />;
      default: return <Clock size={20} color="#6b7280" />;
    }
  };

  // =========================================================================
  // STYLES
  // =========================================================================

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px'
  };

  const buttonStyle = {
    padding: '10px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  };

  const thStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1'
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="page-container">
      <h2>📊 Dashboard</h2>

      {/* Error Alert */}
      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          color: '#fca5a5'
        }}>
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div style={containerStyle}>
        {/* Job Status Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            {status?.is_running ? <RefreshCw size={24} color="#3b82f6" style={{ animation: 'spin 2s linear infinite' }} /> : <TrendingUp size={24} color="#10b981" />}
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Job Status</h3>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: status?.is_running ? '#3b82f6' : '#10b981', marginBottom: '8px' }}>
            {status?.is_running ? '🔄 Running' : '✅ Idle'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {status?.is_running ? 'Merge job in progress' : 'No jobs currently running'}
          </div>
        </div>

        {/* Next Run Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <Clock size={24} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Next Scheduled Run</h3>
          </div>
          <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '8px' }}>
            {status?.next_scheduled_run ? formatDate(status.next_scheduled_run) : 'Not configured'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Check Settings to configure schedule
          </div>
        </div>

        {/* Last Run Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            {status?.latest_job ? getStatusIcon(status.latest_job.status) : <Clock size={24} color="#6b7280" />}
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Last Run</h3>
          </div>
          <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '8px' }}>
            {status?.latest_job ? status.latest_job.status.toUpperCase() : 'No runs yet'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {status?.latest_job ? formatDate(status.latest_job.started_at) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={refreshData}
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={(e) => e.target.style.background = '#2563eb'}
          onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
        >
          <RefreshCw size={16} /> Refresh
        </button>

        <button
          onClick={handleRunNowTest}
          disabled={status?.is_running || loading || running}
          style={{
            ...buttonStyle,
            background: status?.is_running ? '#6b7280' : '#10b981',
            cursor: status?.is_running ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => !status?.is_running && (e.target.style.background = '#059669')}
          onMouseLeave={(e) => !status?.is_running && (e.target.style.background = '#10b981')}
        >
          <PlayCircle size={16} /> {running ? 'Starting...' : 'Run Now (Test)'}
        </button>

        {status?.is_running && (
          <button
            onClick={handleCancelJob}
            style={{
              ...buttonStyle,
              background: '#ef4444'
            }}
            onMouseEnter={(e) => e.target.style.background = '#dc2626'}
            onMouseLeave={(e) => e.target.style.background = '#ef4444'}
          >
            <Pause size={16} /> Cancel
          </button>
        )}

        {/* Auto-refresh toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Auto-refresh</span>
        </label>
      </div>

      {/* Latest Job Details */}
      {status?.latest_job && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Latest Job Details</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Status</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: getStatusColor(status.latest_job.status) }}>
                {status.latest_job.status.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Execution Time</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                {formatDuration(status.latest_job.execution_time_seconds)}
              </div>
            </div>

            {status.latest_job.status === 'success' && (
              <>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Channels</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                    {status.latest_job.channels_included || 0}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Programs</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                    {status.latest_job.programs_included || 0}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>File Size</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                    {status.latest_job.file_size || 'N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                    {formatDate(status.latest_job.completed_at)}
                  </div>
                </div>
              </>
            )}

            {status.latest_job.status === 'failed' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Error</div>
                <div style={{ fontSize: '13px', color: '#fca5a5', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', fontFamily: 'monospace' }}>
                  {status.latest_job.error_message || 'Unknown error'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job History Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        overflowX: 'auto'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Recent Job History</h3>
        
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
            No job history yet. Run a job to see results.
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Job ID</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Channels</th>
                <th style={thStyle}>Programs</th>
              </tr>
            </thead>
            <tbody>
              {history.map((job) => (
                <tr key={job.job_id} style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <td style={tdStyle}>
                    <code style={{ fontSize: '12px', color: '#60a5fa' }}>{job.job_id.substring(0, 20)}...</code>
                  </td>
                  <td style={{ ...tdStyle, color: getStatusColor(job.status), fontWeight: '600' }}>
                    {job.status.toUpperCase()}
                  </td>
                  <td style={tdStyle}>{formatDate(job.started_at)}</td>
                  <td style={tdStyle}>{formatDuration(job.execution_time_seconds)}</td>
                  <td style={tdStyle}>{job.channels_included || '—'}</td>
                  <td style={tdStyle}>{job.programs_included || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};