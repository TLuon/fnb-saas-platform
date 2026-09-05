import { useState, useEffect, useRef } from 'react';
import { CountdownTimer } from '@fnb/utils';

export function useCountdown(targetTimestamp: number | null, onComplete: () => void) {
  const [remaining, setRemaining] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!targetTimestamp) {
      setRemaining(0);
      return;
    }

    const diffSeconds = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
    setRemaining(diffSeconds);

    if (diffSeconds <= 0) {
      onCompleteRef.current();
      return;
    }

    const timer = new CountdownTimer(
      diffSeconds,
      (rem) => setRemaining(rem),
      () => {
        setRemaining(0);
        onCompleteRef.current();
      }
    );

    timer.start();

    return () => timer.stop();
  }, [targetTimestamp]);

  return remaining;
}
