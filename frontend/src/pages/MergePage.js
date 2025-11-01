import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Terminal } from '../components/Terminal';
import { ProgressBar } from '../components/ProgressBar';
import { X } from 'lucide-react';

/**
 * MergePage Component
 * Handles XML merge execution with:
 * - Real-time progress tracking
 * - Terminal log display with verbose popup
 * - Session persistence (survive page navigation)
 * - Uses saved timeframe from SourcesPage
 * - Archive save and cleanup
 * - Configurable output filename from settings
 */
export const MergePage = ({ selectedSources, settings }) => {
  // Retrieve saved timeframe and feedType from localStorage
  const [timeframe] = useLocalStorage('selectedTimeframe', '3');
  const [feedType] = useLocalStorage('selectedFeedType', 'iptv');
  
  // Session-persisted state (survives page navigation)
  const [logs, setLogs] = useState(() => {
    const saved = sessionStorage.getItem('mergeLog');
    return saved ? JSON.parse(saved) : ['Ready to merge...'];
  });

  const [mergeComplete, setMergeComplete] = useState(() => {
    const saved = sessionStorage.getItem('mergeComplete');
    return saved ? JSON.parse(saved) : false;
  });

  const [savedAsCurrent, setSavedAsCurrent] = useState(() => {
    const saved = sessionStorage.getItem('savedAsCurrent');
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
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [showVerboseLog, setShowVerboseLog] = useState(false);
  const { call } = useApi();

  // Persist state to sessionStorage on changes
  useEffect(() => {
    sessionStorage.setItem('mergeLog', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    sessionStorage.setItem('mergeComplete', JSON.stringify(mergeComplete));
  }, [mergeComplete]);

  useEffect(() => {
    sessionStorage.setItem('savedAsCurrent', JSON.stringify(savedAsCurrent));
  }, [savedAsCurrent]);

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
  };

  const addVerboseLog = (msg) => {
    // Verbose logs are stored separately and shown in the popup
    // They use the Linux-style prefix notation
    setLogs(prev => [...prev, msg]);
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
    setSavedAsCurrent(false);
    setShowProgressBar(true);
    setLogs(['🟢 Merge started...']);
    setProgress(0);
    setMergedFilename('');
    
    try {
      // Fetch fresh settings from API to get latest output_filename
      let outputFilename = 'merged.xml.gz';
      try {
        const settingsResponse = await fetch(
          process.env.REACT_APP_API_BASE 
            ? `${process.env.REACT_APP_API_BASE}/api/settings/get`
            : 'http://localhost:9193/api/settings/get'
        );
        if (settingsResponse.ok) {
          const freshSettings = await settingsResponse.json();
          outputFilename = freshSettings.output_filename || 'merged.xml.gz';
        }
      } catch (err) {
        console.warn('Could not fetch fresh settings, using default:', err);
        outputFilename = settings?.output_filename || 'merged.xml.gz';
      }
      
      addVerboseLog(`[*] Initializing merge process`);
      addVerboseLog(`[*] Configuration:`);
      addVerboseLog(`    - Sources: ${selectedSources.length} files`);
      addVerboseLog(`    - Channels to filter: ${channels.length}`);
      addVerboseLog(`    - Timeframe: ${timeframe} days`);
      addVerboseLog(`    - Feed type: ${feedType.toUpperCase()}`);
      addVerboseLog(`    - Output filename: ${outputFilename}`);
      
      addLog(`📁 Sources: ${selectedSources.length}`);
      addLog(`📺 Channels: ${channels.length}`);
      addLog(`📅 Timeframe: ${timeframe} days`);
      addLog(`📡 Feed Type: ${feedType.toUpperCase()}`);
      addLog(`📝 Output: ${outputFilename}`);
      addLog('');
      addLog('⏳ Executing merge...');
      addLog('');
      
      const startTime = Date.now();
      setProgress(5);
      addVerboseLog(`[*] Starting download phase...`);
      
      // Simulate progress updates while waiting for merge
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 8;
          }
          return prev;
        });
      }, 800);
      
      // Make the merge request with saved timeframe, feedType, and output filename
      const data = await call('/api/merge/execute', {
        method: 'POST',
        body: JSON.stringify({
          sources: selectedSources,
          channels: channels,
          timeframe: timeframe,
          feed_type: feedType,
          output_filename: outputFilename
        })
      });
      
      clearInterval(progressInterval);
      const mergeTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      setProgress(95);
      addVerboseLog('');
      addVerboseLog(`[+] Download phase completed`);
      addVerboseLog(`[*] Starting XML merge and filter phase...`);
      addVerboseLog(`[+] Merge phase completed`);
      addVerboseLog(`[*] Writing output file...`);
      addVerboseLog(`[+] File written successfully`);
      
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
      
      addVerboseLog('');
      addVerboseLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addVerboseLog(`[✓] MERGE COMPLETED SUCCESSFULLY (${mergeTime}s)`);
      addVerboseLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addVerboseLog(`[+] Result: ${data.filename}`);
      addVerboseLog(`[+] Channels included: ${data.channels_included}`);
      addVerboseLog(`[+] Programs included: ${data.programs_included}`);
      addVerboseLog(`[+] Days included: ${data.days_included}`);
      addVerboseLog(`[+] File size: ${data.file_size}`);
      addVerboseLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addVerboseLog('[*] Ready for download or save to current');
      
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
      addLog(`[✗] MERGE FAILED`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog(`[!] Error: ${err.message}`);
      addLog('');
      addLog('[*] Check backend terminal for detailed error information');
      setProgress(0);
    } finally {
      setMerging(false);
    }
  };

  const handleDownload = async () => {
    try {
      addLog('');
      
      // Fetch fresh settings from API to get latest output_filename
      let downloadFilename = 'merged.xml.gz';
      try {
        const settingsResponse = await fetch(
          process.env.REACT_APP_API_BASE 
            ? `${process.env.REACT_APP_API_BASE}/api/settings/get`
            : 'http://localhost:9193/api/settings/get'
        );
        if (settingsResponse.ok) {
          const freshSettings = await settingsResponse.json();
          downloadFilename = freshSettings.output_filename || 'merged.xml.gz';
        }
      } catch (err) {
        console.warn('Could not fetch fresh settings, using default:', err);
        downloadFilename = settings?.output_filename || 'merged.xml.gz';
      }
      
      addLog(`[*] Downloading current merge (${downloadFilename})...`);

      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:9193';
      // Download from /data/tmp/ (temporary merge file)
      const url = `${apiBase}/api/merge/download/${downloadFilename}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      const sizeMB = (blob.size / (1024 ** 2)).toFixed(2);
      addLog(`[+] Downloaded ${downloadFilename} (${sizeMB}MB)`);
    } catch (err) {
      addLog(`[✗] Download failed: ${err.message}`);
    }
  };

  const handleSaveAsCurrent = async () => {
    if (!mergedFilename) {
      alert('No merge to save');
      return;
    }

    try {
      addLog('');
      addLog(`[*] Saving merge as current...`);
      addLog(`[*] Archiving previous version...`);

      await call('/api/merge/save', {
        method: 'POST',
        body: JSON.stringify({
          channels: mergedChannels,
          programs: mergedPrograms,
          days_included: mergedDaysIncluded
        })
      });

      // Fetch fresh settings to get the correct output filename for logging
      let outputFilename = 'merged.xml.gz';
      try {
        const settingsResponse = await fetch(
          process.env.REACT_APP_API_BASE 
            ? `${process.env.REACT_APP_API_BASE}/api/settings/get`
            : 'http://localhost:9193/api/settings/get'
        );
        if (settingsResponse.ok) {
          const freshSettings = await settingsResponse.json();
          outputFilename = freshSettings.output_filename || 'merged.xml.gz';
        }
      } catch (err) {
        console.warn('Could not fetch fresh settings, using default:', err);
        outputFilename = settings?.output_filename || 'merged.xml.gz';
      }
      
      addLog(`[+] Previous version archived with timestamp`);
      addLog(`[*] Promoting new merge to current...`);
      addLog(`[+] Merge promoted to current (${outputFilename})`);
      addLog(`[+] Updating database metadata...`);
      addLog(`[+] Database updated`);
      addLog(`[*] Running archive cleanup...`);
      addLog(`[+] Archive cleanup completed`);
      addLog('');
      addLog(`[✓] Successfully saved as current merge`);
      addLog(`[✓] File is now live as ${outputFilename}`);
      
      setSavedAsCurrent(true);
    } catch (err) {
      addLog(`[✗] Save failed: ${err.message}`);
    }
  };

  const handleClearLog = async () => {
    setLogs(['Ready to merge...']);
    setShowProgressBar(false);
    sessionStorage.removeItem('mergeLog');
    setMergeComplete(false);
    setSavedAsCurrent(false);
    setMergedFilename('');
    setMergedChannels(0);
    setMergedPrograms(0);
    setMergedDaysIncluded(0);
    setMergedSize('');
    setProgress(0);
    sessionStorage.removeItem('mergeComplete');
    sessionStorage.removeItem('savedAsCurrent');
    sessionStorage.removeItem('mergedFilename');
    sessionStorage.removeItem('mergedChannels');
    sessionStorage.removeItem('mergedPrograms');
    sessionStorage.removeItem('mergedDaysIncluded');
    sessionStorage.removeItem('mergedSize');
    
    // Clear temporary merge files from /data/tmp/
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:9193';
      const response = await fetch(`${apiBase}/api/merge/clear-temp`, {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        addLog(`[*] Cleared ${result.deleted} temporary files (${result.freed_mb}MB freed)`);
      }
    } catch (err) {
      console.warn('Could not clear temp files:', err);
    }
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
            title="View all merge details"
          >
            📋 Verbose Log
          </button>
        </div>

        {/* Progress Bar - Only show during merge or until clear */}
        {showProgressBar && (
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
          ℹ️ Using <strong style={{ color: '#cbd5e1' }}>{timeframe} days</strong> timeframe and <strong style={{ color: '#cbd5e1' }}>{feedType.toUpperCase()}</strong> feed type from Sources page.
          Be patient. Merge may take some time to complete depending on number and size of source files and number of channels selected. 
          Use "Verbose Log" button to see detailed information.
        </div>

        {/* Merge Complete Actions */}
        {mergeComplete && mergedFilename && (
          <div className="button-group">
            <button
              className="btn btn-success btn-lg"
              onClick={() => handleDownload()}
            >
              ⬇️ Download Current Merge
            </button>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleSaveAsCurrent}
              disabled={savedAsCurrent}
              title={savedAsCurrent ? "Current merged file has already been saved as current" : "Save this merge as the current live file"}
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
              {savedAsCurrent && (
                <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px', color: '#86efac', fontSize: '12px' }}>
                  ✓ Already saved as current merge
                </div>
              )}
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
                      line.includes('[✗]') ? '#ff4444' :
                      line.includes('[✓]') ? '#44ff44' :
                      line.includes('[+]') ? '#44ff44' :
                      line.includes('[!]') ? '#ffaa00' :
                      line.includes('[*]') ? '#00ccff' :
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