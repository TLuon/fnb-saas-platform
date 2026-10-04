import { describe, it, expect } from 'vitest';
import { getTableColor } from './theme';

describe('getTableColor', () => {
  it('should return light cream color for AVAILABLE', () => {
    expect(getTableColor('AVAILABLE')).toBe('#FAF7F3');
  });
  
  it('should return Accent color for PENDING_LOCK', () => {
    expect(getTableColor('PENDING_LOCK')).toBe('#FED8B1');
  });
  
  it('should return Secondary color for RESERVED', () => {
    expect(getTableColor('RESERVED')).toBe('#D67D3E');
  });

  it('should return Primary color for OCCUPIED', () => {
    expect(getTableColor('OCCUPIED')).toBe('#543310');
  });

  it('should return Neutral color for CLEANING', () => {
    expect(getTableColor('CLEANING')).toBe('#E8DED5');
  });
});
