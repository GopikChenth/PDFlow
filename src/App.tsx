import { useState, useEffect, useCallback } from 'react';
import { PageView } from './types';
import FirstPage from './pages/FirstPage';
import WorkspacePage from './pages/WorkspacePage';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('firstPage');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Sync dark class on html root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Stable toggle dark mode callback
  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Stable view switchers
  const handleEnterWorkspace = useCallback(() => {
    setCurrentView('workspace');
  }, []);

  const handleReturnToCover = useCallback(() => {
    setCurrentView('firstPage');
  }, []);

  // Global keyboard shortcuts (⌘+Enter / Ctrl+Enter to toggle view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        setCurrentView((prev) => (prev === 'firstPage' ? 'workspace' : 'firstPage'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return currentView === 'firstPage' ? (
    <FirstPage
      onEnterWorkspace={handleEnterWorkspace}
      darkMode={darkMode}
      onToggleDarkMode={handleToggleDarkMode}
    />
  ) : (
    <WorkspacePage
      onReturnToCover={handleReturnToCover}
      darkMode={darkMode}
      onToggleDarkMode={handleToggleDarkMode}
    />
  );
}
