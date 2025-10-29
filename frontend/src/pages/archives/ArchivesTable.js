import React from 'react';
import { Download, Trash2 } from 'lucide-react';

/**
 * ArchivesTable Component - v0.4.2
 * Renders sortable table of archives with download/delete actions
 */
export const ArchivesTable = ({ archives, sortBy, sortOrder, onSort, onDownload, onDelete, deleting }) => {
  const getDaysLeftColor = (days) => {
    if (days === undefined || days === null) return '#94a3b8';
    if (days === 0) return '#ff4444';
    if (days === 1) return '#ffaa00';
    if (days === 2) return '#ff8800';
    return '#10b981';
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) return ' ⇅';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const thStyle = {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#cbd5e1',
    cursor: 'pointer',
    userSelect: 'none',
    background: 'rgba(255, 255, 255, 0.05)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#cbd5e1'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th onClick={() => onSort('name')} style={thStyle}>
              Filename {getSortIndicator('name')}
            </th>
            <th onClick={() => onSort('date')} style={thStyle}>
              Created {getSortIndicator('date')}
            </th>
            <th onClick={() => onSort('size')} style={{ ...thStyle, textAlign: 'right' }}>
              Size {getSortIndicator('size')}
            </th>
            <th onClick={() => onSort('channels')} style={{ ...thStyle, textAlign: 'center' }}>
              Channels {getSortIndicator('channels')}
            </th>
            <th onClick={() => onSort('programs')} style={{ ...thStyle, textAlign: 'center' }}>
              Programs {getSortIndicator('programs')}
            </th>
            <th onClick={() => onSort('days_included')} style={{ ...thStyle, textAlign: 'center' }}>
              Days Included {getSortIndicator('days_included')}
            </th>
            <th onClick={() => onSort('days_left')} style={{ ...thStyle, textAlign: 'center' }}>
              Days Left {getSortIndicator('days_left')}
            </th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {archives.map((archive) => (
            <tr
              key={archive.filename}
              style={{
                background: archive.is_current ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = archive.is_current ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = archive.is_current ? 'rgba(16, 185, 129, 0.05)' : 'transparent'}
            >
              <td style={tdStyle}>
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
                    <span style={{ display: 'inline-block', fontSize: '14px', flexShrink: 0 }} title="Archive file">
                      📦
                    </span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', fontSize: '13px' }}>
                    {archive.filename}
                  </span>
                </div>
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                {formatDate(archive.created_at)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                {formatSize(archive.size_bytes)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {archive.channels !== undefined && archive.channels !== null ? archive.channels : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {archive.programs !== undefined && archive.programs !== null ? archive.programs : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {archive.days_included !== undefined && archive.days_included !== null ? archive.days_included : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
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
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button
                    onClick={() => onDownload(archive.filename)}
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
                    onClick={() => onDelete(archive.filename)}
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
  );
};