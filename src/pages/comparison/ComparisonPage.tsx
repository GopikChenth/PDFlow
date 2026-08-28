import React, { useState, useMemo, useCallback } from 'react';
import { 
  Check, 
  X as XIcon, 
  ArrowRight, 
  FolderOpen, 
  ShieldCheck, 
  Zap, 
  Sun, 
  Moon, 
  Home, 
  DollarSign, 
  HardDrive, 
  Cpu, 
  Lock, 
  Search,
  AlertTriangle
} from 'lucide-react';

// ============================================================================
// 1. HOISTED STATIC CONSTANTS & BENCHMARK DATA (rendering-hoist-jsx, bundle-barrel-imports)
// ============================================================================

export type ComparisonCategory = 'all' | 'acrobat' | 'sumatra' | 'stirling' | 'sioyek';

export interface ComparisonFeature {
  id: string;
  name: string;
  category: 'core' | 'tools' | 'annotations' | 'privacy' | 'performance';
  description: string;
  pdflow: boolean | string;
  acrobatPro: boolean | string;
  sumatra: boolean | string;
  stirling: boolean | string;
  highlight?: boolean;
}

const COMPARISON_CATEGORIES = [
  { id: 'all', label: 'All Capabilities' },
  { id: 'acrobat', label: 'vs Adobe Acrobat' },
  { id: 'sumatra', label: 'vs SumatraPDF / MuPDF' },
  { id: 'stirling', label: 'vs Stirling-PDF' },
  { id: 'sioyek', label: 'vs Sioyek & Okular' },
] as const;

const BENCHMARK_STATS = [
  {
    title: 'Subscription Cost',
    pdflow: '$0 / Forever',
    acrobat: '$239.88 / yr',
    icon: DollarSign,
    color: 'text-emerald-500',
    note: '100% Free & Open-Source (MIT)',
  },
  {
    title: 'Disk Footprint',
    pdflow: '~25 MB',
    acrobat: '~3,200 MB (3.2 GB)',
    icon: HardDrive,
    color: 'text-blue-500',
    note: '128× smaller installation size',
  },
  {
    title: 'Idle RAM Consumption',
    pdflow: '~80 – 120 MB',
    acrobat: '~450 – 850 MB',
    icon: Cpu,
    color: 'text-purple-500',
    note: 'No background Adobe CC daemons',
  },
  {
    title: 'Privacy & Telemetry',
    pdflow: '100% In-Memory',
    acrobat: 'Cloud Document Sync',
    icon: Lock,
    color: 'text-rose-500',
    note: 'Zero network calls or tracking',
  },
] as const;

const COMPARISON_FEATURES: readonly ComparisonFeature[] = [
  {
    id: 'price',
    name: 'Cost & Licensing',
    category: 'core',
    description: 'Annual pricing for complete page organization & offline utilities.',
    pdflow: '100% Free (MIT)',
    acrobatPro: '$239.88 / yr',
    sumatra: 'Free (GPLv3)',
    stirling: 'Free (GPLv3)',
    highlight: true,
  },
  {
    id: 'tabs',
    name: 'Multi-Document Tabs',
    category: 'core',
    description: 'Browser-style tab bar with middle-click close and Ctrl+Tab hotkeys.',
    pdflow: true,
    acrobatPro: true,
    sumatra: true,
    stirling: 'Separate browser tabs',
  },
  {
    id: 'organizer',
    name: 'Drag-and-Drop Page Organizer',
    category: 'tools',
    description: 'Visual grid to batch rotate, duplicate, delete, and reorder pages.',
    pdflow: true,
    acrobatPro: 'Paid Paywall Only',
    sumatra: false,
    stirling: true,
    highlight: true,
  },
  {
    id: 'merge-split',
    name: 'In-Memory Merge & Split',
    category: 'tools',
    description: 'Combine multiple files or extract page ranges locally without servers.',
    pdflow: true,
    acrobatPro: 'Paid Paywall Only',
    sumatra: false,
    stirling: 'Requires Docker/Server',
    highlight: true,
  },
  {
    id: 'watermark',
    name: 'Real-Time 120 FPS Watermarking',
    category: 'tools',
    description: 'Dual-layer canvas live preview with custom opacity, angle, and presets.',
    pdflow: true,
    acrobatPro: true,
    sumatra: false,
    stirling: 'Static Render Only',
  },
  {
    id: 'compress',
    name: 'Flate Stream Compression',
    category: 'tools',
    description: 'Object compaction and metadata pruning in-memory.',
    pdflow: true,
    acrobatPro: true,
    sumatra: false,
    stirling: true,
  },
  {
    id: 'voice-memos',
    name: 'Audio Memos & Calibrated Measures',
    category: 'annotations',
    description: 'Embed voice comments and measure calibrated distance/area on pages.',
    pdflow: true,
    acrobatPro: 'Rulers Only',
    sumatra: false,
    stirling: false,
    highlight: true,
  },
  {
    id: 'text-reflow',
    name: 'Responsive Text Reflow Mode',
    category: 'core',
    description: 'Clean distraction-free e-reader mode with custom typography.',
    pdflow: true,
    acrobatPro: 'Liquid Mode (Mobile only)',
    sumatra: false,
    stirling: false,
  },
  {
    id: 'wysiwyg',
    name: 'Inline Text Paragraph Re-typing',
    category: 'tools',
    description: 'Direct font subset character replacement and sentence rewriting.',
    pdflow: false,
    acrobatPro: true,
    sumatra: false,
    stirling: 'Basic overlay',
  },
  {
    id: 'ocr',
    name: 'Scanned Paper OCR Engine',
    category: 'tools',
    description: 'Optical Character Recognition for converting flat scans into text.',
    pdflow: false,
    acrobatPro: true,
    sumatra: false,
    stirling: true,
  },
  {
    id: 'privacy',
    name: 'Zero Cloud Telemetry',
    category: 'privacy',
    description: 'Processes documents 100% in RAM with no background upload daemons.',
    pdflow: true,
    acrobatPro: false,
    sumatra: true,
    stirling: 'Self-hosted server',
    highlight: true,
  },
] as const;

