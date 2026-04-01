import { ReactNode } from 'react';
import { Eye, EyeOff, Key } from '@/lib/lucide-icons';
import type { ModelVariant } from '../../core/llm/types';

type ApiKeyField = {
  value: string;
  placeholder: string;
  helperText?: string;
  helperLink?: string;
  helperLinkLabel?: string;
  isVisible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

type VariantOption = {
  value: ModelVariant;
  label: string;
  description: string;
};

type ModelField = {
  value: string;
  placeholder: string;
  label?: string;
  helperText?: string;
  onChange: (value: string) => void;
  /** Available variants for this model */
  variants?: ModelVariant[];
  /** Currently selected variant */
  selectedVariant?: ModelVariant;
  /** Callback when variant changes */
  onVariantChange?: (variant: ModelVariant) => void;
  /** Show variant selector */
  showVariantSelector?: boolean;
};

interface ProviderConfigCardProps {
  title: string;
  description?: string;
  apiKey?: ApiKeyField;
  model?: ModelField;
  children?: ReactNode;
}

const VARIANT_OPTIONS: VariantOption[] = [
  { value: 'low', label: 'Low', description: '快速响应，适合简单任务' },
  { value: 'medium', label: 'Medium', description: '平衡速度与质量' },
  { value: 'high', label: 'High', description: '高质量输出' },
  { value: 'xhigh', label: 'X-High', description: '最高质量，适合复杂任务' },
];

export const ProviderConfigCard = ({
  title,
  description,
  apiKey,
  model,
  children,
}: ProviderConfigCardProps) => {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description ? <p className="text-xs text-text-muted">{description}</p> : null}
        </div>
      </div>

      {apiKey && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Key className="h-4 w-4" />
            API 密钥
          </label>
          <div className="relative">
            <input
              type={apiKey.isVisible ? 'text' : 'password'}
              value={apiKey.value}
              onChange={(e) => apiKey.onChange(e.target.value)}
              placeholder={apiKey.placeholder}
              className="w-full rounded-xl border border-border-subtle bg-elevated px-4 py-3 pr-12 text-text-primary transition-all outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={apiKey.onToggleVisibility}
              className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-text-muted transition-colors hover:text-text-primary"
            >
              {apiKey.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {apiKey.helperText && (
            <p className="text-xs text-text-muted">
              {apiKey.helperText}{' '}
              {apiKey.helperLink ? (
                <a
                  href={apiKey.helperLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {apiKey.helperLinkLabel ?? '了解更多'}
                </a>
              ) : null}
            </p>
          )}
        </div>
      )}

      {model && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary">
            {model.label ?? '模型'}
          </label>
          <input
            type="text"
            value={model.value}
            onChange={(e) => model.onChange(e.target.value)}
            placeholder={model.placeholder}
            className="w-full rounded-xl border border-border-subtle bg-elevated px-4 py-3 font-mono text-sm text-text-primary transition-all outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {model.showVariantSelector && model.variants && model.variants.length > 0 && (
            <div className="mt-2 space-y-2">
              <label className="text-xs font-medium text-text-muted">模型变体</label>
              <div className="grid grid-cols-4 gap-2">
                {VARIANT_OPTIONS.filter(v => model.variants!.includes(v.value)).map((variant) => (
                  <button
                    key={variant.value}
                    onClick={() => model.onVariantChange?.(variant.value)}
                    className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                      model.selectedVariant === variant.value
                        ? 'border-accent bg-accent/20 text-accent'
                        : 'border-border-subtle bg-elevated text-text-secondary hover:border-accent/50'
                    }`}
                    title={variant.description}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                {VARIANT_OPTIONS.find(v => v.value === model.selectedVariant)?.description}
              </p>
            </div>
          )}
          {model.helperText ? <p className="text-xs text-text-muted">{model.helperText}</p> : null}
        </div>
      )}

      {children}
    </div>
  );
};
