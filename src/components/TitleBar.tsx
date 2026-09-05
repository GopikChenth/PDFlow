import { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  FileText,
  FolderOpen, 
  Layers, 
  Combine, 
  Scissors, 
  Minimize2, 
  Stamp, 
  Lock, 
  Maximize2,
  Plus,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppMode } from '../types';

interface TitleBarProps {
  title?: string;
  activeDocName?: string | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDocument?: () => void;
  onSelectTab?: (tab: string) => void;
  onReturnToCover?: () => void;
  onToggleFullscreen?: () => void;
  currentMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
}

export default function TitleBar({
  title = 'Ink Vault',
  activeDocName,
  darkMode,
  onToggleDarkMode,
  onOpenDocument,
  onSelectTab,
  onReturnToCover,
  onToggleFullscreen,
  currentMode = 'editor',
  onSelectMode,
}: TitleBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isTauri, setIsTauri] = useState<boolean>(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Detect Tauri Environment
  useEffect(() => {
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      setIsTauri(true);
      try {
        const appWindow = getCurrentWindow();
        appWindow.isMaximized().then(setIsMaximized).catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Close menus on outside click or Esc (registered only while a menu is open)
  useEffect(() => {
    if (!activeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  // Window Actions
  const handleMinimize = async () => {
    if (isTauri) {
      try {
        await getCurrentWindow().minimize();
      } catch {
        /* ignore */
      }
    }
  };

  const handleMaximize = async () => {
    if (isTauri) {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
        setIsMaximized(await appWindow.isMaximized());
      } catch {
        /* ignore */
      }
    } else if (onToggleFullscreen) {
      onToggleFullscreen();
    }
  };

  const handleClose = async () => {
    if (isTauri) {
      try {
        await getCurrentWindow().close();
      } catch {
        /* ignore */
      }
    } else if (window.confirm('Close Ink Vault application?')) {
      window.close();
    }
  };

  const toggleMenu = (menuName: string) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleMenuHover = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  const handleAction = (action: () => void) => {
    setActiveMenu(null);
    action();
  };

  return (
    <div 
      ref={menuContainerRef}
      data-tauri-drag-region
      className="h-8 w-full bg-surface dark:bg-surface border-b border-border flex items-center justify-between px-2 select-none z-50 text-xs text-zinc-700 dark:text-zinc-300 flex-shrink-0"
    >
      {/* 1. Left: Brand & Menu Items */}
      <div className="flex items-center gap-1 min-w-0" data-tauri-drag-region>
        
        {/* App Icon */}
        <div 
          onClick={onReturnToCover}
          className="h-5 w-5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-black text-[9px] shadow-xs cursor-pointer hover:bg-accent transition-colors mr-1"
          title="Ink Vault Home"
        >
          IV
        </div>

        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] mr-1 hidden sm:inline">
          {title}
        </span>

        {/* Menu 1: File */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'file' 
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            File
          </button>

          {activeMenu === 'file' && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-card dark:bg-[#1c1c22] border border-border shadow-2xl py-1 z-50 text-[11px] flex flex-col animate-in fade-in zoom-in-95 duration-75">
              {onOpenDocument && (
                <>
                  <button
                    onClick={() => handleAction(onOpenDocument)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" /> New Tab...
                    </span>
                    <span className="text-[9px] font-mono opacity-60">⌘T</span>
                  </button>

                  <button
                    onClick={() => handleAction(onOpenDocument)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-3.5 w-3.5" /> Open Document...
                    </span>
                    <span className="text-[9px] font-mono opacity-60">⌘O</span>
                  </button>
                </>
              )}

              {onSelectTab && (
                <button
                  onClick={() => handleAction(() => onSelectTab('recent'))}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" /> Recent Documents
                  </span>
                </button>
              )}

              {currentMode === 'editor' && onSelectTab && (
                <>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => handleAction(() => onSelectTab('merge'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <Combine className="h-3.5 w-3.5" /> Merge PDF
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('split'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <Scissors className="h-3.5 w-3.5" /> Split & Extract
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('compress'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <Minimize2 className="h-3.5 w-3.5" /> Compress PDF
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('watermark'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <Stamp className="h-3.5 w-3.5" /> Watermark
                  </button>
                  <button
                    onClick={() => handleAction(() => onSelectTab('protect'))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                  >
                    <Lock className="h-3.5 w-3.5" /> Protect & Unlock
                  </button>
                </>
              )}

              <div className="my-1 border-t border-border" />

              {onReturnToCover && (
                <button
                  onClick={() => handleAction(onReturnToCover)}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                >
                  <span>Presentation Cover</span>
                  <span className="text-[9px] font-mono opacity-60">⌘Enter</span>
                </button>
              )}

              <button
                onClick={() => handleAction(handleClose)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-500 hover:text-white transition-colors text-left text-rose-500"
              >
                <span>Exit Ink Vault</span>
                <span className="text-[9px] font-mono opacity-60">⌘Q</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 2: Edit */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'edit' 
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Edit
          </button>

          {activeMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-card dark:bg-[#1c1c22] border border-border shadow-2xl py-1 z-50 text-[11px] flex flex-col animate-in fade-in zoom-in-95 duration-75">

              <button
                onClick={() => handleAction(() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, metaKey: true }));
                })}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span>Select All Pages</span>
                <span className="text-[9px] font-mono opacity-60">⌘A</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 3: View */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('view')}
            onMouseEnter={() => handleMenuHover('view')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'view' 
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            View
          </button>

          {activeMenu === 'view' && (
            <div className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-card dark:bg-[#1c1c22] border border-border shadow-2xl py-1 z-50 text-[11px] flex flex-col animate-in fade-in zoom-in-95 duration-75">
              <button
                onClick={() => handleAction(onToggleDarkMode)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘T</span>
              </button>

              {onSelectTab && (
                <button
                  onClick={() => handleAction(() => onSelectTab('viewer'))}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
                >
                  <FileText className="h-3.5 w-3.5" /> PDF Viewer
                </button>
              )}

              <div className="my-1 border-t border-border" />

              <div className="px-3 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Workflow Mode
              </div>
              <button
                onClick={() => handleAction(() => onSelectMode && onSelectMode('editor'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{currentMode === 'editor' ? '✓ Studio Editor' : '  Studio Editor'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘1</span>
              </button>
              <button
                onClick={() => handleAction(() => onSelectMode && onSelectMode('study'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>{currentMode === 'study' ? '✓ Study Mode' : '  Study Mode'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘2</span>
              </button>
              <button
                onClick={() => handleAction(() => onSelectMode && onSelectMode('reader'))}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{currentMode === 'reader' ? '✓ Books & Comics' : '  Books & Comics'}</span>
                </span>
                <span className="text-[9px] font-mono opacity-60">⌘3</span>
              </button>

              <div className="my-1 border-t border-border" />

              <button
                onClick={() => handleAction(handleMaximize)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span>Toggle Fullscreen</span>
                <span className="text-[9px] font-mono opacity-60">F11</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 4: Window */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('window')}
            onMouseEnter={() => handleMenuHover('window')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'window' 
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Window
          </button>

          {activeMenu === 'window' && (
            <div className="absolute top-full left-0 mt-1 w-48 rounded-xl bg-card dark:bg-[#1c1c22] border border-border shadow-2xl py-1 z-50 text-[11px] flex flex-col animate-in fade-in zoom-in-95 duration-75">
              <button
                onClick={() => handleAction(handleMinimize)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span>Minimize</span>
                <span className="text-[9px] font-mono opacity-60">⌘M</span>
              </button>

              <button
                onClick={() => handleAction(handleMaximize)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-white transition-colors text-left"
              >
                <span>{isMaximized ? 'Restore' : 'Maximize'}</span>
              </button>

              <div className="my-1 border-t border-border" />

              <button
                onClick={() => handleAction(handleClose)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-500 hover:text-white transition-colors text-left text-rose-500"
              >
                <span>Close Window</span>
                <span className="text-[9px] font-mono opacity-60">⌘W</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 5: Help */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('help')}
            onMouseEnter={() => handleMenuHover('help')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'help' 
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Help
          </button>

          {activeMenu === 'help' && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-xl bg-card dark:bg-[#1c1c22] border border-border shadow-2xl py-1.5 z-50 text-[11px] flex flex-col animate-in fade-in zoom-in-95 duration-75">
              <div className="px-3.5 py-2 border-b border-border flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-50">Ink Vault</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/20">v2.0 Core</span>
              </div>
              <div className="px-3.5 py-2.5 flex flex-col gap-2 font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>100% In-Memory Processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>Hardware Vector Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                  <span>Zero Cloud Telemetry</span>
                </div>
              </div>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => handleAction(onReturnToCover || (() => {}))}
                className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-accent hover:text-white text-zinc-700 dark:text-zinc-300 transition-colors text-left font-sans"
              >
                <span>Documentation & Cover</span>
                <span className="text-[10px] font-mono opacity-60">⌘↵</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 2. Center: Active Document Title */}
      <div 
        data-tauri-drag-region
        className="flex-1 flex items-center justify-center min-w-0 px-2 h-full cursor-default"
      >
        <span 
          data-tauri-drag-region
          className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-md font-medium"
        >
          {activeDocName ? `${title} — ${activeDocName}` : title}
        </span>
      </div>

      {/* 3. Right: Quick Actions (Theme & Fullscreen) */}
      <div className="flex items-center gap-1.5 h-full flex-shrink-0">
        
        {/* Quick Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to Light Mode (⌘T)' : 'Switch to Dark Mode (⌘T)'}
          className="h-6 w-6 rounded hover:bg-surface dark:hover:bg-surface flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-600" />}
        </button>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen (F11)"
            className="h-6 w-6 rounded hover:bg-surface dark:hover:bg-surface flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors hidden sm:flex"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        )}

      </div>

    </div>
  );
}
