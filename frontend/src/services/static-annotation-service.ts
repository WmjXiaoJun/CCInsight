/**
 * Static Annotation Service
 *
 * Loads pre-authored annotations from annotations/bundle.json
 * (built by scripts/build-annotations.mjs into frontend/public/annotations/bundle.json)
 *
 * These annotations are versioned in Git and provide hand-written explanations
 * for the most important files in the codebase.
 */

import type { FileAnnotation, LineAnnotation } from '../annotations/types';
import { parseLineRange } from '../annotations/loader';

const BUNDLE_URL = '/annotations/bundle.json';
const MANIFEST_URL = '/annotations/MANIFEST.json';

let bundleCache: FileAnnotation[] | null = null;
let manifestCache: any | null = null;
let loadingPromise: Promise<void> | null = null;

/**
 * Load the annotation bundle from the public directory.
 * Results are cached in memory for the session lifetime.
 */
export async function loadAnnotationBundle(): Promise<FileAnnotation[]> {
  if (bundleCache !== null) return bundleCache;
  if (loadingPromise !== null) {
    await loadingPromise;
    return bundleCache!;
  }

  loadingPromise = (async () => {
    try {
      const resp = await fetch(BUNDLE_URL);
      if (!resp.ok) {
        console.warn(`[StaticAnnotationService] Failed to load bundle: ${resp.status}`);
        bundleCache = [];
        return;
      }
      const data: FileAnnotation[] = await resp.json();
      bundleCache = data;
    } catch (err) {
      console.warn('[StaticAnnotationService] Failed to load annotation bundle:', err);
      bundleCache = [];
    }
  })();

  await loadingPromise;
  return bundleCache!;
}

/**
 * Load the annotation manifest (metadata about coverage stats).
 */
export async function loadAnnotationManifest(): Promise<any | null> {
  if (manifestCache !== null) return manifestCache;
  try {
    const resp = await fetch(MANIFEST_URL);
    if (!resp.ok) return null;
    manifestCache = await resp.json();
  } catch {
    // ignore
  }
  return manifestCache;
}

/**
 * Get all annotations for a specific file path.
 * Matches against the `path` field in FileAnnotation (relative to src/).
 */
export async function getAnnotationsForFile(
  filePath: string
): Promise<FileAnnotation | undefined> {
  const bundle = await loadAnnotationBundle();
  return bundle.find((ann) => ann.path === filePath);
}

/**
 * Get annotations that cover a specific line number.
 */
export async function getAnnotationsForLine(
  filePath: string,
  lineNumber: number
): Promise<LineAnnotation[]> {
  const fileAnn = await getAnnotationsForFile(filePath);
  if (!fileAnn) return [];

  return fileAnn.annotations.filter((ann) => {
    const [start, end] = parseLineRange(ann.lines);
    return lineNumber >= start && lineNumber <= end;
  });
}

/**
 * Get annotation statistics for display in the UI.
 */
export async function getAnnotationStats(): Promise<{
  totalFiles: number;
  totalAnnotations: number;
  coverage: Record<number, { total: number; annotated: number }>;
} | null> {
  const manifest = await loadAnnotationManifest();
  if (!manifest) return null;
  return {
    totalFiles: manifest.statistics?.totalFiles ?? 0,
    totalAnnotations: manifest.statistics?.totalTiers ?? 0,
    coverage: manifest.statistics?.coverage ?? {},
  };
}

/**
 * Clear the in-memory cache (useful for testing or refresh).
 */
export function clearAnnotationCache(): void {
  bundleCache = null;
  manifestCache = null;
  loadingPromise = null;
}
