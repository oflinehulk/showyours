// Cryptographically secure random utilities — never uses Math.random()

/** Returns 0 or 1 using crypto.getRandomValues */
export function secureCoinFlip(): 0 | 1 {
  const arr = new Uint8Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] & 1) as 0 | 1;
}

/** Fisher-Yates shuffle using crypto.getRandomValues */
export function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  const randomValues = new Uint32Array(shuffled.length);
  crypto.getRandomValues(randomValues);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Generate a 16-byte hex seed for audit trail */
export function generateDrawSeed(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
