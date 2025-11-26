import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';

/**
 * Dashboard Page - v0.4.7
 * Enhanced with: Clear History button, new stats display
 * Shows: job status, history, next scheduled run
 */
export const DashboardPage = () => {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [cancellingJob, setCancellingJob] = useState(false);
  const { call } = useApi();

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  const fetchStatus = useCallback(async () => {
    try {
      const data = await call('/api/jobs/status');
      setStatus(data);
    } catch (err) {
      setError('Failed to fetch job status: ' + err.message);
    }
  }, [call]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await call('/api/jobs/history?limit=10');
      setHistory(data.jobs || []);
    } catch (err) {
      setError('Failed to fetch job history: ' + err.message);
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

  const handleClearHistory = async () => {
    if (!window.confirm('⚠️ This will DELETE ALL job history records. This action cannot be undone. Are you sure?')) {
      return;
    }

    setClearingHistory(true);
    try {
      setError(null);
      const result = await call('/api/jobs/clear-history', {
        method: 'POST'
      });
      
      setSuccess(`✅ Deleted ${result.deleted_count} job records`);
      setTimeout(() => setSuccess(null), 5000);
      
      // Refresh data
      await refreshData();
    } catch (err) {
      setError('Failed to clear history: ' + err.message);
    } finally {
      setClearingHistory(false);
    }
  };

  const handleCancelJob = async () => {
  if (!window.confirm('⚠️ This will forcefully terminate the running merge job. Continue?')) {
    return;
  }

  setCancellingJob(true);
    try {
      const response = await fetch('/api/jobs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.status === 'cancelled') {
        alert('✅ Job cancelled successfully. Scheduler can now run the next merge.');
        await refreshData(); // Refresh to update status
      } else if (data.status === 'no_job') {
        alert('ℹ️ No job currently running');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('❌ Failed to cancel job. Check console for details.');
    } finally {
      setCancellingJob(false);
    }
  };

  // =========================================================================
  // AUTO-REFRESH & INITIALIZATION
  // =========================================================================

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, status?.is_running ? 2000 : 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, status?.is_running, refreshData]);

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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (typeof bytes === 'string') return bytes; // Already formatted
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'failed': return '#ef4444';
      case 'timeout': return '#f59e0b';
      case 'running': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={20} color="#10b981" />;
      case 'failed': return <AlertCircle size={20} color="#ef4444" />;
      case 'timeout': return <AlertCircle size={20} color="#f59e0b" />;
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
          ❌ {error}
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '6px',
          color: '#86efac'
        }}>
          {success}
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

      {/* Control Buttons */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={refreshData}
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={(e) => !loading && (e.target.style.background = '#2563eb')}
          onMouseLeave={(e) => !loading && (e.target.style.background = '#3b82f6')}
        >
          <RefreshCw size={16} /> Refresh
        </button>

        <button
          onClick={handleClearHistory}
          disabled={clearingHistory || history.length === 0}
          style={{
            ...buttonStyle,
            background: clearingHistory || history.length === 0 ? '#6b7280' : '#ef4444',
            cursor: clearingHistory || history.length === 0 ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => !(clearingHistory || history.length === 0) && (e.target.style.background = '#dc2626')}
          onMouseLeave={(e) => !(clearingHistory || history.length === 0) && (e.target.style.background = '#ef4444')}
        >
          <Trash2 size={16} /> {clearingHistory ? 'Clearing...' : 'Clear History'}
        </button>

        <button
          onClick={handleCancelJob}
          disabled={cancellingJob || !status?.is_running}
          style={{
            ...buttonStyle,
            background: cancellingJob || !status?.is_running ? '#6b7280' : '#f97316',
            cursor: cancellingJob || !status?.is_running ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => !(cancellingJob || !status?.is_running) && (e.target.style.background = '#ea580c')}
          onMouseLeave={(e) => !(cancellingJob || !status?.is_running) && (e.target.style.background = '#f97316')}
          title={!status?.is_running ? 'No job currently running' : 'Force cancel the running merge job'}
        >
          <AlertCircle size={16} /> {cancellingJob ? 'Cancelling...' : 'Cancel Job'}
        </button>

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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '15px' }}>
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
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Peak Memory</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                    {status.latest_job.peak_memory_mb ? `${status.latest_job.peak_memory_mb.toFixed(2)} MB` : 'N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Days Included</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                    {status.latest_job.days_included || 'N/A'}
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

            {(status.latest_job.status === 'failed' || status.latest_job.status === 'timeout') && (
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
            No job history yet. Scheduled merges will appear here.
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {/* <th style={thStyle}>Job ID</th> */}
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Channels</th>
                <th style={thStyle}>Programs</th>
                <th style={thStyle}>Days Included</th>
                <th style={thStyle}>Memory</th>
              </tr>
            </thead>
            <tbody>
              {history.map((job) => (
                <tr key={job.job_id} style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  {/* <td style={tdStyle}>
                    <code style={{ fontSize: '12px', color: '#60a5fa' }}>{job.job_id.substring(0, 20)}...</code>
                  </td> */}
                  <td style={{ ...tdStyle, color: getStatusColor(job.status), fontWeight: '600' }}>
                    {job.status.toUpperCase()}
                  </td>
                  <td style={tdStyle}>{formatDate(job.started_at)}</td>
                  <td style={tdStyle}>{formatDuration(job.execution_time_seconds)}</td>
                  <td style={tdStyle}>{job.channels_included || '—'}</td>
                  <td style={tdStyle}>{job.programs_included || '—'}</td>
                  <td style={tdStyle}>{job.days_included || '—'}</td>
                  <td style={tdStyle}>{job.peak_memory_mb ? `${job.peak_memory_mb.toFixed(1)}MB` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};