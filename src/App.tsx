import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { PageView } from './types';
import FirstPage from './pages/FirstPage';
import TitleBar from './components/TitleBar';

// Lazy-load non-initial viewports to reduce initial bundle and memory
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const ComparisonPage = lazy(() => import('./pages/comparison/ComparisonPage'));

function PageLoadingFallback() {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-background gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <span className="text-xs font-mono text-zinc-400">Loading module...</span>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('firstPage');
  const [activeTab, setActiveTab] = useState<string>('recent');
  const [activeDocName, setActiveDocName] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdflow_dark_mode');
      if (saved !== null) {
        return saved === 'true';
      }
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync dark class on html root & persist in localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('pdflow_dark_mode', 'true');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('pdflow_dark_mode', 'false');
      } catch {}
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

  const handleOpenComparison = useCallback(() => {
    setCurrentView('comparison');
  }, []);

  const handleSelectTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentView('workspace');
  }, []);

  const handleOpenDocument = useCallback(() => {
    setCurrentView('workspace');
    // Dispatch keyboard event for ⌘O
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true, metaKey: true }));
    }, 50);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Global keyboard shortcuts (⌘+Enter / Ctrl+Enter to toggle view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        setCurrentView((prev) => (prev === 'workspace' ? 'firstPage' : 'workspace'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-zinc-800 dark:text-zinc-200">
      
      {/* Global Desktop Custom TitleBar & Menu Bar */}
      <TitleBar
        title="PDF Studio"
        activeDocName={activeDocName}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenDocument={handleOpenDocument}
        onSelectTab={handleSelectTab}
        onReturnToCover={handleReturnToCover}
        onOpenComparison={handleOpenComparison}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main App Viewport */}
      <div className="flex-1 overflow-hidden relative">
        <Suspense fallback={<PageLoadingFallback />}>
          {currentView === 'firstPage' ? (
            <FirstPage
              onEnterWorkspace={handleEnterWorkspace}
              onOpenComparison={handleOpenComparison}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />
          ) : currentView === 'comparison' ? (
            <ComparisonPage
              onEnterWorkspace={handleEnterWorkspace}
              onReturnToCover={handleReturnToCover}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />
          ) : (
            <WorkspacePage
              onReturnToCover={handleReturnToCover}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              controlledActiveTab={activeTab}
              onActiveTabChange={setActiveTab}
              onActiveDocChange={setActiveDocName}
            />
          )}
        </Suspense>
      </div>

    </div>
  );
}
