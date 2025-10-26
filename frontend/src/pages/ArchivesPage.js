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

  // Wrap fetchArchives in useCallback to memoize it
  const fetchArchives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call('/api/archives/list');
      setArchives(data.archives || []);
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <p className="text-slate-400 text-sm">Manage merged EPG files and historical versions</p>
          </div>
          <button
            onClick={fetchArchives}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-700 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw size={32} className="text-blue-500 mx-auto mb-3 animate-spin" />
            <p className="text-slate-400">Loading archives...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && archives.length === 0 && (
          <div className="text-center py-12 bg-slate-700/30 rounded border border-slate-600">
            <FileText size={40} className="mx-auto text-slate-500 mb-3" />
            <p className="text-slate-300 font-medium">No archives yet</p>
            <p className="text-slate-400 text-sm">Start merging EPG sources to create archives</p>
          </div>
        )}

        {/* Archives Table */}
        {!loading && archives.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-800/50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-300 cursor-pointer hover:text-white transition"
                      onClick={() => handleSort('name')}>
                    Filename {getSortIndicator('name')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300 cursor-pointer hover:text-white transition"
                      onClick={() => handleSort('date')}>
                    Created {getSortIndicator('date')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-300">Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300 cursor-pointer hover:text-white transition"
                      onClick={() => handleSort('size')}>
                    Size {getSortIndicator('size')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-300 cursor-pointer hover:text-white transition"
                      onClick={() => handleSort('channels')}>
                    Channels {getSortIndicator('channels')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-300 cursor-pointer hover:text-white transition"
                      onClick={() => handleSort('programs')}>
                    Programs {getSortIndicator('programs')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedArchives.map((archive) => (
                  <tr
                    key={archive.filename}
                    className={`border-b border-slate-700 hover:bg-slate-800/50 transition ${
                      archive.is_current ? 'bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {archive.is_current && (
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Current"></span>
                        )}
                        <span className="truncate">{archive.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {formatDate(archive.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        archive.is_current
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-slate-700/50 text-slate-300'
                      }`}>
                        {archive.is_current ? 'Current' : 'Archive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-right font-mono">
                      {formatSize(archive.size_bytes)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {archive.channels !== undefined && archive.channels !== null ? archive.channels : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {archive.programs !== undefined && archive.programs !== null ? archive.programs : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownload(archive.filename)}
                          title="Download"
                          className="p-2 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 transition"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(archive.filename)}
                          disabled={deleting === archive.filename}
                          title="Delete"
                          className="p-2 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {!loading && archives.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Current file</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700/50">Archive</span>
              <span>Historical version</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { ArchivesPage };