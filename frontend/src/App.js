import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { useTheme } from './hooks/useTheme';
import { SourcesPage } from './pages/SourcesPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { MergePage } from './pages/MergePage';
import { ArchivesPage } from './pages/ArchivesPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

/**
 * Main App Component
 * Orchestrates page navigation and state management
 */
function App() {
  const [currentPage, setCurrentPage] = useState('sources');
  const [selectedSources, setSelectedSources] = useState([]);
  const { darkMode, toggleTheme } = useTheme();
  
  const renderPage = () => {
    switch(currentPage) {
      case 'sources':
        return <SourcesPage onSave={setSelectedSources} />;
      case 'channels':
        return <ChannelsPage selectedSources={selectedSources} />;
      case 'merge':
        return <MergePage selectedSources={selectedSources} />;
      case 'archives':
        return <ArchivesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };
  
  return (
    <ErrorBoundary>
      <div className={`app ${!darkMode ? 'light-mode' : ''}`}>
        <Navbar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onThemeToggle={toggleTheme}
          darkMode={darkMode}
        />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;