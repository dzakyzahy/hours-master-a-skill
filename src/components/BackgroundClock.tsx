import { useState, useEffect } from 'react';
import { useStore } from '../store';

export function BackgroundClock() {
  const { clockEnabled } = useStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!clockEnabled) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [clockEnabled]);

  if (!clockEnabled) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '15vw',
      fontWeight: 900,
      opacity: 0.03,
      pointerEvents: 'none',
      zIndex: 0,
      whiteSpace: 'nowrap',
      fontFamily: 'monospace'
    }}>
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}
