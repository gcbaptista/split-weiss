import Decimal from "decimal.js";

export interface SplitInput {
  userId: string;
  percentage?: string;
  amount?: string;
  isLocked?: boolean;
}

export interface SplitResult {
  userId: string;
  amount: Decimal;
  isLocked: boolean;
}

/**
 * Simple deterministic hash → number from a string.
 * Same input always produces the same output.
 */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned 32-bit
}

/**
 * Deterministic Fisher-Yates shuffle seeded from the inputs.
 * Same seed string → same permutation every time.
 */
export function seededShuffle(indices: number[], seed: string): number[] {
  let h = hashSeed(seed);
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    // xorshift32 for next pseudo-random
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    const j = (h >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export { calculateLock } from "./lock";
export { calculatePercentage } from "./percentage";
