import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Terminal } from '../components/Terminal';
import { ProgressBar } from '../components/ProgressBar';

/**
 * Merge page component with detailed logging
 */
export const MergePage = ({ selectedSources }) => {
  const [logs, setLogs] = useState(['Ready to merge...']);
  const [progress, setProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [mergeComplete, setMergeComplete] = useState(false);
  const [mergedFilename, setMergedFilename] = useState('');
  const [mergedChannels, setMergedChannels] = useState(0);
  const [mergedPrograms, setMergedPrograms] = useState(0);
  const { call } = useApi();
  
  const addLog = (msg) => {
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
          output_filename: 'merged.xml.gz'
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
      addLog(`📏 Size: ${data.file_size}`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('Next: Download or Save as Current →');
      
      setMergedFilename(data.filename);
      setMergedChannels(data.channels_included);
      setMergedPrograms(data.programs_included);
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
      
      addLog(`✓ Downloaded ${filename} (${(blob.size / (1024**2)).toFixed(2)}MB)`);
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
        body: JSON.stringify({ filename: mergedFilename })
      });
      
      addLog('✓ Saved as current merge');
      addLog('✓ Previous version has been archived');
      addLog('');
      addLog('The file is now live as merged.xml.gz');
    } catch (err) {
      addLog(`✗ Save failed: ${err.message}`);
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
            onClick={() => setLogs(['Ready to merge...'])}
            disabled={merging}
          >
            🗑 Clear Log
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
        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          ℹ️ Be patient. Merge may take some time to complete depending on number and size of source files and number of channels selected.
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
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{ color: '#86efac', fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>✓ Merge Summary</strong></div>
              <div style={{ marginTop: '8px', color: '#cbd5e1' }}>
                • Channels: {mergedChannels}
              </div>
              <div style={{ color: '#cbd5e1' }}>
                • Programs: {mergedPrograms}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                Download to get the file, or click "Save as Current" to make it live
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};