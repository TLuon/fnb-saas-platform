import { useState, useEffect, useRef } from 'react';

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

    const calculateRemaining = () => {
      return Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000));
    };

    const initial = calculateRemaining();
    setRemaining(initial);

    if (initial <= 0) {
      onCompleteRef.current();
      return;
    }

    const intervalId = setInterval(() => {
      const current = calculateRemaining();
      setRemaining(current);

      if (current <= 0) {
        clearInterval(intervalId);
        onCompleteRef.current();
      }
    }, 500); // Check every 500ms to avoid skipping seconds visually

    return () => clearInterval(intervalId);
  }, [targetTimestamp]);

  return remaining;
}
