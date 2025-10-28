import React, { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, RefreshCw, FileText } from 'lucide-react';
import { useApi } from '../hooks/useApi';

const ArchivesPage = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const { call } = useApi();

  // ========== HELPER FUNCTIONS ==========

  /**
   * Get color for days left based on value
   * 0 days = Red, 1 day = Yellow, 2 days = Orange, 3+ = Green
   */
  const getDaysLeftColor = (days) => {
    if (days === undefined || days === null) return '#94a3b8'; // gray
    if (days === 0) return '#ff4444';     // red (expired)
    if (days === 1) return '#ffaa00';     // yellow (urgent)
    if (days === 2) return '#ff8800';     // orange (warning)
    return '#10b981';                      // green (safe)
  };

  /**
   * Calculate days left until programming expires
   * Assumes programs span consecutive days starting from created_at
   * Formula: created_at + days_included - today = days_left
   */
  const calculateDaysLeft = (createdAt, daysIncluded) => {
    if (!createdAt || daysIncluded === undefined || daysIncluded === null) {
      return null;
    }

    try {
      const created = new Date(createdAt);
      const today = new Date();
      
      // Set both to midnight for consistent date comparison
      created.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      // Calculate last day of programming
      const lastDay = new Date(created);
      lastDay.setDate(lastDay.getDate() + daysIncluded - 1);
      
      // Calculate days remaining
      const timeDiff = lastDay - today;
      const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      
      return daysLeft;
    } catch (err) {
      console.error('Error calculating days left:', err);
      return null;
    }
  };

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call('/api/archives/list');
      
      // Add calculated days_left to each archive
      const archivesWithDaysLeft = (data.archives || []).map(archive => ({
        ...archive,
        days_left: calculateDaysLeft(archive.created_at, archive.days_included)
      }));
      
      setArchives(archivesWithDaysLeft);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  // Download archive
  const handleDownload = async (filename) => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:9193';
      const url = `${apiBase}/api/archives/download/${filename}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Download error: ${err.message}`);
    }
  };

  // Delete archive
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete archive: ${filename}?`)) return;
    
    setDeleting(filename);
    try {
      await call(`/api/archives/delete/${filename}`, {
        method: 'DELETE'
      });
      
      setArchives(archives.filter(a => a.filename !== filename));
    } catch (err) {
      setError(`Delete error: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // Format file size from bytes
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Sort archives
  const sortedArchives = [...archives].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'date':
        compareValue = new Date(b.created_at) - new Date(a.created_at);
        break;
      case 'name':
        compareValue = a.filename.localeCompare(b.filename);
        break;
      case 'size':
        compareValue = (b.size_bytes || 0) - (a.size_bytes || 0);
        break;
      case 'channels':
        compareValue = (b.channels || 0) - (a.channels || 0);
        break;
      case 'programs':
        compareValue = (b.programs || 0) - (a.programs || 0);
        break;
      case 'days_included':
        compareValue = (b.days_included || 0) - (a.days_included || 0);
        break;
      case 'days_left':
        const daysLeftA = a.days_left || -1;
        const daysLeftB = b.days_left || -1;
        compareValue = daysLeftB - daysLeftA;
        break;
      default:
        compareValue = 0;
    }
    
    return sortOrder === 'asc' ? -compareValue : compareValue;
  });

  // Handle sort click
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) return ' ⇅';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="page-container">
      <h2>📦 Archives</h2>

      <div className="section">
        {/* Header with Refresh Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              Manage merged EPG files and historical versions
            </p>
          </div>
          <button
            onClick={fetchArchives}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '15px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <RefreshCw size={32} style={{ color: '#3b82f6', margin: '0 auto 15px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8' }}>Loading archives...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && archives.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(71, 85, 105, 0.2)',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            borderRadius: '8px'
          }}>
            <FileText size={40} style={{ color: '#64748b', margin: '0 auto 15px' }} />
            <p style={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '5px' }}>No archives yet</p>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Start merging EPG sources to create archives</p>
          </div>
        )}

        {/* Archives Table */}
        {!loading && archives.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th
                    onClick={() => handleSort('name')}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Filename {getSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSort('date')}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Created {getSortIndicator('date')}
                  </th>
                  <th
                    onClick={() => handleSort('size')}
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Size {getSortIndicator('size')}
                  </th>
                  <th
                    onClick={() => handleSort('channels')}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Channels {getSortIndicator('channels')}
                  </th>
                  <th
                    onClick={() => handleSort('programs')}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Programs {getSortIndicator('programs')}
                  </th>
                  <th
                    onClick={() => handleSort('days_included')}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Days Included {getSortIndicator('days_included')}
                  </th>
                  <th
                    onClick={() => handleSort('days_left')}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Days Left {getSortIndicator('days_left')}
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#cbd5e1' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedArchives.map((archive) => (
                  <tr
                    key={archive.filename}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: archive.is_current ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = archive.is_current ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = archive.is_current ? 'rgba(16, 185, 129, 0.05)' : 'transparent'}
                  >
                    <td style={{ padding: '12px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {archive.is_current ? (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              background: '#10b981',
                              borderRadius: '50%',
                              flexShrink: 0
                            }}
                            title="Current file"
                          />
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '14px',
                              flexShrink: 0
                            }}
                            title="Archive file"
                          >
                            📦
                          </span>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{archive.filename}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      {formatDate(archive.created_at)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {formatSize(archive.size_bytes)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1' }}>
                      {archive.channels !== undefined && archive.channels !== null ? archive.channels : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1' }}>
                      {archive.programs !== undefined && archive.programs !== null ? archive.programs : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1' }}>
                      {archive.days_included !== undefined && archive.days_included !== null ? archive.days_included : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{
                        color: getDaysLeftColor(archive.days_left),
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {archive.days_left !== undefined && archive.days_left !== null 
                          ? `${archive.days_left}` 
                          : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleDownload(archive.filename)}
                          title="Download"
                          style={{
                            padding: '6px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: 'none',
                            color: '#60a5fa',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(archive.filename)}
                          disabled={deleting === archive.filename || archive.is_current}
                          title={archive.is_current ? "Cannot delete current file" : "Delete"}
                          style={{
                            padding: '6px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: 'none',
                            color: archive.is_current ? '#9ca3af' : '#f87171',
                            borderRadius: '4px',
                            cursor: archive.is_current ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: archive.is_current ? 0.5 : 1
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend & Guide Section - Separate from Archives Table */}
      {!loading && archives.length > 0 && (
        <div className="section">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#cbd5e1' }}>
            📋 Archives Guide
          </h3>

          {/* File Status Section */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              File Status
            </div>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    background: '#10b981',
                    borderRadius: '50%',
                    flexShrink: 0
                  }}
                />
                <div>
                  <strong style={{ color: '#86efac' }}>Current</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Live merged file being used by the system</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>📦</span>
                <div>
                  <strong style={{ color: '#cbd5e1' }}>Archive</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Historical version (read-only, can be deleted)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Columns Section */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Table Columns
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Filename</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>File name with creation timestamp</div>
              </div>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Created</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Date and time file was created</div>
              </div>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Size</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Compressed file size in MB</div>
              </div>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Channels</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Number of TV channels included</div>
              </div>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Programs</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Total program listings in file</div>
              </div>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Days Included</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Timeframe (3, 7, or 14 days)</div>
              </div>
              <div>
                <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Days Left</strong>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Remaining days of programming data</div>
              </div>
            </div>
          </div>

          {/* Days Left Color Legend */}
          <div style={{ marginBottom: '25px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Days Left - Urgency Indicator
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>3+</span>
                <div>
                  <div style={{ color: '#cbd5e1' }}>Safe</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Plenty of time remaining</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: '#ff8800', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>2</span>
                <div>
                  <div style={{ color: '#cbd5e1' }}>Warning</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Getting close to expiring</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: '#ffaa00', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>1</span>
                <div>
                  <div style={{ color: '#cbd5e1' }}>Urgent</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Last day of data</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: '#ff4444', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>0</span>
                <div>
                  <div style={{ color: '#cbd5e1' }}>Expired</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>No programming data left</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Action Buttons
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  borderRadius: '6px',
                  flexShrink: 0,
                  fontWeight: '600'
                }}>
                  ⬇️
                </span>
                <div>
                  <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Download</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Save the archive file to your computer as .gz format</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  borderRadius: '6px',
                  flexShrink: 0,
                  fontWeight: '600'
                }}>
                  🗑️
                </span>
                <div>
                  <strong style={{ color: '#f87171', fontSize: '13px' }}>Delete</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Permanently remove archive file (not available for current file)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ArchivesPage };