import React, { useRef, useEffect } from 'react';
import { FileText, Plus, X } from 'lucide-react';
import { LoadedPDF } from '../../types';

interface DocumentTabBarProps {
  docs: LoadedPDF[];
  activeDocId: string | null;
  onSelectDoc: (doc: LoadedPDF) => void;
  onCloseDoc: (docId: string, e?: React.MouseEvent) => void;
  onNewTab: () => void;
}

export default function DocumentTabBar({
  docs,
  activeDocId,
  onSelectDoc,
  onCloseDoc,
  onNewTab,
}: DocumentTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view when activeDocId changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeDocId]);

  if (docs.length === 0) return null;

  return (
    <div className="h-10 bg-surface/95 dark:bg-surface/95 border-b border-border flex items-end px-2 gap-1 select-none flex-shrink-0 z-30 relative overflow-hidden">
      
      {/* Scrollable Tabs List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 flex items-end gap-1 overflow-x-auto no-scrollbar scroll-smooth h-full pt-1.5"
      >
        {docs.map((doc) => {
          const isActive = doc.id === activeDocId;

          return (
            <div
              key={doc.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onSelectDoc(doc)}
              onAuxClick={(e) => {
                // Middle-click closes the tab (classic browser behavior)
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  onCloseDoc(doc.id, e);
                }
              }}
              title={`${doc.name} (${doc.size}) • Middle-click or click × to close`}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs cursor-pointer transition-all border-t border-x flex-shrink-0 max-w-[220px] min-w-[120px] ${
                isActive
                  ? 'bg-card text-zinc-900 dark:text-zinc-100 font-semibold border-border border-b-0 shadow-xs z-10'
                  : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-card/50 hover:text-zinc-900 dark:hover:text-zinc-200 border-transparent'
              }`}
            >
              {/* Active Indicator Accent Line */}
              {isActive && (
                <div className="absolute top-0 left-3 right-3 h-[2px] bg-accent rounded-full" />
              )}

              {/* Document Icon */}
              <div className={`h-4 w-4 flex-shrink-0 flex items-center justify-center rounded transition-colors ${
                isActive ? 'text-accent' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
              }`}>
                <FileText className="h-3.5 w-3.5" />
              </div>

              {/* Document Name */}
              <span className="truncate flex-1 text-[11px]">
                {doc.name}
              </span>

              {/* Close Tab Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseDoc(doc.id, e);
                }}
                title="Close Tab (⌘W / Ctrl+W)"
                aria-label={`Close ${doc.name}`}
                className={`h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'opacity-70 hover:opacity-100 hover:bg-surface text-zinc-500 hover:text-rose-500'
                    : 'opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-surface text-zinc-400 hover:text-rose-500'
                }`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Plus / New Tab Button */}
        <button
          type="button"
          onClick={onNewTab}
          title="Open Document in New Tab (⌘T / Ctrl+T)"
          aria-label="New Tab"
          className="h-7 w-7 mb-1 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-card border border-transparent hover:border-border transition-all flex-shrink-0 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab count indicator when 3+ tabs are open */}
      {docs.length >= 3 && (
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-zinc-400 pb-1.5 px-2 flex-shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-surface border border-border">
            {docs.length} tabs
          </span>
        </div>
      )}

    </div>
  );
}
