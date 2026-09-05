import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Timer, 
  CheckCircle2,
  X,
  Sliders,
  Plus,
  Minus
} from 'lucide-react';
import { usePomodoro } from '../../context/PomodoroContext';

interface PomodoroTimerProps {
  className?: string;
}

export default function PomodoroTimer({ className = '' }: PomodoroTimerProps) {
  const {
    phase,
    secondsLeft,
    isRunning,
    completedSessions,
    settings,
    toggleTimer,
    resetTimer,
    skipPhase,
    switchPhase,
    updateSettings,
    formatTime,
    progressPercent,
  } = usePomodoro();

  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [showSettingsTab, setShowSettingsTab] = useState<boolean>(false);

  // Custom intervals input state
  const [customFocus, setCustomFocus] = useState<number>(settings.focusMin);
  const [customShortBreak, setCustomShortBreak] = useState<number>(settings.shortBreakMin);
  const [customLongBreak, setCustomLongBreak] = useState<number>(settings.longBreakMin);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync inputs when settings change
  useEffect(() => {
    setCustomFocus(settings.focusMin);
    setCustomShortBreak(settings.shortBreakMin);
    setCustomLongBreak(settings.longBreakMin);
  }, [settings]);

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

  const handleApplyCustomIntervals = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanFocus = Math.max(1, Math.min(180, Number(customFocus) || 25));
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

  return (
    <div className={`relative flex items-center select-none ${className}`} ref={popoverRef}>
      {/* 1. Slim Compact Timer Pill */}
      <div 
        className={`h-7 px-2 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
          isRunning
            ? phase === 'focus'
              ? 'bg-rose-950/70 border-rose-600/80 text-rose-200 ring-1 ring-rose-500/20'
              : 'bg-emerald-950/70 border-emerald-600/80 text-emerald-200 ring-1 ring-emerald-500/20'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
        }`}
        onClick={() => setShowPopover((prev) => !prev)}
        title="Pomodoro Study Timer (Click to open controls & custom intervals)"
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
          {phase === 'focus' ? 'Work' : phase === 'shortBreak' ? 'Break' : 'Long Break'}
        </span>
      </div>

      {/* Play / Pause Shortcut Button directly beside the pill */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleTimer();
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
        <div 
          className="absolute top-9 right-0 sm:left-1/2 sm:-translate-x-1/2 z-50 w-80 p-4 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.65)] text-zinc-200 animate-in fade-in zoom-in-95 duration-150 select-none"
          style={{ backgroundColor: '#18181b' }}
        >
          
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
                title="Configure Custom Intervals (Work & Breaks)"
                className={`h-6 px-1.5 rounded flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  showSettingsTab 
                    ? 'text-blue-300 bg-blue-600/20 border border-blue-500/30' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Intervals</span>
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
              <div 
                className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 my-3"
                style={{ backgroundColor: '#09090b' }}
              >
                <button
                  type="button"
                  onClick={() => switchPhase('focus')}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    phase === 'focus'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Work</span>
                  <span className="text-[9px] font-mono opacity-80">{settings.focusMin}m</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPhase('shortBreak')}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    phase === 'shortBreak'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Break</span>
                  <span className="text-[9px] font-mono opacity-80">{settings.shortBreakMin}m</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPhase('longBreak')}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    phase === 'longBreak'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Long Break</span>
                  <span className="text-[9px] font-mono opacity-80">{settings.longBreakMin}m</span>
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
                    className={`h-full transition-all duration-300 ${
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
                  onClick={resetTimer}
                  title="Reset Current Interval"
                  className="h-9 w-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors shadow-xs"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleTimer}
                  className={`h-9 px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-white transition-all shadow-md active:scale-95 ${
                    isRunning 
                      ? 'bg-zinc-700 hover:bg-zinc-600' 
                      : phase === 'focus'
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
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
                      <span>Start {phase === 'focus' ? 'Work' : 'Break'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={skipPhase}
                  title="Skip to Next Phase"
                  className="h-9 w-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors shadow-xs"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Completed Sessions Count Footer */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Completed Cycles:</span>
                </span>
                <span className="font-mono font-semibold text-zinc-200">
                  {completedSessions} {completedSessions === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </>
          ) : (
            /* Custom Time Intervals Settings Form */
            <form onSubmit={handleApplyCustomIntervals} className="mt-2.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Set Custom Intervals
                </span>
                <span className="text-[10px] text-zinc-500">Auto-saved</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(25, 5, 15)}
                  className="py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors text-center border border-zinc-700/60"
                >
                  <div className="font-semibold text-zinc-200">25 / 5 min</div>
                  <div className="text-[8px] text-zinc-500">Classic</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(50, 10, 20)}
                  className="py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors text-center border border-zinc-700/60"
                >
                  <div className="font-semibold text-zinc-200">50 / 10 min</div>
                  <div className="text-[8px] text-zinc-500">Deep Work</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(90, 20, 30)}
                  className="py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors text-center border border-zinc-700/60"
                >
                  <div className="font-semibold text-zinc-200">90 / 20 min</div>
                  <div className="text-[8px] text-zinc-500">Ultradian</div>
                </button>
              </div>

              {/* Stepper Inputs for Custom Work & Break times */}
              <div 
                className="flex flex-col gap-2.5 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-xs"
                style={{ backgroundColor: '#09090b' }}
              >
                {/* 1. Work Duration */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-200">Work Session</div>
                    <div className="text-[10px] text-zinc-500">Focus interval</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomFocus((f) => Math.max(1, f - 5))}
                      className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(parseInt(e.target.value, 10) || 1)}
                      className="w-11 h-6 bg-zinc-900 border border-zinc-700 rounded text-center font-mono font-bold text-xs text-rose-400 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomFocus((f) => Math.min(180, f + 5))}
                      className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-zinc-500 text-[11px] w-6">min</span>
                  </div>
                </div>

                {/* 2. Short Break Duration */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <div>
                    <div className="font-semibold text-zinc-200">Short Break</div>
                    <div className="text-[10px] text-zinc-500">Quick rest</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomShortBreak((b) => Math.max(1, b - 1))}
                      className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={customShortBreak}
                      onChange={(e) => setCustomShortBreak(parseInt(e.target.value, 10) || 1)}
                      className="w-11 h-6 bg-zinc-900 border border-zinc-700 rounded text-center font-mono font-bold text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomShortBreak((b) => Math.min(60, b + 1))}
                      className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-zinc-500 text-[11px] w-6">min</span>
                  </div>
                </div>

                {/* 3. Long Break Duration */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <div>
                    <div className="font-semibold text-zinc-200">Long Break</div>
                    <div className="text-[10px] text-zinc-500">After 4 cycles</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomLongBreak((b) => Math.max(1, b - 5))}
                      className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={customLongBreak}
                      onChange={(e) => setCustomLongBreak(parseInt(e.target.value, 10) || 1)}
                      className="w-11 h-6 bg-zinc-900 border border-zinc-700 rounded text-center font-mono font-bold text-xs text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomLongBreak((b) => Math.min(90, b + 5))}
                      className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-zinc-500 text-[11px] w-6">min</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowSettingsTab(false)}
                  className="flex-1 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors shadow-xs"
                >
                  Save & Apply
                </button>
              </div>
            </form>
          )}

        </div>
      )}
    </div>
  );
}
