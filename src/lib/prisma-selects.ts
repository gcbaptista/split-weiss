/**
 * Shared Prisma select objects to avoid duplication across actions.
 */
export const memberSelect = {
  id: true,
  name: true,
} as const;