// ============================================================================
// 2. MEMOIZED SUBCOMPONENTS (rerender-memo, rerender-no-inline-components)
// ============================================================================

interface StatCardProps {
  item: typeof BENCHMARK_STATS[number];
}

const StatCard = React.memo(function StatCard({ item }: StatCardProps) {
  const Icon = item.icon;
  return (
    <div className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between gap-4 shadow-sm [content-visibility:auto]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.title}</span>
        <div className="h-8 w-8 rounded-xl bg-surface flex items-center justify-center">
          <Icon className={`h-4 w-4 ${item.color}`} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-mono text-zinc-400">PDFlow:</span>
          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{item.pdflow}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-mono text-zinc-400">Acrobat:</span>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 line-through opacity-80">{item.acrobat}</span>
        </div>
      </div>

      <div className="pt-2.5 border-t border-border text-[11px] font-mono text-zinc-500">
        {item.note}
      </div>
    </div>
  );
});

interface FeatureRowProps {
  feature: ComparisonFeature;
}

const FeatureRow = React.memo(function FeatureRow({ feature }: FeatureRowProps) {
  const renderCell = (val: boolean | string) => {
    if (typeof val === 'boolean') {
      return val ? (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-500/10 text-rose-500">
          <XIcon className="h-3.5 w-3.5" />
        </span>
      );
    }
    return <span className="text-xs font-mono font-medium">{val}</span>;
  };

  return (
    <tr className={`border-b border-border transition-colors hover:bg-surface/50 ${feature.highlight ? 'bg-accent/[0.02]' : ''}`}>
      <td className="py-4 px-4 align-top">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{feature.name}</span>
          {feature.highlight ? (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-accent/15 text-accent font-bold">
              Key Advantage
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm leading-relaxed">{feature.description}</p>
      </td>
      <td className="py-4 px-4 text-center align-middle font-bold text-emerald-600 dark:text-emerald-400 bg-accent/[0.03]">
        {renderCell(feature.pdflow)}
      </td>
      <td className="py-4 px-4 text-center align-middle text-zinc-600 dark:text-zinc-400">
        {renderCell(feature.acrobatPro)}
      </td>
      <td className="py-4 px-4 text-center align-middle text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
        {renderCell(feature.sumatra)}
      </td>
      <td className="py-4 px-4 text-center align-middle text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
        {renderCell(feature.stirling)}
      </td>
    </tr>
  );
});

// ============================================================================
// 3. MAIN COMPONENT (Vercel React Best Practices Compliant)
// ============================================================================

interface ComparisonPageProps {
  onEnterWorkspace: () => void;
  onReturnToCover: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function ComparisonPage({
  onEnterWorkspace,
  onReturnToCover,
  darkMode,
  onToggleDarkMode,
}: ComparisonPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<ComparisonCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Efficient Derived Filtering (rerender-derived-state-no-effect, js-set-map-lookups)
  const filteredFeatures = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COMPARISON_FEATURES.filter((f) => {
      const matchesSearch = !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (selectedCategory === 'acrobat') return f.acrobatPro !== undefined;
      if (selectedCategory === 'sumatra') return f.sumatra !== undefined;
      if (selectedCategory === 'stirling') return f.stirling !== undefined;
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const handleCategorySelect = useCallback((cat: ComparisonCategory) => {
    setSelectedCategory(cat);
  }, []);

  return (
    <div className="relative w-full h-full min-h-full overflow-y-auto bg-background text-zinc-800 dark:text-zinc-200 flex flex-col justify-between selection:bg-accent selection:text-white transition-colors duration-300">
      
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* 1. Header Navigation Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onReturnToCover}
            className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-extrabold text-base shadow-md cursor-pointer hover:opacity-90 transition-opacity"
            title="Return to Presentation Cover"
          >
            P
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">PDFlow</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-zinc-600 dark:text-zinc-400">
                BENCHMARK MATRIX
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToCover}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-card text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Cover</span>
          </button>

          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle Theme"
            className="flex items-center justify-center h-9 w-9 rounded-full bg-surface border border-border hover:bg-card transition-colors shadow-xs text-zinc-600 dark:text-zinc-300"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-600" />}
          </button>

          <button
            onClick={onEnterWorkspace}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-md active:scale-95 group"
          >
            <span>Open Studio</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* 2. Main Body: Benchmarks, Tradeoffs & Feature Matrix */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex-1 flex flex-col gap-10">
        
        {/* Hero Banner */}
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
            <Zap className="h-3.5 w-3.5" />
            <span>Objective Engineering & Feature Breakdown</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.1]">
            How PDFlow compares to <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-accent to-zinc-700 dark:from-zinc-100 dark:via-accent dark:to-zinc-400">
              Acrobat and Open-Source Viewers.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
            Zero subscription walls, zero cloud telemetry, native vector canvas rendering, and built-in offline document management tools in one lightweight desktop app.
          </p>
        </div>

        {/* 4 Key Benchmark Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENCHMARK_STATS.map((stat, idx) => (
            <StatCard key={idx} item={stat} />
          ))}
        </div>

        {/* Honest Technical Reality Section (No Glazing) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Where PDFlow Excels */}
          <div className="p-6 rounded-2xl bg-card border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <ShieldCheck className="h-5 w-5" />
              <span>Where PDFlow Wins</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><strong>No Paywalls on Daily Tools:</strong> Free Acrobat locks merging, splitting, page rotation, and extraction. PDFlow includes all tools free forever.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><strong>100% In-Memory Privacy:</strong> No Adobe Creative Cloud background processes, zero cloud syncing, and zero telemetry.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><strong>All-in-One Local Workflow:</strong> Browser tabs, drag-and-drop page organizer, calibrated rulers, and voice memos without needing a Docker server.</span>
              </li>
            </ul>
          </div>

          {/* Box 2: Honest Technical Tradeoffs */}
          <div className="p-6 rounded-2xl bg-card border border-amber-500/30 dark:border-amber-500/20 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>Honest Trade-offs (When to use other tools)</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                <span><strong>Inline Text Rewriting:</strong> To click and fix typos inside existing PDF paragraphs, Acrobat Pro or LibreOffice Draw is required.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                <span><strong>Scanned OCR & DOCX Conversion:</strong> For OCR on physical image scans or Office conversions, Stirling-PDF or Acrobat is best.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                <span><strong>10,000+ Page Schematics:</strong> C++ viewers like SumatraPDF or MuPDF open massive engineering blueprints with lower latency.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature Matrix Table */}
        <div className="flex flex-col gap-4">
          
          {/* Controls Bar: Category Pills + Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
              {COMPARISON_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold'
                      : 'bg-card border border-border text-zinc-600 dark:text-zinc-400 hover:bg-surface hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search capabilities..."
                className="w-full h-8 pl-9 pr-3 rounded-xl bg-card border border-border text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent font-sans shadow-xs"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/70 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                    <th className="py-3.5 px-4 font-bold">Feature / Capability</th>
                    <th className="py-3.5 px-4 font-bold text-center text-accent bg-accent/[0.06]">PDFlow</th>
                    <th className="py-3.5 px-4 font-bold text-center">Adobe Acrobat</th>
                    <th className="py-3.5 px-4 font-bold text-center hidden sm:table-cell">SumatraPDF</th>
                    <th className="py-3.5 px-4 font-bold text-center hidden md:table-cell">Stirling-PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((f) => (
                    <FeatureRow key={f.id} feature={f} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      {/* 3. Footer CTA */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-border mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-md bg-accent text-white flex items-center justify-center text-xs font-black">
            P
          </div>
          <span className="text-xs font-mono text-zinc-500">
            PDFlow Studio • 100% In-Memory Offline Architecture
          </span>
        </div>

        <button
          onClick={onEnterWorkspace}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-md active:scale-95"
        >
          <FolderOpen className="h-4 w-4" />
          <span>Launch Workspace</span>
          <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.2 rounded ml-1">⌘↵</span>
        </button>
      </footer>

    </div>
  );
}
