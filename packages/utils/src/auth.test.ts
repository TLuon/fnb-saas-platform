import { describe, it, expect } from 'vitest';
import { hasRole } from './auth';

describe('hasRole', () => {
  it('should return true when token has correct role and is not expired', () => {
    // Generate a mock JWT token. JWT has 3 parts separated by dots.
    // Base64Url encode of {"role_app":"CUSTOMER","exp":9999999999}
    const payload = btoa(JSON.stringify({ role_app: 'CUSTOMER', exp: 9999999999 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockToken = `header.${payload}.signature`;
    
    expect(hasRole(mockToken, 'CUSTOMER')).toBe(true);
  });

  it('should return false when token is expired', () => {
    const payload = btoa(JSON.stringify({ role_app: 'CUSTOMER', exp: 1000000000 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockToken = `header.${payload}.signature`;
    
    expect(hasRole(mockToken, 'CUSTOMER')).toBe(false);
  });

  it('should return false when role does not match', () => {
    const payload = btoa(JSON.stringify({ role_app: 'STAFF', exp: 9999999999 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockToken = `header.${payload}.signature`;
    
    expect(hasRole(mockToken, 'OWNER')).toBe(false);
  });
});
