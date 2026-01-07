'use client';

import type { Order } from '@/lib/types';
import { WORKLOAD_SETTINGS } from '@/config/workload';

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Determines complexity by checking Tags first, then Price.
 */
export function getOrderComplexity(order: Order): {
  level: ComplexityLevel;
  isManual: boolean;
} {
  const tags = order.tags || [];

  // 1. Check Manual Overrides
  if (tags.includes('complexity:high')) return { level: 'HIGH', isManual: true };
  if (tags.includes('complexity:medium'))
    return { level: 'MEDIUM', isManual: true };
  if (tags.includes('complexity:low')) return { level: 'LOW', isManual: true };

  // 2. Fallback to Auto-Calculation
  const total = order.orderTotal || 0;
  if (total >= WORKLOAD_SETTINGS.highThreshold)
    return { level: 'HIGH', isManual: false };
  if (total >= WORKLOAD_SETTINGS.mediumThreshold)
    return { level: 'MEDIUM', isManual: false };

  return { level: 'LOW', isManual: false };
}

/**
 * Returns the calculated safety buffer in days.
 */
export function getSafeBuffer(level: ComplexityLevel): number {
  return WORKLOAD_SETTINGS.baseBuffer + WORKLOAD_SETTINGS.bufferAdditions[level];
}
