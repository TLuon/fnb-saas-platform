/**
 * Simple pseudo-TOTP generator for mock environments.
 * Do not use for real security.
 */
export function generateTOTP(secret: string): string {
  const window = Math.floor(Date.now() / 30000);
  const str = `${secret}-${window}-salt`;
  
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
  }
  
  // Use pseudo-random logic to ensure 6 digits
  const seed = Math.abs(hash);
  // Math.sin(seed) returns a float between -1 and 1
  const rand = Math.abs(Math.sin(seed) * 1000000);
  const codeStr = Math.floor(rand).toString().padStart(6, '0');
  
  return codeStr.substring(0, 6);
}

export function getTOTPRemainingSeconds(): number {
  const currentSeconds = Math.floor(Date.now() / 1000);
  return 30 - (currentSeconds % 30);
}
