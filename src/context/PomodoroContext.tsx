import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  soundEnabled: boolean;
}

export interface PomodoroPrompt {
  type: 'focusCompleted' | 'breakCompleted';
  targetPhase: PomodoroPhase;
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
    gain1.gain.setValueAtTime(0.2, now);
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
    gain2.gain.setValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.9);
  } catch {
    // AudioContext blocked or not supported
  }
}

function sendDesktopNotification(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {}
}

export interface PomodoroContextType {
  phase: PomodoroPhase;
  secondsLeft: number;
  isRunning: boolean;
  completedSessions: number;
  settings: PomodoroSettings;
  prompt: PomodoroPrompt | null;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  switchPhase: (targetPhase: PomodoroPhase, customTimes?: PomodoroSettings) => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  formatTime: (secs: number) => string;
  progressPercent: number;
  acceptPrompt: () => void;
  dismissPrompt: () => void;
  extendTime: (extraMinutes: number) => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  // Load persisted settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('inkvault_pomodoro_settings') ?? localStorage.getItem('pdflow_pomodoro_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(() => settings.focusMin * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [prompt, setPrompt] = useState<PomodoroPrompt | null>(null);

  const targetEndTimeRef = useRef<number | null>(null);

  // Request browser notification permission once
  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  }, []);

  // Save settings when modified
  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('inkvault_pomodoro_settings', JSON.stringify(updated));
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
    setPrompt(null);
  }, [settings]);

  const startTimer = useCallback(() => {
    targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
    setIsRunning(true);
    setPrompt(null);
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
    setPrompt(null);
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

  // Accept Prompt: transition to requested phase and immediately run the timer
  const acceptPrompt = useCallback(() => {
    if (!prompt) return;
    const nextPhase = prompt.targetPhase;
    setPrompt(null);
    setPhase(nextPhase);
    const mins = nextPhase === 'focus' 
      ? settings.focusMin 
      : nextPhase === 'shortBreak' 
        ? settings.shortBreakMin 
        : settings.longBreakMin;
    const nextSecs = mins * 60;
    setSecondsLeft(nextSecs);
    targetEndTimeRef.current = Date.now() + nextSecs * 1000;
    setIsRunning(true);
  }, [prompt, settings]);

  // Dismiss Prompt without auto-starting
  const dismissPrompt = useCallback(() => {
    setPrompt(null);
  }, []);

  // Extend current phase (e.g. +5 min focus or +2 min break)
  const extendTime = useCallback((extraMinutes: number) => {
    setPrompt(null);
    const extraSecs = extraMinutes * 60;
    setSecondsLeft((prev) => {
      const updated = prev + extraSecs;
      targetEndTimeRef.current = Date.now() + updated * 1000;
      return updated;
    });
    setIsRunning(true);
  }, []);

  // Accurate drift-free countdown timer & Prompt trigger
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
        setIsRunning(false);

        if (settings.soundEnabled) {
          playGentleChime();
        }

        if (phase === 'focus') {
          const nextCount = completedSessions + 1;
          setCompletedSessions(nextCount);
          const targetPhase: PomodoroPhase = (nextCount % 4 === 0) ? 'longBreak' : 'shortBreak';
          const breakMins = targetPhase === 'longBreak' ? settings.longBreakMin : settings.shortBreakMin;
          
          setPhase(targetPhase);
          setSecondsLeft(breakMins * 60);

          // Prompt user to start break!
          setPrompt({ type: 'focusCompleted', targetPhase });
          sendDesktopNotification(
            'Focus Block Completed',
            `Great work! Ready to start your ${breakMins}-minute break?`
          );
        } else {
          // Break is over -> prompt user to start work!
          const focusMins = settings.focusMin;
          setPhase('focus');
          setSecondsLeft(focusMins * 60);

          setPrompt({ type: 'breakCompleted', targetPhase: 'focus' });
          sendDesktopNotification(
            'Break Finished',
            `Break time is up! Ready to focus for ${focusMins} minutes?`
          );
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, phase, settings, completedSessions, secondsLeft]);

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
        prompt,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        skipPhase,
        switchPhase,
        updateSettings,
        formatTime,
        progressPercent,
        acceptPrompt,
        dismissPrompt,
        extendTime,
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
