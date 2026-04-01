/**
 * LLM Annotation Service
 * 
 * Dynamically generates Chinese annotations for code files using LLM.
 * Handles caching, parsing, and error recovery.
 */

import { getActiveProviderConfig } from '../core/llm/settings-service';
import { ProxyChatModel } from '../core/llm/proxy-chat-model';
import type { LLMAnnotation, LLMAnnotationOptions, CacheEntry } from './llm-annotation-types';

const DB_NAME = 'cinsight-annotations';
const STORE_NAME = 'annotations';
const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * System prompt for code annotation
 */
const ANNOTATION_SYSTEM_PROMPT = `You are CInsight, an expert code annotator specialized in explaining complex code in simple Chinese.

Your task is to analyze the provided code and generate concise Chinese annotations.
You MUST follow these rules STRICTLY:

1. **Be CONCISE** - Each annotation should be 20-80 characters
2. **Explain the PURPOSE** - Focus on "why" not just "what"
3. **Use technical terms** when appropriate in Chinese
4. **Detect English comments** - If code has existing English comments, translate them AND preserve the original English
5. **Return ONLY valid JSON** - No markdown, no explanations, just the JSON array

## Output Format
Return a JSON array of annotation objects:

[
  {
    "lineStart": 10,
    "lineEnd": 15,
    "type": "function",
    "name": "main",
    "zh": "中文解释...",
    "en": "English comment",
    "confidence": 0.95
  }
]

## Type Guidelines
- **function**: 函数的用途和参数含义
- **class**: 类的职责和设计意图
- **variable**: 变量的含义，特别是晦涩的常量
- **section**: 代码块的逻辑意图
- **import**: 导入的模块或依赖的作用
- **type**: 类型定义的目的
- **comment**: 注释翻译
- **tip**: 最佳实践或重要提示
- **warning**: 潜在问题或陷阱

Now analyze the following code and return ONLY the JSON array:`;

/**
 * Calculate hash for file content
 */
function calculateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * IndexedDB wrapper for annotation caching
 */
class AnnotationCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => {
        console.warn('Failed to open IndexedDB:', request.error);
        this.initPromise = null;
        resolve();
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'filePath' });
        }
      };
    });

    return this.initPromise;
  }

  async get(filePath: string): Promise<CacheEntry | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(filePath);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async set(filePath: string, entry: CacheEntry): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ filePath, ...entry });
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  async delete(filePath: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(filePath);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }
}

/**
 * LLM Annotation Service
 */
export class LLMAnnotationService {
  private cache: AnnotationCache;
  private options: Required<LLMAnnotationOptions>;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(options: LLMAnnotationOptions = {}) {
    this.cache = new AnnotationCache();
    this.options = {
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 4096,
      model: options.model ?? 'gpt-4o',
      cacheTtl: options.cacheTtl ?? DEFAULT_CACHE_TTL,
    };
  }

  /**
   * Check if LLM is configured
   */
  isConfigured(): boolean {
    return getActiveProviderConfig() !== null;
  }

  /**
   * Generate annotations for a file
   */
  async generateAnnotations(
    code: string,
    filePath: string,
    signal?: AbortSignal
  ): Promise<LLMAnnotation[]> {
    const contentHash = calculateHash(code);
    const cacheKey = filePath;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached && cached.fileHash === contentHash && Date.now() < cached.expiresAt) {
      return cached.annotations.map(ann => ({ ...ann, filePath }));
    }

    // Cancel existing request for this file
    const existingController = this.abortControllers.get(cacheKey);
    existingController?.abort();
    const controller = new AbortController();
    this.abortControllers.set(cacheKey, controller);

    // Handle external abort
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const annotations = await this.callLLM(code, filePath, controller.signal);
      
      // Cache the result
      const entry: CacheEntry = {
        annotations,
        fileHash: contentHash,
        generatedAt: Date.now(),
        expiresAt: Date.now() + this.options.cacheTtl,
      };
      await this.cache.set(cacheKey, entry);

