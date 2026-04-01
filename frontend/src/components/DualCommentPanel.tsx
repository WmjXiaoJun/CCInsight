import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from '@/lib/lucide-icons';
import type { FileAnnotation, LineAnnotation } from '../annotations/types';
import { TIER_COLORS, getBestAnnotationForLine } from '../annotations/loader';

interface DualCommentPanelProps {
  /** The file annotation to display */
  annotation: FileAnnotation;
  /** Currently highlighted line number */
  activeLine?: number;
  /** Called when user clicks a line in the annotation */
  onLineClick?: (line: number) => void;
  /** Whether the panel is open */
  isOpen?: boolean;
  /** Called when the panel is closed */
  onClose?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  section: '段落',
  function: '函数',
  class: '类',
  variable: '变量',
  import: '导入',
  type: '类型',
  comment: '注释',
  tip: '提示',
  warning: '警告',
};

export const DualCommentPanel: React.FC<DualCommentPanelProps> = ({
  annotation,
  activeLine,
  onLineClick,
  isOpen = true,
  onClose,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Auto-scroll to the annotation matching the active line
  useEffect(() => {
    if (activeLine !== undefined) {
      const idx = annotation.annotations.findIndex((a) => {
        const range = a.lines.includes('-')
          ? a.lines.split('-').map(Number)
          : [Number(a.lines), Number(a.lines)];
        return activeLine >= range[0] && activeLine <= range[1];
      });
      if (idx >= 0) setSelectedIdx(idx);
    }
  }, [activeLine, annotation.annotations]);

  const filtered = filterType
    ? annotation.annotations.filter((a) => a.type === filterType)
    : annotation.annotations;

  const currentAnnotation = filtered[selectedIdx];

  const goNext = useCallback(() => {
    setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
  }, [filtered.length]);

  const goPrev = useCallback(() => {
    setSelectedIdx((i) => Math.max(i - 1, 0));
  }, []);

  if (!isOpen) return null;

  const tierColor = TIER_COLORS[annotation.tier] || '#5856D6';

  return (
    <div
      style={{
        width: fullscreen ? '100%' : 400,
        height: fullscreen ? '100vh' : 'auto',
        maxHeight: fullscreen ? '100vh' : 600,
        backgroundColor: '#0f0f16',
        borderLeft: `2px solid ${tierColor}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        position: fullscreen ? 'fixed' : 'relative',
        right: 0,
        top: fullscreen ? 0 : 'auto',
        zIndex: fullscreen ? 1000 : 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid #1f1f2e',
          backgroundColor: '#13131c',
          flexShrink: 0,
        }}
      >
        <BookOpen size={14} style={{ color: tierColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#E5E7EB',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: '"JetBrains Mono", monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {annotation.path.split('/').pop()}
          </div>
          <div style={{ color: '#6B7280', fontSize: '10px', marginTop: 1 }}>
            {annotation.description.slice(0, 60)}
            {annotation.description.length > 60 ? '...' : ''}
          </div>
        </div>

        {/* Tier Badge */}
        <span
          style={{
            backgroundColor: `${tierColor}22`,
            color: tierColor,
            border: `1px solid ${tierColor}44`,
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '10px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          T{annotation.tier}
        </span>

        {/* Action buttons */}
        <button
          onClick={() => setFullscreen(!fullscreen)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={iconBtnStyle}
        >
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        {onClose && (
          <button onClick={onClose} title="Close" style={iconBtnStyle}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Navigation bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderBottom: '1px solid #1a1a26',
          backgroundColor: '#0f0f16',
          flexShrink: 0,
        }}
      >
        <button onClick={goPrev} disabled={selectedIdx === 0} style={{ ...navBtnStyle, opacity: selectedIdx === 0 ? 0.3 : 1 }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ color: '#6B7280', fontSize: '11px', flex: 1, textAlign: 'center' }}>
          {selectedIdx + 1} / {filtered.length}
        </span>
        <button onClick={goNext} disabled={selectedIdx >= filtered.length - 1} style={{ ...navBtnStyle, opacity: selectedIdx >= filtered.length - 1 ? 0.3 : 1 }}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 14px',
          borderBottom: '1px solid #1a1a26',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {['section', 'function', 'class', 'variable', 'import', 'type', 'tip', 'warning'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? null : type)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: filterType === type ? '#5856D6' : '#2a2a3a',
              backgroundColor: filterType === type ? '#5856D622' : 'transparent',
              color: filterType === type ? '#A78BFA' : '#6B7280',
              fontSize: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {TYPE_LABELS[type] || type}
          </button>
        ))}
      </div>

      {/* Content */}
      {currentAnnotation && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
          }}
        >
          {/* Type + Name header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                backgroundColor: '#5856D6',
                color: '#fff',
                borderRadius: '4px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {currentAnnotation.type.toUpperCase()}
            </span>
            {currentAnnotation.name && (
              <span
                style={{
                  color: '#E5E7EB',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {currentAnnotation.name}
              </span>
            )}
            <span style={{ color: '#6B7280', fontSize: '11px', marginLeft: 'auto' }}>
              Lines {currentAnnotation.lines}
            </span>
          </div>

          {/* Chinese explanation */}
          <div
            style={{
              backgroundColor: '#16161e',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: 12,
              borderLeft: '3px solid #34C759',
            }}
          >
            <div style={{ color: '#6B7280', fontSize: '10px', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
              ZH-CN
            </div>
            <p style={{ color: '#F9FAFB', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
              {currentAnnotation.zh}
            </p>
          </div>

          {/* English note (if available) */}
          {currentAnnotation.en && (
            <div
              style={{
                backgroundColor: '#16161e',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: 12,
                borderLeft: '3px solid #007AFF',
              }}
            >
              <div style={{ color: '#6B7280', fontSize: '10px', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
                EN-US
              </div>
              <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                {currentAnnotation.en}
              </p>
            </div>
          )}

          {/* Code snippet (if available) */}
          {currentAnnotation.code && (
            <div
              style={{
                backgroundColor: '#090910',
                borderRadius: '8px',
                padding: '10px 12px',
                border: '1px solid #1f1f2e',
              }}
            >
              <div style={{ color: '#6B7280', fontSize: '10px', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
                CODE SNIPPET
              </div>
              <pre
                style={{
                  color: '#10B981',
                  fontSize: '11px',
                  fontFamily: '"JetBrains Mono", monospace',
                  lineHeight: 1.5,
                  margin: 0,
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                }}
              >
                {currentAnnotation.code}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Summary footer */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid #1a1a26',
          backgroundColor: '#0d0d14',
          flexShrink: 0,
        }}
      >
        <div style={{ color: '#4B5563', fontSize: '10px' }}>
          {annotation.annotations.length} annotations in this file
        </div>
      </div>
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#6B7280',
  cursor: 'pointer',
  padding: '2px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2a2a3a',
  color: '#9CA3AF',
  cursor: 'pointer',
  padding: '3px 6px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
