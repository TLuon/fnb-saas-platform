import { describe, it, expect } from 'vitest';
import { getTableColor } from './theme';

describe('getTableColor', () => {
  it('should return Accent color for AVAILABLE', () => {
    expect(getTableColor('AVAILABLE')).toBe('#FED8B1');
  });
  
  it('should return Secondary color for PENDING_LOCK', () => {
    expect(getTableColor('PENDING_LOCK')).toBe('#D67D3E');
  });
  
  it('should return Primary color for OCCUPIED', () => {
    expect(getTableColor('OCCUPIED')).toBe('#543310');
  });

  it('should return Primary color for RESERVED', () => {
    expect(getTableColor('RESERVED')).toBe('#543310');
  });
});
