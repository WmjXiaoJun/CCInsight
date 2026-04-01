import { useState, useEffect } from 'react';
import { X } from '@/lib/lucide-icons';
import type { JobProgress as AnalyzeJobProgress } from '../services/backend-client';

interface AnalyzeProgressProps {
  progress: AnalyzeJobProgress;
  onCancel: () => void;
  /** Streaming node/edge counts from analysis */
  streamStats?: { nodes: number; edges: number };
}

const PHASE_LABELS: Record<string, string> = {
  queued: '排队中',
  cloning: '正在克隆仓库',
  pulling: '正在拉取更新',
  extracting: '正在扫描文件',
  structure: '正在构建结构',
  parsing: '正在解析代码',
  imports: '正在解析导入',
  calls: '正在追踪调用',
  heritage: '正在提取继承关系',
  communities: '正在检测社区',
  processes: '正在检测执行流程',
  complete: '流水线完成',
  lbug: '正在加载到数据库',
  fts: '正在创建搜索索引',
  embeddings: '正在生成嵌入向量',
  done: '完成',
  retrying: '崩溃后重试中',
};

export const AnalyzeProgress = ({ progress, onCancel, streamStats }: AnalyzeProgressProps) => {
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const label = PHASE_LABELS[progress.phase] || progress.message || progress.phase;
  const pct = Math.max(0, Math.min(100, progress.percent));

  const hasStreamStats = streamStats && (streamStats.nodes > 0 || streamStats.edges > 0);

  return (
    <div className="space-y-4">
      {/* Phase label + elapsed */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className="font-mono text-xs text-text-muted">{formatElapsed(elapsed)}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Streaming graph stats */}
      {hasStreamStats && (
        <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
          <span className="text-xs text-text-secondary">已构建图谱</span>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-accent">{streamStats.nodes.toLocaleString()} 节点</span>
            <span className="text-text-muted">·</span>
            <span className="text-accent">{streamStats.edges.toLocaleString()} 关系</span>
          </div>
        </div>
      )}

      {/* Percent + cancel */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text-muted">{pct}%</span>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-all duration-200 hover:bg-red-500/20"
        >
          <X className="h-3.5 w-3.5" />
          取消
        </button>
      </div>
    </div>
  );
};
