// Annotation types for CCInsight bilingual code annotation system

export interface LineAnnotation {
  /** Line range in format "1-50" or "201" */
  lines: string;
  /** Annotation type: section, function, class, variable, import, type, comment */
  type: 'section' | 'function' | 'class' | 'variable' | 'import' | 'type' | 'comment' | 'tip' | 'warning';
  /** Optional name for function/class/variable annotations */
  name?: string;
  /** Chinese explanation */
  zh: string;
  /** Optional English note (often just the original comment) */
  en?: string;
  /** Optional code snippet referenced */
  code?: string;
  /** Tier level of this annotation */
  tier?: number;
}

export interface FileAnnotation {
  /** Relative path from src/ root */
  path: string;
  /** Tier level of this file */
  tier: number;
  /** Overall file description in Chinese */
  description: string;
  /** English description */
  descriptionEn?: string;
  /** All line-level annotations */
  annotations: LineAnnotation[];
  /** Last updated timestamp */
  updatedAt?: string;
  /** Author of the annotation */
  author?: string;
}

export interface TierInfo {
  tier: number;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  priority: number;
}

export interface AnnotationManifest {
  version: string;
  sourceRepository: string;
  annotationDate: string;
  tiers: TierInfo[];
  files: Array<{
    tier: number;
    path: string;
    priority: number;
    status: 'pending' | 'in_progress' | 'annotated';
    description: string;
  }>;
  statistics: {
    totalFiles: number;
    totalTiers: number;
    coverage: Record<string, { total: number; annotated: number }>;
  };
}
