import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Settings, 
  Volume2, 
  VolumeX, 
  Timer, 
  CheckCircle2,
  Coffee,
  Brain,
  X
} from 'lucide-react';

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  soundEnabled: true,
};

// Web Audio API chime - pleasant 2-tone melodic notification
function playGentleChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second tone (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.85);
  } catch {
    // Ignore audio permission or blocked errors
  }
}

export default function PomodoroTimer() {
  // Load persisted settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('pdflow_pomodoro_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(() => settings.focusMin * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [showSettingsTab, setShowSettingsTab] = useState<boolean>(false);

  // Custom intervals input state
  const [customFocus, setCustomFocus] = useState<number>(settings.focusMin);
  const [customShortBreak, setCustomShortBreak] = useState<number>(settings.shortBreakMin);
  const [customLongBreak, setCustomLongBreak] = useState<number>(settings.longBreakMin);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Save settings when modified
  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('pdflow_pomodoro_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Switch phase
  const switchPhase = useCallback((targetPhase: PomodoroPhase, customTimes = settings) => {
    setPhase(targetPhase);
    setIsRunning(false);
    let mins = customTimes.focusMin;
    if (targetPhase === 'shortBreak') mins = customTimes.shortBreakMin;
    if (targetPhase === 'longBreak') mins = customTimes.longBreakMin;
    setSecondsLeft(mins * 60);
  }, [settings]);

  // Timer Tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Phase complete!
          if (settings.soundEnabled) {
            playGentleChime();
          }

          if (phase === 'focus') {
            const nextCount = completedSessions + 1;
            setCompletedSessions(nextCount);
            // Long break after every 4 focus sessions
            if (nextCount % 4 === 0) {
              switchPhase('longBreak');
            } else {
              switchPhase('shortBreak');
            }
          } else {
            // Return to focus after break
            switchPhase('focus');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, phase, settings, completedSessions, switchPhase]);

  // Click outside to close popover
  useEffect(() => {
    if (!showPopover) return;
    const handleDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    window.addEventListener('mousedown', handleDocClick);
    return () => window.removeEventListener('mousedown', handleDocClick);
  }, [showPopover]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleApplyCustomIntervals = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFocus = Math.max(1, Math.min(120, Number(customFocus) || 25));
    const cleanShort = Math.max(1, Math.min(60, Number(customShortBreak) || 5));
    const cleanLong = Math.max(1, Math.min(90, Number(customLongBreak) || 15));

    const updated = {
      focusMin: cleanFocus,
      shortBreakMin: cleanShort,
      longBreakMin: cleanLong,
    };
    updateSettings(updated);

    // Apply to current timer if not running
    if (!isRunning) {
      switchPhase(phase, { ...settings, ...updated });
    }
    setShowSettingsTab(false);
  };

  // Quick preset loader
  const handleLoadPreset = (focus: number, shortB: number, longB: number) => {
    setCustomFocus(focus);
    setCustomShortBreak(shortB);
    setCustomLongBreak(longB);
    const updated = {
      focusMin: focus,
      shortBreakMin: shortB,
      longBreakMin: longB,
    };
    updateSettings(updated);
    if (!isRunning) {
      switchPhase(phase, { ...settings, ...updated });
    }
    setShowSettingsTab(false);
  };

  // Total seconds for progress calculation
  const totalSeconds = (phase === 'focus' 
    ? settings.focusMin 
    : phase === 'shortBreak' 
      ? settings.shortBreakMin 
      : settings.longBreakMin) * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100));

  return (
    <div className="relative flex items-center" ref={popoverRef}>
      {/* 1. Slim Compact Study Bar Pill */}
      <div 
        className={`h-7 px-2 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
          isRunning
            ? phase === 'focus'
              ? 'bg-rose-950/70 border-rose-600/80 text-rose-200'
              : 'bg-emerald-950/70 border-emerald-600/80 text-emerald-200'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
        }`}
        onClick={() => setShowPopover((prev) => !prev)}
        title="Pomodoro Study Timer (Click to open controls)"
      >
        {/* Phase Indicator Dot / Icon */}
        <span className="relative flex h-2 w-2">
          {isRunning && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              phase === 'focus' ? 'bg-rose-400' : 'bg-emerald-400'
            }`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            phase === 'focus' ? 'bg-rose-500' : 'bg-emerald-500'
          }`} />
        </span>

        {/* Digital Time Display */}
        <span className="font-mono text-xs font-bold tabular-nums tracking-tight">
          {formatTime(secondsLeft)}
        </span>

        {/* Phase Label Pill */}
        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80 hidden md:inline">
          {phase === 'focus' ? 'Focus' : phase === 'shortBreak' ? 'Break' : 'Long Break'}
        </span>
      </div>

      {/* Play / Pause Shortcut Button directly beside the pill */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsRunning((r) => !r);
        }}
        title={isRunning ? "Pause Timer" : "Start Pomodoro Timer"}
        className={`h-6 w-6 ml-1 rounded flex items-center justify-center transition-colors ${
          isRunning 
            ? 'bg-rose-600/30 text-rose-300 hover:bg-rose-600/50' 
            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
        }`}
      >
        {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>

      {/* 2. Popover Modal Dialog */}
      {showPopover && (
        <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 w-72 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-zinc-200 animate-in fade-in zoom-in-95 duration-150 select-none">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-100">
              <Timer className="h-4 w-4 text-rose-500" />
              <span>Pomodoro Study Timer</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                title={settings.soundEnabled ? "Chime Enabled" : "Chime Muted"}
                className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
              >
                {settings.soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-400" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsTab((s) => !s)}
                title="Custom Intervals Settings"
                className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${
                  showSettingsTab ? 'text-blue-400 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowPopover(false)}
                title="Close"
                className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!showSettingsTab ? (
            <>
              {/* Phase Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 my-3">
                <button
                  type="button"
                  onClick={() => switchPhase('focus')}
                  className={`py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    phase === 'focus'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Brain className="h-3 w-3" />
                  <span>Focus</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPhase('shortBreak')}
                  className={`py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    phase === 'shortBreak'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Coffee className="h-3 w-3" />
                  <span>Break</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPhase('longBreak')}
                  className={`py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    phase === 'longBreak'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Coffee className="h-3 w-3" />
                  <span>Long</span>
                </button>
              </div>

              {/* Big Digital Timer Display & Progress Ring */}
              <div className="flex flex-col items-center py-2">
                <div className="text-4xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                  {formatTime(secondsLeft)}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-3 overflow-hidden border border-zinc-800">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      phase === 'focus' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons: Play/Pause, Reset, Skip */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => switchPhase(phase)}
                  title="Reset Timer"
                  className="h-8 w-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsRunning((r) => !r)}
                  className={`h-9 px-5 rounded-xl font-semibold text-xs flex items-center gap-1.5 text-white transition-all shadow-md ${
                    isRunning 
                      ? 'bg-zinc-700 hover:bg-zinc-600' 
                      : phase === 'focus'
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start {phase === 'focus' ? 'Focus' : 'Break'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (phase === 'focus') {
                      switchPhase('shortBreak');
                    } else {
                      switchPhase('focus');
                    }
                  }}
                  title="Skip to Next Phase"
                  className="h-8 w-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Completed Sessions Count Footer */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Completed:</span>
                </span>
                <span className="font-mono font-semibold text-zinc-200">
                  {completedSessions} {completedSessions === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </>
          ) : (
            /* Custom Time Intervals Settings Form */
            <form onSubmit={handleApplyCustomIntervals} className="mt-2.5 flex flex-col gap-3">
              <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                Custom Intervals
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(25, 5, 15)}
                  className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors"
                >
                  25 / 5 min
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(50, 10, 20)}
                  className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors"
                >
                  50 / 10 min
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(90, 15, 30)}
                  className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors"
                >
                  90 / 15 min
                </button>
              </div>

              <div className="flex flex-col gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80 text-xs">
                {/* Focus Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Focus Session</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(parseInt(e.target.value, 10) || 1)}
                      className="w-12 h-6 bg-zinc-800 border border-zinc-700 rounded text-center font-mono font-semibold text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-zinc-500 text-[11px]">min</span>
                  </div>
                </div>

                {/* Short Break */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Short Break</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={customShortBreak}
                      onChange={(e) => setCustomShortBreak(parseInt(e.target.value, 10) || 1)}
                      className="w-12 h-6 bg-zinc-800 border border-zinc-700 rounded text-center font-mono font-semibold text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-zinc-500 text-[11px]">min</span>
                  </div>
                </div>

                {/* Long Break */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Long Break</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={customLongBreak}
                      onChange={(e) => setCustomLongBreak(parseInt(e.target.value, 10) || 1)}
                      className="w-12 h-6 bg-zinc-800 border border-zinc-700 rounded text-center font-mono font-semibold text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-zinc-500 text-[11px]">min</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowSettingsTab(false)}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors shadow-xs"
                >
                  Save Intervals
                </button>
              </div>
            </form>
          )}

        </div>
      )}
    </div>
  );
}
