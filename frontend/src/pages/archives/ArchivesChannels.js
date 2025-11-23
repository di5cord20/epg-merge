import React from 'react';
import { Download, Trash2 } from 'lucide-react';

/**
 * ArchivesChannels Component - v0.4.8
 * Renders sortable table of channel versions with download/delete actions
 */
export const ArchivesChannels = ({ versions, sortBy, sortOrder, onSort, onDownload, onDelete, deleting }) => {
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
            <th onClick={() => onSort('filename')} style={thStyle}>
              Filename {getSortIndicator('filename')}
            </th>
            <th onClick={() => onSort('date')} style={thStyle}>
              Created {getSortIndicator('date')}
            </th>
            <th onClick={() => onSort('sources')} style={{ ...thStyle, textAlign: 'center' }}>
              Sources {getSortIndicator('sources')}
            </th>
            <th onClick={() => onSort('channels')} style={{ ...thStyle, textAlign: 'center' }}>
              Channels {getSortIndicator('channels')}
            </th>
            <th onClick={() => onSort('size')} style={{ ...thStyle, textAlign: 'right' }}>
              Size {getSortIndicator('size')}
            </th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <tr
              key={version.filename}
              style={{
                background: version.is_current ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = version.is_current ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = version.is_current ? 'rgba(16, 185, 129, 0.05)' : 'transparent'}
            >
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {version.is_current ? (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        background: '#10b981',
                        borderRadius: '50%',
                        flexShrink: 0
                      }}
                      title="Current version"
                    />
                  ) : (
                    <span style={{ display: 'inline-block', fontSize: '14px', flexShrink: 0 }} title="Archive version">
                      📦
                    </span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', fontSize: '13px' }}>
                    {version.filename}
                  </span>
                </div>
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                {formatDate(version.created_at)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {version.sources_count !== undefined && version.sources_count !== null ? version.sources_count : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {version.channels_count !== undefined && version.channels_count !== null ? version.channels_count : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                {formatSize(version.size_bytes)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <button
                    onClick={() => onDownload(version.filename, 'channel')}
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
                    onClick={() => onDelete(version.filename, 'channel')}
                    disabled={deleting === version.filename || version.is_current}
                    title={version.is_current ? "Cannot delete current version" : "Delete"}
                    style={{
                      padding: '6px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      color: version.is_current ? '#9ca3af' : '#f87171',
                      borderRadius: '4px',
                      cursor: version.is_current ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: version.is_current ? 0.5 : 1
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