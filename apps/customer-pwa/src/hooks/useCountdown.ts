import { useState, useEffect } from 'react';
import { CountdownTimer } from '@fnb/utils';

export function useCountdown(targetTimestamp: number | null, onComplete: () => void) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetTimestamp) {
      setRemaining(0);
      return;
    }

    const diffSeconds = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
    setRemaining(diffSeconds);

    if (diffSeconds <= 0) {
      onComplete();
      return;
    }

    const timer = new CountdownTimer(
      diffSeconds,
      (rem) => setRemaining(rem),
      () => {
        setRemaining(0);
        onComplete();
      }
    );

    timer.start();

    return () => timer.stop();
  }, [targetTimestamp, onComplete]);

  return remaining;
}
