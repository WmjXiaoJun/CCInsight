import React, { useState } from 'react';
import { MessageSquare, ChevronDown } from '@/lib/lucide-icons';
import type { LineAnnotation } from '../annotations/types';
import { TIER_COLORS } from '../annotations/loader';

interface AnnotationBubbleProps {
  annotation: LineAnnotation;
  tier?: number;
  compact?: boolean;
}

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

export const AnnotationBubble: React.FC<AnnotationBubbleProps> = ({
  annotation,
  tier = 1,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const bgColor = TYPE_COLORS[annotation.type] || TIER_COLORS[tier] || '#5856D6';
  const typeLabel = TYPE_ICONS[annotation.type] || annotation.type;

  if (compact) {
    return (
      <span
        title={`${annotation.name ? annotation.name + ': ' : ''}${annotation.zh}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          backgroundColor: `${bgColor}22`,
          border: `1px solid ${bgColor}66`,
          borderRadius: '4px',
          padding: '1px 5px',
          fontSize: '11px',
          color: bgColor,
          cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ opacity: 0.7 }}>{typeLabel}</span>
        {annotation.name && (
          <span style={{ fontWeight: 600 }}>{annotation.name}</span>
        )}
      </span>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'flex-start',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: `${bgColor}20`,
          border: `1px solid ${bgColor}55`,
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '12px',
          color: bgColor,
          cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace',
          transition: 'all 0.15s ease',
        }}
        title={`${annotation.name ? annotation.name + ' — ' : ''}${annotation.zh}`}
      >
        <MessageSquare size={11} />
        <span style={{ opacity: 0.7, fontSize: '10px' }}>{typeLabel}</span>
        {annotation.name && (
          <span style={{ fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {annotation.name}
          </span>
        )}
        <ChevronDown
          size={10}
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {expanded && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            minWidth: 280,
            maxWidth: 480,
            backgroundColor: '#16161e',
            border: `1px solid ${bgColor}55`,
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${bgColor}22`,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                backgroundColor: bgColor,
                color: '#fff',
                borderRadius: '4px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {annotation.type.toUpperCase()}
            </span>
            {annotation.name && (
              <span
                style={{
                  color: '#E5E7EB',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {annotation.name}
              </span>
            )}
            <span
              style={{
                marginLeft: 'auto',
                color: '#6B7280',
                fontSize: '11px',
              }}
            >
              L{annotation.lines}
            </span>
          </div>

          {/* Chinese description */}
          <p
            style={{
              color: '#F9FAFB',
              fontSize: '13px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {annotation.zh}
          </p>

          {/* English note if available */}
          {annotation.en && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid #374151',
              }}
            >
              <p
                style={{
                  color: '#9CA3AF',
                  fontSize: '12px',
                  fontStyle: 'italic',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {annotation.en}
              </p>
            </div>
          )}

          {/* Code snippet if available */}
          {annotation.code && (
            <pre
              style={{
                marginTop: 8,
                backgroundColor: '#0d0d14',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '11px',
                fontFamily: '"JetBrains Mono", monospace',
                color: '#10B981',
                overflow: 'auto',
                maxHeight: 120,
              }}
            >
              {annotation.code}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
