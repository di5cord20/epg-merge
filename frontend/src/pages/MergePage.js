// removed "useEffect" - import React, { useState, useEffect } from 'react';
import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Terminal } from '../components/Terminal';
import { ProgressBar } from '../components/ProgressBar';

/**
 * Merge page component
 * Executes XML merge with real-time logging and progress tracking
 * Allows downloading of merged files
 * 
 * @param {Array} selectedSources - Sources selected on first page
 * @returns {React.ReactElement} Merge page component
 */
export const MergePage = ({ selectedSources }) => {
  const [logs, setLogs] = useState(['Ready to merge...']);
  const [progress, setProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [mergeComplete, setMergeComplete] = useState(false);
  const [mergedFilename, setMergedFilename] = useState('');
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
    
    try {
      addLog(`📁 Sources: ${selectedSources.length}`);
      addLog(`📺 Channels: ${channels.length}`);
      setProgress(25);
      
      const data = await call('/api/merge/execute', {
        method: 'POST',
        body: JSON.stringify({
          sources: selectedSources,
          channels: channels,
          output_filename: 'merged.xml.gz'
        })
      });
      
      setProgress(75);
      addLog('');
      addLog(`✅ Merge complete!`);
      addLog(`📦 File: ${data.filename}`);
      addLog(`📊 Channels: ${data.channels_included}, Programs: ${data.programs_included}`);
      addLog(`📏 Size: ${data.file_size}`);
      
      setMergedFilename(data.filename);
      setProgress(100);
      setMergeComplete(true);
    } catch (err) {
      addLog('');
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setMerging(false);
    }
  };
  
  const downloadMerged = () => {
    if (mergedFilename) {
      window.location.href = `${window.location.origin}/api/archives/download/${mergedFilename}`;
    }
  };
  
  return (
    <div className="page-container">
      <h2>⚡ Execute Merge</h2>
      
      <div className="section">
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
          style={{ marginLeft: '10px' }}
        >
          🗑 Clear Log
        </button>
        
        <Terminal logs={logs} />
        <ProgressBar progress={progress} />
        
        {mergeComplete && (
          <div className="button-group">
            <button 
              className="btn btn-success btn-lg"
              onClick={downloadMerged}
            >
              ⬇️ Download {mergedFilename}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};