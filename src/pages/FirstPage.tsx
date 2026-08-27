import { 
  ArrowRight, 
  Sun, 
  Moon, 
  FolderOpen
} from 'lucide-react';
import PaperStack from '../components/PaperStack';

interface FirstPageProps {
  onEnterWorkspace: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function FirstPage({ onEnterWorkspace, darkMode, onToggleDarkMode }: FirstPageProps) {
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
          <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-extrabold text-base shadow-md">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">PDFlow</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-zinc-600 dark:text-zinc-400">
                STUDIO v2.0
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
            onClick={onEnterWorkspace}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-md active:scale-95 group"
          >
            <span>Open Studio</span>
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
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed pt-2">
              Next-generation offline document suite. Merge, split, compress, and organize complex multi-page PDF stacks with native vector rendering and zero cloud telemetry.
            </p>
          </div>

          {/* Primary Action Group */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onEnterWorkspace}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all shadow-lg hover:shadow-accent/20 active:scale-[0.98] group"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Launch Workspace</span>
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
