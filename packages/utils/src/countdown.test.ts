import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CountdownTimer } from './countdown';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should decrease remaining time every second', () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();
    const timer = new CountdownTimer(10, onTick, onComplete);

    timer.start();
    
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(9);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(8);
  });

  it('should call onComplete when time reaches 0', () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();
    const timer = new CountdownTimer(2, onTick, onComplete);

    timer.start();
    vi.advanceTimersByTime(2000);
    
    expect(onTick).toHaveBeenCalledWith(0);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should stop when stop() is called', () => {
    const onTick = vi.fn();
    const timer = new CountdownTimer(10, onTick, vi.fn());

    timer.start();
    vi.advanceTimersByTime(1000);
    timer.stop();
    vi.advanceTimersByTime(1000);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(onTick).toHaveBeenCalledWith(9);
  });
});