      return annotations;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      throw error;
    } finally {
      this.abortControllers.delete(cacheKey);
    }
  }

  /**
   * Call LLM API to generate annotations
   */
  private async callLLM(
    code: string,
    filePath: string,
    signal: AbortSignal
  ): Promise<LLMAnnotation[]> {
    const config = getActiveProviderConfig();
    
    if (!config) {
      throw new Error('LLM not configured. Please configure AI settings first.');
    }

    let model;
    if (config.provider === 'generic') {
      // Use proxy model for generic provider to avoid CORS issues
      model = new ProxyChatModel({
        baseUrl: (config as any).baseUrl,
        apiKey: (config as any).apiKey,
        model: (config as any).model,
        temperature: config.temperature ?? 0.1,
        maxTokens: config.maxTokens,
        streaming: false,
      });
    } else {
      // For other providers, we still need createChatModel
      // But this might have CORS issues - for now, throw an error
      throw new Error('Annotation service only supports Generic API provider currently. Please use the chat agent for code analysis.');
    }
    
    const userPrompt = `File: ${filePath}\n\n\`\`\`\n${code}\n\`\`\``;

    try {
      const response = await model.invoke([
        { role: 'system', content: ANNOTATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ], { signal });

      const content = typeof response.content === 'string' 
        ? response.content 
        : response.content.map((c: any) => typeof c === 'string' ? c : c.text).join('');

      return this.parseAnnotations(content, filePath);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse LLM response to extract annotations
   */
  private parseAnnotations(content: string, filePath: string): LLMAnnotation[] {
    // Try to extract JSON from the response
    let jsonStr = content.trim();

    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const raw = JSON.parse(jsonStr);
      const annotations = Array.isArray(raw) ? raw : raw.annotations || [];

      return annotations.map((item: any, index: number) => ({
        id: `llm-${Date.now()}-${index}`,
        filePath,
        lineStart: Math.max(0, Number(item.lineStart) || 0),
        lineEnd: Math.max(0, Number(item.lineEnd) || item.lineStart || 0),
        type: this.validateType(item.type),
        name: item.name || undefined,
        zh: String(item.zh || item.description || ''),
        en: item.en || null,
        confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.8)),
        generatedAt: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to parse LLM annotation response:', error);
      return [];
    }
  }

  /**
   * Validate and normalize annotation type
   */
  private validateType(type: string): LLMAnnotation['type'] {
    const validTypes: LLMAnnotation['type'][] = [
      'function', 'class', 'variable', 'section', 'comment', 'import', 'type', 'tip', 'warning'
    ];
    const normalizedType = String(type).toLowerCase().trim();
    return validTypes.includes(normalizedType as any) 
      ? normalizedType as LLMAnnotation['type']
      : 'comment';
  }

  /**
   * Cancel ongoing annotation generation for a file
   */
  cancelGeneration(filePath: string): void {
    const controller = this.abortControllers.get(filePath);
    controller?.abort();
    this.abortControllers.delete(filePath);
  }

  /**
   * Clear cache for a specific file or all files
   */
  async clearCache(filePath?: string): Promise<void> {
    if (filePath) {
      await this.cache.delete(filePath);
    } else {
      await this.cache.clear();
    }
  }

  /**
   * Check if annotations exist in cache
   */
  async hasCachedAnnotations(filePath: string, contentHash: string): Promise<boolean> {
    const cached = await this.cache.get(filePath);
    return !!(cached && cached.fileHash === contentHash && Date.now() < cached.expiresAt);
  }
}

// Singleton instance
let serviceInstance: LLMAnnotationService | null = null;

export function getLLMAnnotationService(): LLMAnnotationService {
  if (!serviceInstance) {
    serviceInstance = new LLMAnnotationService();
  }
  return serviceInstance;
}
