/**
 * CInsight Tier Constants
 *
 * These constants are used by various components for tier-based styling.
 * The old static annotation system has been replaced with LLM-generated annotations.
 */

export { TIER_COLORS, TIER_LABELS } from '../config/tier-colors';
import type { FileAnnotation, LineAnnotation } from './types';

/**
 * Parse line range string (e.g., "10-20" or "15") to [start, end]
 */
export function parseLineRange(lines: string): [number, number] {
  if (lines.includes('-')) {
    const [start, end] = lines.split('-').map(Number);
    return [start, end];
  }
  const num = Number(lines);
  return [num, num];
}

/**
 * Get the best annotation for a specific line number from a FileAnnotation
 * Returns the first annotation that covers the given line
 */
export function getBestAnnotationForLine(
  annotation: FileAnnotation,
  lineNumber: number
): LineAnnotation | undefined {
  return annotation.annotations.find((ann) => {
    const [start, end] = parseLineRange(ann.lines);
    return lineNumber >= start && lineNumber <= end;
  });
}
