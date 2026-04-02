/**
 * React Hook for Static (Pre-authored) Annotations
 *
 * Loads pre-authored Chinese annotations from the annotation bundle
 * (public/annotations/bundle.json, built by scripts/build-annotations.mjs).
 *
 * These annotations are versioned in Git and provide curated explanations
 * for the most important files in the codebase.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FileAnnotation, LineAnnotation } from '../annotations/types';
import {
  loadAnnotationBundle,
  loadAnnotationManifest,
  getAnnotationsForFile,
  getAnnotationStats,
  clearAnnotationCache,
} from '../services/static-annotation-service';

export interface StaticAnnotationData {
  fileAnnotation: FileAnnotation | undefined;
  lineAnnotations: LineAnnotation[];
  isLoaded: boolean;
  stats: {
    totalFiles: number;
    totalAnnotations: number;
    coverage: Record<number, { total: number; annotated: number }>;
  } | null;
}

export interface UseStaticAnnotationsReturn {
  /** Static annotations for the current file */
  fileAnnotation: FileAnnotation | undefined;
  /** Flat list of line-level annotations */
  lineAnnotations: LineAnnotation[];
  /** Whether the bundle has been loaded */
  isLoaded: boolean;
  /** Coverage statistics */
  stats: StaticAnnotationData['stats'];
  /** Reload the annotation bundle */
  reload: () => Promise<void>;
}

/**
 * Hook to load static annotations for a given file path.
 *
 * Usage:
 *   const { fileAnnotation, lineAnnotations, isLoaded } = useStaticAnnotations(filePath);
 */
export function useStaticAnnotations(
  filePath: string | undefined
): UseStaticAnnotationsReturn {
  const [fileAnnotation, setFileAnnotation] = useState<FileAnnotation | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [stats, setStats] = useState<StaticAnnotationData['stats']>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(async () => {
    clearAnnotationCache();
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!filePath) {
      setFileAnnotation(undefined);
      setIsLoaded(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const [fa, s] = await Promise.all([
        getAnnotationsForFile(filePath),
        getAnnotationStats(),
      ]);

      if (!cancelled) {
        setFileAnnotation(fa);
        setStats(s);
        setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, reloadKey]);

  // Flatten to line-level annotations for easier use
  const lineAnnotations = fileAnnotation?.annotations ?? [];

  return {
    fileAnnotation,
    lineAnnotations,
    isLoaded,
    stats,
    reload,
  };
}

/**
 * Hook to load annotation bundle stats (for settings/debug panel).
 */
export function useAnnotationStats() {
  const [stats, setStats] = useState<StaticAnnotationData['stats']>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getAnnotationStats();
      if (!cancelled) {
        setStats(s);
        setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, isLoaded };
}
