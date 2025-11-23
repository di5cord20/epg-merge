import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { ArchivesTable } from './archives/ArchivesTable';
import { ArchivesChannels } from './archives/ArchivesChannels';
import { ArchivesLegend } from './archives/ArchivesLegend';

/**
 * ArchivesPage - v0.4.8 (Updated with Channels Versions Panel)
 * Main orchestrator for archives management
 * Displays both merged EPG files and channel versions using separate table components
 * Works with /data/current/ and /data/archives/ structure
 */
export const ArchivesPage = () => {
  const [archives, setArchives] = useState([]);
  const [channelVersions, setChannelVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sortBy, setSortBy] = useState('type');
  const [sortOrder, setSortOrder] = useState('desc');
  const [channelSortBy, setChannelSortBy] = useState('date');
  const [channelSortOrder, setChannelSortOrder] = useState('desc');
  const { call } = useApi();

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  const calculateDaysLeft = (createdAt, daysIncluded) => {
    if (!createdAt || daysIncluded === undefined || daysIncluded === null) {
      return null;
    }

    try {
      const created = new Date(createdAt);
      const today = new Date();
      
      created.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const lastDay = new Date(created);
      lastDay.setDate(lastDay.getDate() + daysIncluded - 1);
      
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
      const [archivesData, channelsData] = await Promise.all([
        call('/api/archives/list'),
        call('/api/channels/versions')
      ]);
      
      const archivesWithDaysLeft = (archivesData.archives || []).map(archive => ({
        ...archive,
        days_left: calculateDaysLeft(archive.created_at, archive.days_included)
      }));
      
      setArchives(archivesWithDaysLeft);
      setChannelVersions(channelsData.versions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleDownload = async (filename, type = 'archive') => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || '';
      const endpoint = type === 'channel' ? 'download-channel' : 'download';
      const url = `${apiBase}/api/archives/${endpoint}/${filename}`;
      
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

  const handleDelete = async (filename, type = 'archive') => {
    if (!window.confirm(`Delete: ${filename}?`)) return;
    
    setDeleting(filename);
    try {
      const apiBase = process.env.REACT_APP_API_BASE || '';
      const endpoint = type === 'channel' ? 'delete-channel' : 'delete';
      await call(`/api/archives/${endpoint}/${filename}`, {
        method: 'DELETE'
      });
      
      if (type === 'archive') {
        setArchives(archives.filter(a => a.filename !== filename));
      } else {
        setChannelVersions(channelVersions.filter(v => v.filename !== filename));
      }
    } catch (err) {
      setError(`Delete error: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // =========================================================================
  // SORTING - MERGED FILES
  // =========================================================================

  const sortedArchives = [...archives].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'type':
        if (a.is_current === b.is_current) {
          compareValue = new Date(b.created_at) - new Date(a.created_at);
        } else {
          compareValue = a.is_current ? -1 : 1;
        }
        break;
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // =========================================================================
  // SORTING - CHANNEL VERSIONS
  // =========================================================================

  const sortedChannels = [...channelVersions].sort((a, b) => {
    let compareValue = 0;
    
    switch (channelSortBy) {
      case 'type':
        if (a.is_current === b.is_current) {
          compareValue = new Date(b.created_at) - new Date(a.created_at);
        } else {
          compareValue = a.is_current ? -1 : 1;
        }
        break;
      case 'filename':
        compareValue = a.filename.localeCompare(b.filename);
        break;
      case 'date':
        compareValue = new Date(b.created_at) - new Date(a.created_at);
        break;
      case 'sources':
        compareValue = (b.sources_count || 0) - (a.sources_count || 0);
        break;
      case 'channels':
        compareValue = (b.channels_count || 0) - (a.channels_count || 0);
        break;
      case 'size':
        compareValue = (b.size_bytes || 0) - (a.size_bytes || 0);
        break;
      default:
        compareValue = 0;
    }
    
    return channelSortOrder === 'asc' ? -compareValue : compareValue;
  });

  const handleChannelSort = (field) => {
    if (channelSortBy === field) {
      setChannelSortOrder(channelSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setChannelSortBy(field);
      setChannelSortOrder('desc');
    }
  };

  // =========================================================================
  // STYLES
  // =========================================================================

  const sectionStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const buttonStyle = {
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
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="page-container">
      <h2>📦 Archives</h2>

      {/* ===== MERGED EPG FILES SECTION ===== */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              Manage current and historical merged EPG files
            </p>
          </div>
          <button
            onClick={fetchArchives}
            disabled={loading}
            style={buttonStyle}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

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

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <RefreshCw size={32} style={{ color: '#3b82f6', margin: '0 auto 15px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8' }}>Loading archives...</p>
          </div>
        )}

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

        {!loading && archives.length > 0 && (
          <ArchivesTable
            archives={sortedArchives}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onDownload={handleDownload}
            onDelete={handleDelete}
            deleting={deleting}
          />
        )}
      </div>

      {/* ===== CHANNEL VERSIONS SECTION ===== */}
      {!loading && (
        <div style={sectionStyle}>
          <div style={headerStyle}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                Saved channel JSON configurations with version history
              </p>
            </div>
          </div>

          {channelVersions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 20px',
              background: 'rgba(71, 85, 105, 0.2)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '8px'
            }}>
              <FileText size={32} style={{ color: '#64748b', margin: '0 auto 10px' }} />
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No channel versions saved yet</p>
            </div>
          ) : (
            <ArchivesChannels
              versions={sortedChannels}
              sortBy={channelSortBy}
              sortOrder={channelSortOrder}
              onSort={handleChannelSort}
              onDownload={(filename) => handleDownload(filename, 'channel')}
              onDelete={(filename) => handleDelete(filename, 'channel')}
              deleting={deleting}
            />
          )}
        </div>
      )}

      {/* ===== LEGEND SECTION ===== */}
      {!loading && archives.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#cbd5e1' }}>
            📋 Archives Guide
          </h3>
          <ArchivesLegend />
        </div>
      )}
    </div>
  );
};