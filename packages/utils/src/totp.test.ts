import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTOTP, getTOTPRemainingSeconds } from './totp';

describe('TOTP Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate a 6-digit code', () => {
    const code = generateTOTP('secret_key');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should generate the same code within a 30s window', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z')); 
    const code1 = generateTOTP('secret');
    
    vi.setSystemTime(new Date('2026-01-01T00:00:25Z')); 
    const code2 = generateTOTP('secret');
    
    expect(code1).toBe(code2);
  });

  it('should generate a different code in the next 30s window', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:29Z')); 
    const code1 = generateTOTP('secret');
    
    vi.setSystemTime(new Date('2026-01-01T00:00:31Z')); 
    const code2 = generateTOTP('secret');
    
    expect(code1).not.toBe(code2);
  });

  it('should calculate remaining seconds correctly', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    expect(getTOTPRemainingSeconds()).toBe(25);

    vi.setSystemTime(new Date('2026-01-01T00:00:29Z'));
    expect(getTOTPRemainingSeconds()).toBe(1); 

    vi.setSystemTime(new Date('2026-01-01T00:00:35Z'));
    expect(getTOTPRemainingSeconds()).toBe(25); 
  });
});
