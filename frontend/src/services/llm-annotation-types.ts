// LLM-generated annotation types for CInsight

export interface LLMAnnotation {
  /** Unique identifier */
  id: string;
  /** File path */
  filePath: string;
  /** Start line number (0-based) */
  lineStart: number;
  /** End line number (0-based) */
  lineEnd: number;
  /** Annotation type */
  type: 'function' | 'class' | 'variable' | 'section' | 'comment' | 'import' | 'type' | 'tip' | 'warning';
  /** Symbol name (function name, class name, etc.) */
  name?: string;
  /** Chinese explanation */
  zh: string;
  /** English original (if code has existing English comments) */
  en?: string | null;
  /** Confidence score 0-1 */
  confidence: number;
  /** Generation timestamp */
  generatedAt: number;
}

export interface LLMAnnotationState {
  /** Map of file path to annotations */
  annotations: Map<string, LLMAnnotation[]>;
  /** Set of files currently being loaded */
  loading: Set<string>;
  /** Map of file path to error message */
  errors: Map<string, string>;
}

export interface LLMAnnotationOptions {
  /** Temperature for LLM generation (default: 0.3) */
  temperature?: number;
  /** Maximum tokens (default: 4096) */
  maxTokens?: number;
  /** Model to use (default: gpt-4o) */
  model?: string;
  /** Cache TTL in milliseconds (default: 7 days) */
  cacheTtl?: number;
}

export interface CacheEntry {
  /** Generated annotations */
  annotations: LLMAnnotation[];
  /** File content hash */
  fileHash: string;
  /** Generation timestamp */
  generatedAt: number;
  /** Expiration timestamp */
  expiresAt: number;
}
