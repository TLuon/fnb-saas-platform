export class CountdownTimer {
  private remaining: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  
  private onTick: (remaining: number) => void;
  private onComplete: () => void;
  
  constructor(
    initialSeconds: number,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ) {
    this.remaining = initialSeconds;
    this.onTick = onTick;
    this.onComplete = onComplete;
  }

  start() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.remaining -= 1;
      this.onTick(this.remaining);
      
      if (this.remaining <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getRemaining() {
    return this.remaining;
  }
}
