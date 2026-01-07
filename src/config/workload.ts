'use client';

export const WORKLOAD_SETTINGS = {
  // Price Thresholds for Auto-Calculation
  mediumThreshold: 150,
  highThreshold: 500,

  // Buffer Rules (Days to add to safety margin)
  baseBuffer: 2,
  bufferAdditions: {
    LOW: 0,
    MEDIUM: 2,
    HIGH: 5,
  },
};
