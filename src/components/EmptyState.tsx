import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel = 'Browse Local Files',
  onAction,
  hint = 'or drag and drop PDF anywhere',
}: EmptyStateProps) {
  return (
    <div className="flex-1 w-full h-full flex items-center justify-center p-6 sm:p-8">
      <div
        onClick={onAction}
        className="max-w-lg w-full p-10 sm:p-12 rounded-2xl border-2 border-dashed border-border bg-card/40 hover:bg-card hover:border-accent/60 transition-all cursor-pointer group shadow-sm flex flex-col items-center justify-center text-center select-none"
      >
        {/* Uniform Icon Box */}
        <div className="h-16 w-16 rounded-2xl bg-surface border border-border/50 flex items-center justify-center mb-4 text-zinc-500 group-hover:text-accent group-hover:scale-105 transition-all shadow-xs">
          <Icon className="h-7 w-7 transition-colors" />
        </div>

        {/* Uniform Title */}
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h3>

        {/* Uniform Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>

        {/* Uniform Action Button */}
        {actionLabel && onAction && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold group-hover:bg-accent group-hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{actionLabel}</span>
            </button>
            {hint && (
              <span className="text-[10px] font-mono text-zinc-400">
                {hint}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
