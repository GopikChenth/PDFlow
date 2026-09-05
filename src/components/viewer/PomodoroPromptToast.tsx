import { 
  Timer,
  Play, 
  Plus, 
  X
} from 'lucide-react';
import { usePomodoro } from '../../context/PomodoroContext';

export default function PomodoroPromptToast() {
  const { 
    prompt, 
    settings, 
    acceptPrompt, 
    dismissPrompt, 
    extendTime 
  } = usePomodoro();

  if (!prompt) return null;

  const isFocusCompleted = prompt.type === 'focusCompleted';
  const targetDurationMin = isFocusCompleted
    ? prompt.targetPhase === 'longBreak' 
      ? settings.longBreakMin 
      : settings.shortBreakMin
    : settings.focusMin;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92vw] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-200">
      <div 
        className={`p-4 rounded-2xl shadow-2xl border flex flex-col gap-3 select-none ${
          isFocusCompleted
            ? 'bg-zinc-900 border-emerald-500/50 shadow-[0_20px_60px_rgba(16,185,129,0.35)] text-zinc-100'
            : 'bg-zinc-900 border-rose-500/50 shadow-[0_20px_60px_rgba(244,63,94,0.35)] text-zinc-100'
        }`}
        style={{ backgroundColor: '#18181b' }}
      >
        
        {/* Header line */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-md ${
              isFocusCompleted 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <Timer className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-zinc-100">
                {isFocusCompleted ? (
                  <span>Focus Session Complete</span>
                ) : (
                  <span>Break Time Over</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isFocusCompleted 
                  ? `Great momentum! Ready to start your ${targetDurationMin}-minute break?` 
                  : `Recharged? Ready to start your ${targetDurationMin}-minute work session?`
                }
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismissPrompt}
            title="Dismiss"
            className="h-6 w-6 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
          {/* Primary Action: Start the requested break or work */}
          <button
            type="button"
            onClick={acceptPrompt}
            className={`flex-1 h-9 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
              isFocusCompleted
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>
              {isFocusCompleted ? `Start Break (${targetDurationMin}m)` : `Start Work (${targetDurationMin}m)`}
            </span>
          </button>

          {/* Secondary Action: Extend current phase by 5m or 2m */}
          <button
            type="button"
            onClick={() => extendTime(isFocusCompleted ? 5 : 2)}
            title={isFocusCompleted ? "Extend work by 5 minutes" : "Snooze break by 2 minutes"}
            className="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isFocusCompleted ? '+5m Work' : '+2m Break'}</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={dismissPrompt}
            className="h-9 px-2.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
}
