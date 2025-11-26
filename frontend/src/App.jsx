import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Dashboard } from './pages/DashboardPage';
import { SourcesPage } from './pages/SourcesPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ArchivesPage } from './pages/ArchivesPage';
import { MergePage } from './pages/MergePage';
import './App.css';

export const App = () => {
  const [jobStatus, setJobStatus] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);

  // ===== MONITOR JOB STATUS =====
  useEffect(() => {
    const checkJobStatus = async () => {
      try {
        const response = await fetch('/api/jobs/status');
        if (!response.ok) return;
        const data = await response.json();
        setJobStatus(data);
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    };

    // Check immediately and then every 5 seconds
    checkJobStatus();
    const interval = setInterval(checkJobStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // ===== NAVIGATION GUARD =====
  // Prevent navigation away while job is running
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (jobStatus?.is_running) {
        e.preventDefault();
        e.returnValue = 'A merge job is currently running. Leaving may affect performance. Continue?';
        return false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [jobStatus?.is_running]);

  return (
    <Router>
      {/* Warning banner when job is running */}
      {jobStatus?.is_running && (
        <div style={{
          background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          position: 'sticky',
          top: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          ⚠️ Merge job running - navigating pages may experience delays
        </div>
      )}

      <Navbar jobStatus={jobStatus} />
      
      <Routes>
        <Route path="/" element={<Dashboard jobStatus={jobStatus} />} />
        <Route path="/sources" element={<SourcesPage onSave={setSelectedSources} />} />
        <Route path="/channels" element={<ChannelsPage selectedSources={selectedSources} />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="/settings" element={<SettingsPage jobStatus={jobStatus} />} />
        <Route path="/archives" element={<ArchivesPage />} />
      </Routes>
    </Router>
  );
};

export default App;