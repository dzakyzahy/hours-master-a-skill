import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { setScreenKeepAwake, triggerHaptic } from '../utils/native';

export function formatTimerSeconds(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function useGlobalTimer() {
  const { 
    activeTimer, 
    timerStartedAt, 
    timerProjectId, 
    projects, 
    tickTimer, 
    toggleTimer 
  } = useStore();

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (activeTimer) {
      setScreenKeepAwake(true);
      triggerHaptic();
    } else {
      setScreenKeepAwake(false);
    }
    return () => {
      setScreenKeepAwake(false);
    };
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer || !timerStartedAt) {
      return;
    }

    const updateTime = () => {
      tickTimer();
      setCurrentTime(Date.now());
    };

    const interval = setInterval(updateTime, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateTime();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeTimer, timerStartedAt, tickTimer]);

  const elapsedSeconds = (activeTimer && timerStartedAt)
    ? Math.max(0, Math.floor((currentTime - timerStartedAt) / 1000))
    : 0;

  const activeProject = projects.find(p => p.id === timerProjectId);

  return {
    activeTimer,
    timerStartedAt,
    timerProjectId,
    activeProject,
    elapsedSeconds,
    formatTime: formatTimerSeconds,
    toggleTimer,
  };
}
