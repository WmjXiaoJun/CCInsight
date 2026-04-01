import React from 'react';
import { TIER_COLORS, TIER_LABELS } from '../config/tier-colors';

interface TierBadgeProps {
  tier: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  size = 'md',
  showLabel = true,
}) => {
  const color = TIER_COLORS[tier] || '#5856D6';
  const label = TIER_LABELS[tier] || `Tier ${tier}`;

  const sizeStyles: Record<string, { badge: React.CSSProperties; label: React.CSSProperties }> = {
    sm: {
      badge: { padding: '1px 5px', fontSize: '10px', fontWeight: 700, borderRadius: '3px' },
      label: { fontSize: '10px' },
    },
    md: {
      badge: { padding: '2px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '4px' },
      label: { fontSize: '11px' },
    },
    lg: {
      badge: { padding: '3px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '5px' },
      label: { fontSize: '12px' },
    },
  };

  const styles = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: `${color}22`,
        border: `1px solid ${color}55`,
        color: color,
        ...styles.badge,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: '"JetBrains Mono", monospace', ...styles.label }}>
        T{tier}
      </span>
      {showLabel && (
        <span
          style={{
            color: `${color}bb`,
            ...styles.label,
            marginLeft: 2,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
};
