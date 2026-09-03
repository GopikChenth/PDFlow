import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
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

    // First tone (E5 - 659.25Hz)
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

    // Second tone (A5 - 880Hz)
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

export interface PomodoroContextType {
  phase: PomodoroPhase;
  secondsLeft: number;
  isRunning: boolean;
  completedSessions: number;
  settings: PomodoroSettings;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  switchPhase: (targetPhase: PomodoroPhase, customTimes?: PomodoroSettings) => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  formatTime: (secs: number) => string;
  progressPercent: number;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
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

  const targetEndTimeRef = useRef<number | null>(null);

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
    targetEndTimeRef.current = null;
    let mins = customTimes.focusMin;
    if (targetPhase === 'shortBreak') mins = customTimes.shortBreakMin;
    if (targetPhase === 'longBreak') mins = customTimes.longBreakMin;
    setSecondsLeft(mins * 60);
  }, [settings]);

  const startTimer = useCallback(() => {
    targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
    setIsRunning(true);
  }, [secondsLeft]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
  }, []);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    switchPhase(phase);
  }, [phase, switchPhase]);

  const skipPhase = useCallback(() => {
    if (phase === 'focus') {
      const nextCount = completedSessions + 1;
      setCompletedSessions(nextCount);
      if (nextCount % 4 === 0) {
        switchPhase('longBreak');
      } else {
        switchPhase('shortBreak');
      }
    } else {
      switchPhase('focus');
    }
  }, [phase, completedSessions, switchPhase]);

  // Accurate drift-free countdown timer
  useEffect(() => {
    if (!isRunning) return;

    if (!targetEndTimeRef.current) {
      targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
    }

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const diff = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
      
      setSecondsLeft(diff);

      if (diff <= 0) {
        // Phase complete!
        clearInterval(interval);
        targetEndTimeRef.current = null;

        if (settings.soundEnabled) {
          playGentleChime();
        }

        if (phase === 'focus') {
          const nextCount = completedSessions + 1;
          setCompletedSessions(nextCount);
          if (nextCount % 4 === 0) {
            switchPhase('longBreak');
          } else {
            switchPhase('shortBreak');
          }
        } else {
          switchPhase('focus');
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, phase, settings.soundEnabled, completedSessions, switchPhase, secondsLeft]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percent
  const totalSeconds = (phase === 'focus' 
    ? settings.focusMin 
    : phase === 'shortBreak' 
      ? settings.shortBreakMin 
      : settings.longBreakMin) * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100));

  return (
    <PomodoroContext.Provider
      value={{
        phase,
        secondsLeft,
        isRunning,
        completedSessions,
        settings,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        skipPhase,
        switchPhase,
        updateSettings,
        formatTime,
        progressPercent,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextType {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
