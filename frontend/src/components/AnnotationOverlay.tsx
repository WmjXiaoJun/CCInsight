/**
 * AnnotatedCodeViewer
 *
 * Renders code with annotation bubbles overlaid on annotated lines.
 * Uses LLM to dynamically generate Chinese annotations for code.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getSyntaxLanguageFromFilename } from 'ccinsight-shared';
import { BookOpen, Maximize2, Minimize2, X, Loader2, AlertCircle, RefreshCw, Sparkles } from '@/lib/lucide-icons';
import { useLLMAnnotations } from '../hooks/useLLMAnnotations';
import { useStaticAnnotations } from '../hooks/useStaticAnnotations';
import type { LLMAnnotation } from '../services/llm-annotation-types';
import type { LineAnnotation } from '../annotations/types';

interface AnnotatedCodeViewerProps {
  /** File content to display */
  content: string;
  /** File path (used for language detection) */
  filePath: string;
  /** Starting line number (0-based or 1-based) */
  startLine?: number;
  /** Highlighted range (1-based, inclusive) */
  highlightStart?: number;
  highlightEnd?: number;
  /** Currently active line (for scrolling) */
  activeLine?: number;
  /** Callback when user clicks an annotation bubble */
  onAnnotationChange?: (ann: LLMAnnotation) => void;
  /** Whether to show the full annotation panel */
  showPanel?: boolean;
  /** Callback to toggle panel */
  onTogglePanel?: () => void;
  /** Callback when annotation generation state changes */
  onAnnotationStatusChange?: (status: 'idle' | 'generating' | 'done' | 'error', error?: string) => void;
}

const customTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: '#0a0a10',
    margin: 0,
    padding: '12px 0',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
};

const TYPE_ICONS: Record<string, string> = {
  function: 'fn',
  class: 'cls',
  section: 'sec',
  variable: 'var',
  import: 'imp',
  type: 'typ',
  comment: '//',
  tip: 'tip',
  warning: 'warn',
};

const TYPE_COLORS: Record<string, string> = {
  function: '#5856D6',
  class: '#AF52DE',
  section: '#007AFF',
  variable: '#34C759',
  import: '#FF9500',
  type: '#FF2D55',
  comment: '#6B7280',
  tip: '#00C7BE',
  warning: '#FF3B30',
};

