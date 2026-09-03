import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  X, 
  CaseSensitive, 
  WholeWord, 
  Regex, 
  FileStack,
  AlertCircle
} from 'lucide-react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  isCaseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  isWholeWord: boolean;
  onToggleWholeWord: () => void;
  isRegex: boolean;
  onToggleRegex: () => void;
  isMultiDoc: boolean;
  onToggleMultiDoc: () => void;
  currentMatchIndex: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  isSearching?: boolean;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  query,
  onQueryChange,
  isCaseSensitive,
  onToggleCaseSensitive,
  isWholeWord,
  onToggleWholeWord,
  isRegex,
  onToggleRegex,
  isMultiDoc,
  onToggleMultiDoc,
  currentMatchIndex,
  totalMatches,
  onNextMatch,
  onPrevMatch,
  isSearching = false,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Validate regex on change
  useEffect(() => {
    if (isRegex && query.trim()) {
      try {
        new RegExp(query);
        setRegexError(null);
      } catch (err: any) {
        setRegexError(err.message || 'Invalid Regular Expression');
      }
    } else {
      setRegexError(null);
    }
  }, [query, isRegex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-6 z-40 flex flex-col gap-1.5 p-2 rounded-xl bg-card/95 dark:bg-card/95 border border-border shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.7)] backdrop-blur-md text-zinc-800 dark:text-zinc-200 select-none animate-in fade-in slide-in-from-top-2 duration-150">
      
      {/* Search Input Row */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center min-w-[240px] sm:min-w-[280px]">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRegex ? 'Search with Regex pattern...' : isMultiDoc ? 'Search across all open files...' : 'Find in document...'}
            className={`w-full h-8 pl-8 pr-16 rounded-lg bg-surface/80 dark:bg-surface/80 border text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent font-sans transition-all ${
              regexError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-border'
            }`}
          />

          {/* Match Counter inside input */}
          <div className="absolute right-2 flex items-center text-[10px] font-mono text-zinc-400">
            {isSearching ? (
              <span className="animate-pulse">Searching...</span>
            ) : query.trim() ? (
              totalMatches > 0 ? (
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {currentMatchIndex + 1}/{totalMatches}
                </span>
              ) : (
                <span className="text-rose-500 dark:text-rose-400">0 results</span>
              )
            ) : null}
          </div>
        </div>

        {/* Previous Match Button */}
        <button
          onClick={onPrevMatch}
          disabled={totalMatches === 0}
          title="Previous Match (Shift+Enter)"
          className="h-8 w-8 rounded-lg border border-border hover:bg-surface dark:hover:bg-surface disabled:opacity-30 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>

        {/* Next Match Button */}
        <button
          onClick={onNextMatch}
          disabled={totalMatches === 0}
          title="Next Match (Enter)"
          className="h-8 w-8 rounded-lg border border-border hover:bg-surface dark:hover:bg-surface disabled:opacity-30 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-0.5" />

        {/* Close Button */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="h-8 w-8 rounded-lg hover:bg-surface dark:hover:bg-surface flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search Filter Toggles Row */}
      <div className="flex items-center justify-between px-1 pt-1 border-t border-border/60 text-xs">
        <div className="flex items-center gap-1">
          
          {/* Case Sensitivity */}
          <button
            onClick={onToggleCaseSensitive}
            title="Match Case (Alt+C)"
            className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-mono transition-all ${
              isCaseSensitive 
                ? 'bg-accent text-white font-bold shadow-xs' 
                : 'text-zinc-500 hover:bg-surface dark:hover:bg-surface hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <CaseSensitive className="h-3 w-3" />
            <span>Match Case</span>
          </button>

          {/* Exact / Whole Word */}
          <button
            onClick={onToggleWholeWord}
            disabled={isRegex}
            title="Match Whole Word (Alt+W)"
            className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-mono transition-all disabled:opacity-30 ${
              isWholeWord && !isRegex
                ? 'bg-accent text-white font-bold shadow-xs' 
                : 'text-zinc-500 hover:bg-surface dark:hover:bg-surface hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <WholeWord className="h-3 w-3" />
            <span>Whole Word</span>
          </button>

          {/* Regex Search */}
          <button
            onClick={onToggleRegex}
            title="Use Regular Expression (Alt+R)"
            className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-mono transition-all ${
              isRegex 
                ? 'bg-accent text-white font-bold shadow-xs' 
                : 'text-zinc-500 hover:bg-surface dark:hover:bg-surface hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Regex className="h-3 w-3" />
            <span>Regex</span>
          </button>
        </div>

        {/* Multi-Document Search Toggle */}
        <button
          onClick={onToggleMultiDoc}
          title="Search across all open documents in session"
          className={`h-6 px-2 rounded flex items-center gap-1 text-[10px] font-mono transition-all ${
            isMultiDoc 
              ? 'bg-emerald-600 text-white font-bold shadow-xs' 
              : 'text-zinc-500 hover:bg-surface dark:hover:bg-surface hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <FileStack className="h-3 w-3" />
          <span>All Open Docs</span>
        </button>
      </div>

      {/* Regex Syntax Error Banner */}
      {regexError ? (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded text-[10px] font-mono text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{regexError}</span>
        </div>
      ) : null}

    </div>
  );
}
