import { useState } from 'react';
import { 
  ArrowRight, 
  Sun, 
  Moon, 
  FolderOpen,
  Layers,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import PaperStack from '../components/PaperStack';
import { AppMode } from '../types';

interface FirstPageProps {
  onEnterWorkspace: (mode?: AppMode) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
}

interface ModeConfig {
  id: AppMode;
  title: string;
  tag: string;
  icon: typeof Layers;
  headerLabel: string;
  actionLabel: string;
}

const WORKFLOW_MODES: ModeConfig[] = [
  {
    id: 'editor',
    title: 'Studio Editor',
    tag: 'Suite',
    icon: Layers,
    headerLabel: 'Open Studio',
    actionLabel: 'Launch Studio Editor',
  },
  {
    id: 'study',
    title: 'Study Mode',
    tag: 'Deep Focus',
    icon: GraduationCap,
    headerLabel: 'Open Study Mode',
    actionLabel: 'Launch Study Mode',
  },
  {
    id: 'reader',
    title: 'Books & Comics',
    tag: 'Zen Reader',
    icon: BookOpen,
    headerLabel: 'Open Books & Comics',
    actionLabel: 'Launch Books & Comics',
  },
];

export default function FirstPage({ 
  onEnterWorkspace, 
  darkMode, 
  onToggleDarkMode,
  currentMode = 'editor',
  onSelectMode,
}: FirstPageProps) {
  const [internalMode, setInternalMode] = useState<AppMode>('editor');
  const activeMode = currentMode ?? internalMode;

  const handleSelectMode = (mode: AppMode) => {
    setInternalMode(mode);
    if (onSelectMode) onSelectMode(mode);
  };

  const activeModeConfig = WORKFLOW_MODES.find(m => m.id === activeMode) || WORKFLOW_MODES[0];

  return (
    <div className="relative w-full h-full min-h-full overflow-y-auto bg-background text-zinc-800 dark:text-zinc-200 flex flex-col justify-between overflow-x-hidden selection:bg-accent selection:text-white transition-colors duration-300">
      
      {/* Background Dot & Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 dark:bg-accent/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. Header Navigation */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-extrabold text-sm tracking-tight shadow-md">
            IV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Ink Vault</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-zinc-600 dark:text-zinc-400">
                v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Utilities */}
        <div className="flex items-center gap-3">

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle Theme"
            className="flex items-center justify-center h-9 w-9 rounded-full bg-surface border border-border hover:bg-card dark:hover:bg-card transition-colors shadow-sm text-zinc-600 dark:text-zinc-300"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-600" />}
          </button>

          {/* Direct CTA */}
          <button
            onClick={() => onEnterWorkspace(activeMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-md active:scale-95 group"
          >
            <span>{activeModeConfig.headerLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* 2. Hero Body Section with Anime.js Paper Stack */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Hero Content */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-left">
          
          {/* Main Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.08]">
              Pure precision for <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-accent to-zinc-700 dark:from-zinc-100 dark:via-accent dark:to-zinc-400">
                every document.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed pt-2 transition-all duration-200 min-h-[48px]">
              {activeMode === 'editor' && 'Next-generation offline document suite. Merge, split, compress, and protect complex multi-page PDF stacks with native vector rendering and zero cloud telemetry.'}
              {activeMode === 'study' && 'Distraction-free academic and research reader with integrated Pomodoro timer, contextual search lookup, smart highlighter, and focused comprehension.'}
              {activeMode === 'reader' && 'Immersive reader tailored for EPUB books, CBZ and CBR comics, and graphic novels with dual-page spreads, soft eye-care paper tints, and distraction-free page turns.'}
            </p>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Select Workflow Mode
              </span>
              <span className="text-[11px] font-mono font-semibold text-accent flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {activeModeConfig.tag} Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {WORKFLOW_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = activeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectMode(mode.id)}
                    onDoubleClick={() => onEnterWorkspace(mode.id)}
                    className={`group relative flex flex-col p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent/[0.08] dark:bg-accent/[0.14] shadow-sm ring-1 ring-accent'
                        : 'border-border bg-card/60 hover:bg-card hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-accent text-white shadow-sm' 
                          : 'bg-surface text-zinc-600 dark:text-zinc-400 group-hover:text-accent'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-accent/15 border-accent/30 text-accent'
                          : 'bg-surface border-border text-zinc-500'
                      }`}>
                        {mode.tag}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      {mode.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action Group */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onEnterWorkspace(activeMode)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all shadow-lg hover:shadow-accent/20 active:scale-[0.98] group"
            >
              <FolderOpen className="h-4 w-4" />
              <span>{activeModeConfig.actionLabel}</span>
              <span className="text-[11px] font-mono opacity-80 bg-white/20 px-2 py-0.5 rounded">
                ⌘↵
              </span>
            </button>
          </div>

        </div>

        {/* Right Column: 3D Paper Stack Anime.js Showcase */}
        <div className="lg:col-span-6 flex items-center justify-center relative py-6">
          <PaperStack />
        </div>

      </main>

    </div>
  );
}
