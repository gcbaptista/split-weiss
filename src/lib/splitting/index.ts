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

export { calculateEqual } from "./equal";
export { calculatePercentage } from "./percentage";
export { calculateValue } from "./value";
export { calculateLock } from "./lock";
