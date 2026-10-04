export class CountdownTimer {
  private remaining: number;
  private targetTime: number = 0;
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
    if (this.intervalId || this.remaining <= 0) return;
    
    this.targetTime = Date.now() + this.remaining * 1000;
    
    this.intervalId = setInterval(() => {
      this.remaining = Math.max(0, Math.floor((this.targetTime - Date.now()) / 1000));
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
      this.remaining = Math.max(0, Math.floor((this.targetTime - Date.now()) / 1000));
    }
  }

  getRemaining() {
    if (this.intervalId) {
      return Math.max(0, Math.floor((this.targetTime - Date.now()) / 1000));
    }
    return this.remaining;
  }
}
