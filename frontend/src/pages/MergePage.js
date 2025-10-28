import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Terminal } from '../components/Terminal';
import { ProgressBar } from '../components/ProgressBar';
import { X } from 'lucide-react';

/**
 * MergePage Component
 * Handles XML merge execution with:
 * - Real-time progress tracking
 * - Terminal log display with verbose popup
 * - Session persistence (survive page navigation)
 * - Archive save and cleanup
 */
export const MergePage = ({ selectedSources }) => {
  // Session-persisted state (survives page navigation)
  const [logs, setLogs] = useState(() => {
    const saved = sessionStorage.getItem('mergeLog');
    return saved ? JSON.parse(saved) : ['Ready to merge...'];
  });

  const [mergeComplete, setMergeComplete] = useState(() => {
    const saved = sessionStorage.getItem('mergeComplete');
    return saved ? JSON.parse(saved) : false;
  });

  const [mergedFilename, setMergedFilename] = useState(() => {
    const saved = sessionStorage.getItem('mergedFilename');
    return saved || '';
  });

  const [mergedChannels, setMergedChannels] = useState(() => {
    const saved = sessionStorage.getItem('mergedChannels');
    return saved ? parseInt(saved) : 0;
  });

  const [mergedPrograms, setMergedPrograms] = useState(() => {
    const saved = sessionStorage.getItem('mergedPrograms');
    return saved ? parseInt(saved) : 0;
  });

  const [mergedDaysIncluded, setMergedDaysIncluded] = useState(() => {
    const saved = sessionStorage.getItem('mergedDaysIncluded');
    return saved ? parseInt(saved) : 0;
  });

  const [mergedSize, setMergedSize] = useState(() => {
    const saved = sessionStorage.getItem('mergedSize');
    return saved || '';
  });

  // Non-persisted state (reset on page load)
  const [progress, setProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [showVerboseLog, setShowVerboseLog] = useState(false);
  const [verboseLogs, setVerboseLogs] = useState([]);
  const { call } = useApi();

  // Persist state to sessionStorage on changes
  useEffect(() => {
    sessionStorage.setItem('mergeLog', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    sessionStorage.setItem('mergeComplete', JSON.stringify(mergeComplete));
  }, [mergeComplete]);

  useEffect(() => {
    sessionStorage.setItem('mergedFilename', mergedFilename);
  }, [mergedFilename]);

  useEffect(() => {
    sessionStorage.setItem('mergedChannels', mergedChannels.toString());
  }, [mergedChannels]);

  useEffect(() => {
    sessionStorage.setItem('mergedPrograms', mergedPrograms.toString());
  }, [mergedPrograms]);

  useEffect(() => {
    sessionStorage.setItem('mergedDaysIncluded', mergedDaysIncluded.toString());
  }, [mergedDaysIncluded]);

  useEffect(() => {
    sessionStorage.setItem('mergedSize', mergedSize);
  }, [mergedSize]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
    setVerboseLogs(prev => [...prev, msg]);
  };

  const startMerge = async () => {
    if (selectedSources.length === 0) {
      alert('Please select sources first');
      return;
    }
    
    const channels = JSON.parse(localStorage.getItem('selectedChannels') || '[]');
    if (channels.length === 0) {
      alert('Please select channels first');
      return;
    }
    
    setMerging(true);
    setMergeComplete(false);
    setLogs(['🟢 Merge started...']);
    setProgress(0);
    setMergedFilename('');
    
    try {
      addLog(`📁 Sources: ${selectedSources.length}`);
      addLog(`📺 Channels: ${channels.length}`);
      addLog('');
      addLog('⏳ Executing merge...');
      addLog('');
      
      const startTime = Date.now();
      setProgress(5);
      
      // Simulate progress updates while waiting for merge
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 8;
          }
          return prev;
        });
      }, 800);
      
      // Make the merge request
      const data = await call('/api/merge/execute', {
        method: 'POST',
        body: JSON.stringify({
          sources: selectedSources,
          channels: channels,
          timeframe: '3',
          feed_type: 'iptv'
        })
      });
      
      clearInterval(progressInterval);
      const mergeTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      setProgress(95);
      
      // Add summary logs
      addLog('');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog(`✅ MERGE COMPLETED SUCCESSFULLY (${mergeTime}s)`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog(`📦 Filename: ${data.filename}`);
      addLog(`📊 Channels: ${data.channels_included}`);
      addLog(`📄 Programs: ${data.programs_included}`);
      addLog(`📅 Days: ${data.days_included}`);
      addLog(`📏 Size: ${data.file_size}`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('Next: Download or Save as Current →');
      
      setMergedFilename(data.filename);
      setMergedChannels(data.channels_included);
      setMergedPrograms(data.programs_included);
      setMergedDaysIncluded(data.days_included);
      setMergedSize(data.file_size);
      setProgress(100);
      setMergeComplete(true);
    } catch (err) {
      addLog('');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog(`❌ MERGE FAILED`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog(`Error: ${err.message}`);
      addLog('');
      addLog('Check backend terminal for detailed error information');
      setProgress(0);
    } finally {
      setMerging(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      addLog('');
      addLog(`⬇️ Downloading ${filename}...`);

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

      const sizeMB = (blob.size / (1024 ** 2)).toFixed(2);
      addLog(`✓ Downloaded ${filename} (${sizeMB}MB)`);
    } catch (err) {
      addLog(`✗ Download failed: ${err.message}`);
    }
  };

  const handleSaveAsCurrent = async () => {
    if (!mergedFilename) {
      alert('No merge to save');
      return;
    }

    try {
      addLog('');
      addLog('💾 Saving as current...');

      await call('/api/merge/save', {
        method: 'POST',
        body: JSON.stringify({
          filename: mergedFilename,
          channels: mergedChannels,
          programs: mergedPrograms,
          days_included: mergedDaysIncluded,
          size: mergedSize
        })
      });

      addLog('✓ Saved as current merge');
      addLog('✓ Previous version has been archived');
      addLog('🧹 Archive cleanup completed');
      addLog('');
      addLog('The file is now live as merged.xml.gz');
    } catch (err) {
      addLog(`✗ Save failed: ${err.message}`);
    }
  };

  const handleClearLog = () => {
    setLogs(['Ready to merge...']);
    sessionStorage.removeItem('mergeLog');
    setMergeComplete(false);
    setMergedFilename('');
    setMergedChannels(0);
    setMergedPrograms(0);
    setMergedDaysIncluded(0);
    setMergedSize('');
    sessionStorage.removeItem('mergeComplete');
    sessionStorage.removeItem('mergedFilename');
    sessionStorage.removeItem('mergedChannels');
    sessionStorage.removeItem('mergedPrograms');
    sessionStorage.removeItem('mergedDaysIncluded');
    sessionStorage.removeItem('mergedSize');
  };

  return (
    <div className="page-container">
      <h2>⚡ Execute Merge</h2>

      <div className="section">
        <div className="button-group">
          <button
            className="btn btn-primary btn-lg"
            onClick={startMerge}
            disabled={merging || selectedSources.length === 0}
          >
            {merging ? '⏳ Merging...' : '▶ Start Merge'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleClearLog}
            disabled={merging}
          >
            🗑 Clear Log
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowVerboseLog(true)}
            disabled={logs.length === 0}
            title="View detailed backend logs"
          >
            📋 Verbose Log
          </button>
        </div>

        {/* Progress Bar */}
        {(merging || mergeComplete) && (
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <ProgressBar progress={progress} />
          </div>
        )}

        {/* Terminal Log */}
        <Terminal logs={logs} />

        {/* Info Box */}
        <div
          style={{
            marginTop: '15px',
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#94a3b8'
          }}
        >
          ℹ️ Be patient. Merge may take some time to complete depending on number and size of
          source files and number of channels selected. Use "Verbose Log" button to see
          detailed backend information.
        </div>

        {/* Merge Complete Actions */}
        {mergeComplete && mergedFilename && (
          <div className="button-group">
            <button
              className="btn btn-success btn-lg"
              onClick={() => handleDownload(mergedFilename)}
            >
              ⬇️ Download {mergedFilename}
            </button>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleSaveAsCurrent}
              title="Save this merge as the current live file"
            >
              💾 Save as Current
            </button>
          </div>
        )}

        {/* Summary Card */}
        {mergeComplete && mergedFilename && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px'
            }}
          >
            <div style={{ color: '#86efac', fontSize: '14px', lineHeight: '1.6' }}>
              <div>
                <strong>✓ Merge Summary</strong>
              </div>
              <div style={{ marginTop: '8px', color: '#cbd5e1' }}>
                • Channels: {mergedChannels}
              </div>
              <div style={{ color: '#cbd5e1' }}>• Programs: {mergedPrograms}</div>
              <div style={{ color: '#cbd5e1' }}>• Days included: {mergedDaysIncluded}</div>
              <div style={{ color: '#cbd5e1' }}>• Size: {mergedSize}</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                Download to get the file, or click "Save as Current" to make it live
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verbose Log Popup Modal */}
      {showVerboseLog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '20px',
              maxWidth: '900px',
              width: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                paddingBottom: '15px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px' }}>
                📋 Verbose Merge Log
              </h3>
              <button
                onClick={() => setShowVerboseLog(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#e2e8f0',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Terminal Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                background: '#0a0e27',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '15px',
                fontFamily: "'Courier New', monospace",
                fontSize: '13px',
                color: '#00ff00',
                lineHeight: '1.6'
              }}
            >
              {logs.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color:
                      line.includes('❌') ? '#ff4444' :
                      line.includes('✅') ? '#44ff44' :
                      line.includes('⚠️') ? '#ffaa00' :
                      '#00ff00'
                  }}
                >
                  {line}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: '15px',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={() => setShowVerboseLog(false)}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};