/**
 * React Hook for LLM Annotations
 * 
 * Provides a simple interface for components to use LLM-generated annotations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LLMAnnotation } from '../services/llm-annotation-types';
import { getLLMAnnotationService, LLMAnnotationService } from '../services/llm-annotation-service';

export interface UseLLMAnnotationsOptions {
  /** Whether to auto-generate annotations when content changes */
  autoGenerate?: boolean;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
}

export interface UseLLMAnnotationsReturn {
  /** Generated annotations */
  annotations: LLMAnnotation[];
  /** Whether annotations are currently being generated */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Whether LLM is configured */
  isConfigured: boolean;
  /** Generate annotations for current content */
  generate: () => Promise<void>;
  /** Cancel ongoing generation */
  cancel: () => void;
  /** Clear cached annotations */
  clearCache: () => Promise<void>;
  /** Get annotation for a specific line */
  getAnnotationForLine: (lineNum: number) => LLMAnnotation | undefined;
}

export function useLLMAnnotations(
  content: string | null,
  filePath: string,
  options: UseLLMAnnotationsOptions = {}
): UseLLMAnnotationsReturn {
  const {
    autoGenerate = true,
    debounceMs = 500,
  } = options;

  const [annotations, setAnnotations] = useState<LLMAnnotation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const serviceRef = useRef<LLMAnnotationService | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = getLLMAnnotationService();
  }, []);

  // Generate annotations
  const generate = useCallback(async () => {
    if (!content || !filePath) {
      setAnnotations([]);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);

    try {
      const service = serviceRef.current;
      if (!service) {
        throw new Error('Annotation service not initialized');
      }

      if (!service.isConfigured()) {
        throw new Error('LLM not configured. Please configure AI settings first.');
      }

      const result = await service.generateAnnotations(
        content,
        filePath,
        abortControllerRef.current.signal
      );
      
      setAnnotations(result);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to generate annotations';
      setError(message);
      console.error('Annotation generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [content, filePath]);

  // Auto-generate with debounce
  useEffect(() => {
    if (!autoGenerate || !content || !filePath) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generate();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, filePath, autoGenerate, debounceMs, generate]);

  // Cancel ongoing generation
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    const service = serviceRef.current;
    if (service) {
      await service.clearCache(filePath);
      setAnnotations([]);
    }
  }, [filePath]);

  // Get annotation for specific line
  const getAnnotationForLine = useCallback((lineNum: number): LLMAnnotation | undefined => {
    return annotations.find(
      ann => lineNum >= ann.lineStart && lineNum <= ann.lineEnd
    );
  }, [annotations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    annotations,
    isGenerating,
    error,
    isConfigured: serviceRef.current?.isConfigured() ?? false,
    generate,
    cancel,
    clearCache,
    getAnnotationForLine,
  };
}