// Compact annotation bubble (shown inline next to line number)
const AnnotationBubble = ({ ann, onClick }: { ann: LLMAnnotation; onClick: () => void }) => {
  const color = TYPE_COLORS[ann.type] || '#5856D6';
  const label = TYPE_ICONS[ann.type] || ann.type;

  return (
    <button
      onClick={onClick}
      title={`${ann.name ? ann.name + ': ' : ''}${ann.zh}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        backgroundColor: `${color}22`,
        border: `1px solid ${color}66`,
        borderRadius: '4px',
        padding: '1px 6px',
        fontSize: '10px',
        color: color,
        cursor: 'pointer',
        fontFamily: '"JetBrains Mono", monospace',
        marginLeft: '6px',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      {ann.name && <span style={{ fontWeight: 600 }}>{ann.name}</span>}
    </button>
  );
};

// Expanded annotation tooltip (inline below the code)
const AnnotationTooltip = ({ ann }: { ann: LLMAnnotation }) => {
  const color = TYPE_COLORS[ann.type] || '#5856D6';

  return (
    <div
      style={{
        backgroundColor: '#16161e',
        border: `1px solid ${color}44`,
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '8px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            backgroundColor: color,
            color: '#fff',
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {ann.type.toUpperCase()}
        </span>
        {ann.name && (
          <span style={{ color: '#E5E7EB', fontSize: '13px', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
            {ann.name}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#6B7280', fontSize: '11px' }}>
          L{ann.lineStart + 1}-{ann.lineEnd + 1}
        </span>
        {ann.confidence < 0.8 && (
          <span style={{ color: '#fbbf24', fontSize: '10px' }}>
            {Math.round(ann.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Chinese description */}
      <p style={{ color: '#F9FAFB', fontSize: '12px', lineHeight: 1.6, margin: 0, marginBottom: ann.en ? 6 : 0 }}>
        {ann.zh}
      </p>

      {/* English note */}
      {ann.en && (
        <p style={{ color: '#9CA3AF', fontSize: '11px', lineHeight: 1.5, margin: 0, fontStyle: 'italic', borderTop: '1px solid #374151', paddingTop: 6 }}>
          {ann.en}
        </p>
      )}
    </div>
  );
};

// Annotation generation status indicator
const AnnotationStatus = ({
  isGenerating,
  isConfigured,
  error,
  annotationCount,
  onRetry,
  staticCount,
  llmCount,
}: {
  isGenerating: boolean;
  isConfigured: boolean;
  error: string | null;
  annotationCount: number;
  onRetry?: () => void;
  staticCount?: number;
  llmCount?: number;
}) => {
  if (!isConfigured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#fbbf24' }}>
        <AlertCircle size={13} />
        <span>请先配置 AI 设置以启用注释生成</span>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#60a5fa' }}>
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        <span>CInsight 正在分析代码...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#f87171' }}>
        <AlertCircle size={13} />
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {error}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            <RefreshCw size={11} />
            重试
          </button>
        )}
      </div>
    );
  }

  if (annotationCount > 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#34d399' }}>
        <Sparkles size={13} />
        <span>
          {annotationCount} 个注释
          {staticCount !== undefined && (
            <span style={{ color: '#6B7280' }}>
              {' '}({staticCount} 静态 + {llmCount ?? 0} AI)
            </span>
          )}
        </span>
      </div>
    );
  }

  return null;
};

export const AnnotatedCodeViewer: React.FC<AnnotatedCodeViewerProps> = ({
  content,
  filePath,
  startLine = 0,
  highlightStart,
  highlightEnd,
  activeLine,
  onAnnotationChange,
  showPanel,
  onTogglePanel,
  onAnnotationStatusChange,
}) => {
  const [selectedAnn, setSelectedAnn] = useState<LLMAnnotation | null>(null);
  const viewerRef = React.useRef<HTMLDivElement>(null);

  // ── Static annotations (pre-authored, loaded from /annotations/bundle.json) ──
  const {
    fileAnnotation: staticFileAnnotation,
    lineAnnotations: staticLineAnnotations,
    isLoaded: staticLoaded,
  } = useStaticAnnotations(filePath);

  // ── LLM annotations (dynamically generated) ──
  const {
    annotations: llmAnnotations,
    isGenerating,
    error,
    isConfigured,
    generate,
    clearCache,
  } = useLLMAnnotations(content, filePath, { autoGenerate: true, debounceMs: 1000 });

  // ── Merge: Static annotations take priority; LLM supplements gaps ──
  // Build a map of line → static annotation for quick lookup
  const staticByLine = useMemo(() => {
    const map = new Map<number, LineAnnotation>();
    for (const ann of staticLineAnnotations) {
      const [start, end] = (() => {
        if (ann.lines.includes('-')) return ann.lines.split('-').map(Number);
        const n = Number(ann.lines);
        return [n, n];
      })();
      for (let line = start; line <= end; line++) {
        if (!map.has(line)) {
          map.set(line, ann);
        }
      }
    }
    return map;
  }, [staticLineAnnotations]);

  // LLM annotations for lines not covered by static annotations
  const supplementaryLlms = useMemo(
    () =>
      llmAnnotations.filter(
        (ann) => !staticByLine.has(ann.lineStart)
      ),
    [llmAnnotations, staticByLine]
  );

  // Total count shown in status
  const totalAnnotationCount = staticLineAnnotations.length + supplementaryLlms.length;

  // Notify parent of status changes
  useEffect(() => {
    if (onAnnotationStatusChange) {
      if (isGenerating) {
        onAnnotationStatusChange('generating');
      } else if (error) {
        onAnnotationStatusChange('error', error);
      } else if (totalAnnotationCount > 0) {
        onAnnotationStatusChange('done');
      } else {
        onAnnotationStatusChange('idle');
      }
    }
  }, [isGenerating, error, totalAnnotationCount, onAnnotationStatusChange]);

  // Reset selected annotation when file changes
  useEffect(() => {
    setSelectedAnn(null);
  }, [filePath]);

  // Auto-scroll to active line when it changes
  useEffect(() => {
    if (activeLine === undefined || !viewerRef.current) return;
    const lineEl = viewerRef.current.querySelector(`[data-line-number="${activeLine}"]`);
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLine]);

  const handleAnnotationClick = (ann: LLMAnnotation) => {
    if (selectedAnn?.id === ann.id) {
      setSelectedAnn(null);
    } else {
      setSelectedAnn(ann);
      onAnnotationChange?.(ann);
    }
  };

  // Convert 1-based highlight range to 0-based for comparison
  const hlStart0 = highlightStart !== undefined ? highlightStart - 1 : undefined;
  const hlEnd0 = highlightEnd !== undefined ? highlightEnd - 1 : undefined;

  const renderLine = (line: string, index: number): React.ReactElement => {
    // Line number in the highlighter (1-based relative to startLine)
    const lineNum0 = (startLine || 0) + index;
    const lineNum1 = lineNum0 + 1;

    // Priority: static annotation > LLM supplementary
    const staticAnn = staticByLine.get(lineNum0);
    const llmAnn = !staticAnn
      ? supplementaryLlms.find((ann) => lineNum0 >= ann.lineStart && lineNum0 <= ann.lineEnd)
      : undefined;

    const isHighlighted =
      hlStart0 !== undefined &&
      hlEnd0 !== undefined &&
      lineNum0 >= hlStart0 &&
      lineNum0 <= hlEnd0;

    const bubbleColor = staticAnn ? TYPE_COLORS[staticAnn.type] : llmAnn ? TYPE_COLORS[llmAnn.type] : undefined;

    // Unified annotation object for rendering
    const effectiveAnn = staticAnn
      ? {
          type: staticAnn.type,
          name: staticAnn.name,
          zh: staticAnn.zh,
          en: staticAnn.en,
        }
      : llmAnn
      ? { type: llmAnn.type, name: llmAnn.name, zh: llmAnn.zh, en: llmAnn.en ?? null }
      : undefined;

    return (
      <div
        key={index}
        data-line-number={lineNum1}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          backgroundColor: isHighlighted ? 'rgba(6, 182, 212, 0.14)' : 'transparent',
          borderLeft: isHighlighted ? '3px solid #06b6d4' : '3px solid transparent',
        }}
      >
        {/* Line number + annotation bubble */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: '4em',
            paddingRight: '8px',
            paddingLeft: '4px',
            userSelect: 'none',
            position: 'relative',
          }}
        >
          <span
            style={{
              color: '#5a5a70',
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              textAlign: 'right',
              width: '100%',
            }}
          >
            {lineNum1}
          </span>
          {effectiveAnn && (
            <AnnotationBubble
              ann={{
                id: `static-${lineNum0}`,
                filePath,
                lineStart: lineNum0,
                lineEnd: lineNum0,
                type: effectiveAnn.type as any,
                name: effectiveAnn.name,
                zh: effectiveAnn.zh,
                en: effectiveAnn.en ?? undefined,
                confidence: 1.0,
                generatedAt: 0,
              }}
              onClick={() => handleAnnotationClick({
                id: `static-${lineNum0}`,
                filePath,
                lineStart: lineNum0,
                lineEnd: lineNum0,
                type: effectiveAnn.type as any,
                name: effectiveAnn.name,
                zh: effectiveAnn.zh,
                en: effectiveAnn.en ?? undefined,
                confidence: 1.0,
                generatedAt: 0,
              })}
            />
          )}
        </div>

        {/* Code content */}
        <span style={{ flex: 1, paddingRight: '16px', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', color: '#e5e7eb' }}>
          {line}
        </span>
      </div>
    );
  };

  const lines = content.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with annotation status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderBottom: '1px solid #1f1f2e',
          backgroundColor: '#13131c',
          flexShrink: 0,
        }}
      >
        <BookOpen size={13} style={{ color: '#a78bfa' }} />
        <span style={{ color: '#E5E7EB', fontSize: '12px', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', flex: 1 }}>
          {filePath.split('/').pop()}
        </span>
        
        {/* Annotation status */}
        <AnnotationStatus
          isGenerating={isGenerating}
          isConfigured={isConfigured}
          error={error}
          annotationCount={totalAnnotationCount}
          onRetry={generate}
          staticCount={staticLineAnnotations.length}
          llmCount={supplementaryLlms.length}
        />

        {onTogglePanel && (
          <button
            onClick={onTogglePanel}
            style={{
              background: 'transparent',
              border: 'none',
              color: showPanel ? '#A78BFA' : '#6B7280',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title={showPanel ? 'Hide annotation panel' : 'Show annotation panel'}
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>

      {/* Main code + annotation area */}
      <div
        ref={viewerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 0',
          backgroundColor: '#0a0a10',
        }}
      >
        {lines.map((line, i) => renderLine(line, i))}
      </div>

      {/* Expanded annotation tooltip */}
      {selectedAnn && (
        <div
          style={{
            flexShrink: 0,
            borderTop: '2px solid #a78bfa',
            padding: '12px',
            backgroundColor: '#0f0f16',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#6B7280', fontSize: '11px' }}>
              CInsight 注释 — {filePath}
            </span>
            <button
              onClick={() => setSelectedAnn(null)}
              style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '2px' }}
            >
              <X size={13} />
            </button>
          </div>
          <AnnotationTooltip ann={selectedAnn} />
        </div>
      )}
    </div>
  );
};
