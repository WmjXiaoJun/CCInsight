import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Code,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  X,
  Target,
  FileCode,
  Sparkles,
  MousePointerClick,
  Loader2,
  BookOpen,
} from '@/lib/lucide-icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppState } from '../hooks/useAppState';
import { type GraphNode, getSyntaxLanguageFromFilename } from 'ccinsight-shared';
import { NODE_COLORS } from '../lib/constants';
import { readFile, type ReadFileResult } from '../services/backend-client';
import { AnnotatedCodeViewer } from './AnnotationOverlay';

// Code theme for SyntaxHighlighter (bottom AI citations)
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

export interface CodeReferencesPanelProps {
  onFocusNode: (nodeId: string) => void;
}

export const CodeReferencesPanel = ({ onFocusNode }: CodeReferencesPanelProps) => {
  const {
    graph,
    selectedNode,
    codeReferences,
    removeCodeReference,
    clearCodeReferences,
    setSelectedNode,
    codeReferenceFocus,
  } = useAppState();

  const nodeById = useMemo(() => {
    if (!graph) return new Map<string, GraphNode>();
    return new Map(graph.nodes.map((n) => [n.id, n]));
  }, [graph]);

  const selectedFilePath = selectedNode?.properties?.filePath;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [glowRefId, setGlowRefId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const refCardEls = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const glowTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (glowTimerRef.current) {
        window.clearTimeout(glowTimerRef.current);
        glowTimerRef.current = null;
      }
    };
  }, []);

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = window.localStorage.getItem('ccinsight.codePanelWidth');
      const parsed = saved ? parseInt(saved, 10) : NaN;
      if (!Number.isFinite(parsed)) return 560; // increased default
      return Math.max(420, Math.min(parsed, 900));
    } catch {
      return 560;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('ccinsight.codePanelWidth', String(panelWidth));
    } catch {
      // ignore
    }
  }, [panelWidth]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        const state = resizeRef.current;
        if (!state) return;
        const delta = ev.clientX - state.startX;
        const next = Math.max(420, Math.min(state.startWidth + delta, 900));
        setPanelWidth(next);
      };

      const onUp = () => {
        resizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [panelWidth],
  );

  const aiReferences = useMemo(
    () => codeReferences.filter((r) => r.source === 'ai'),
    [codeReferences],
  );

  // When the user clicks a citation badge in chat, focus the corresponding snippet card:
  // - expand the panel if collapsed
  // - smooth-scroll the card into view
  // - briefly glow it for discoverability
  useEffect(() => {
    if (!codeReferenceFocus) return;

    // Ensure panel is expanded
    setIsCollapsed(false);

    const { filePath, startLine, endLine } = codeReferenceFocus;
    const target =
      aiReferences.find(
        (r) => r.filePath === filePath && r.startLine === startLine && r.endLine === endLine,
      ) ?? aiReferences.find((r) => r.filePath === filePath);

    if (!target) return;

    // Double rAF: wait for collapse state + list DOM to render.
    const rafIds: number[] = [];
    const outerRafId = requestAnimationFrame(() => {
      const innerRafId = requestAnimationFrame(() => {
        const el = refCardEls.current.get(target.id);
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setGlowRefId(target.id);

        if (glowTimerRef.current) {
          window.clearTimeout(glowTimerRef.current);
        }
        glowTimerRef.current = window.setTimeout(() => {
          setGlowRefId((prev) => (prev === target.id ? null : prev));
          glowTimerRef.current = null;
        }, 1200);
      });
      rafIds.push(innerRafId);
    });
    rafIds.push(outerRafId);

    return () => {
      rafIds.forEach((id) => cancelAnimationFrame(id));
    };
  }, [codeReferenceFocus?.ts, aiReferences]);

  // Content cache for AI citation cards: ref.id → fetched snippet
  const [citationContent, setCitationContent] = useState<
    Record<string, { content: string | null; start: number; end: number; error?: string }>
  >({});
  const citationAbortRef = useRef<Map<string, AbortController>>(new Map());

  const refsWithSnippets = useMemo(() => {
    return aiReferences.map((ref) => ({
      ref,
      ...(citationContent[ref.id] ?? { content: null, start: 0, end: 0 }),
    }));
  }, [aiReferences, citationContent]);

  // Fetch code snippets for AI citation cards in the background
  useEffect(() => {
    if (aiReferences.length === 0) return;

    // Cancel stale requests for refs that are no longer present
    for (const [id, ctrl] of citationAbortRef.current) {
      if (!aiReferences.find((r) => r.id === id)) {
        ctrl.abort();
        citationAbortRef.current.delete(id);
      }
    }

    for (const ref of aiReferences) {
      if (citationContent[ref.id] !== undefined) continue; // already loaded

      const ctrl = new AbortController();
      citationAbortRef.current.set(ref.id, ctrl);

      const hasRange = typeof ref.startLine === 'number';
      const options = hasRange
        ? {
            startLine: Math.max(0, (ref.startLine ?? 0) - CONTEXT_LINES),
            endLine: ((ref.endLine ?? ref.startLine) ?? 0) + CONTEXT_LINES,
          }
        : undefined;

      readFile(ref.filePath, options)
        .then((result) => {
          setCitationContent((prev) => ({
            ...prev,
            [ref.id]: {
              content: result.content,
              start: result.startLine ?? 0,
              end: (result.endLine ?? result.startLine) ?? 0,
            },
          }));
        })
        .catch((err) => {
          setCitationContent((prev) => ({
            ...prev,
            [ref.id]: {
              content: null,
              start: 0,
              end: 0,
              error: err instanceof Error ? err.message : '加载失败',
            },
          }));
        })
        .finally(() => {
          citationAbortRef.current.delete(ref.id);
        });
    }
  }, [aiReferences, citationContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedIsFile = selectedNode?.label === 'File' && !!selectedFilePath;
  const showSelectedViewer = !!selectedNode && !!selectedFilePath;
  const showCitations = aiReferences.length > 0;

  // Fetch file content from the server when a node with a filePath is selected.
  // For non-File nodes (functions, classes, etc.), fetch a buffer around the symbol
  // instead of the entire file. For File nodes, fetch the whole file.
  const CONTEXT_LINES = 50; // lines of context above and below the symbol

  const [fileResult, setFileResult] = useState<ReadFileResult | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const selectedViewerRef = useRef<HTMLDivElement>(null);

  const selectedFileContent = fileResult?.content;
  const fileStartLine = fileResult?.startLine ?? 0;

  useEffect(() => {
    if (!selectedFilePath) {
      setFileResult(null);
      setFileError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingFile(true);
    setFileResult(null);
    setFileError(null);

    // Determine read range: full file for File nodes, buffered for symbols
    const startLine = selectedNode?.properties?.startLine as number | undefined;
    const endLine = selectedNode?.properties?.endLine as number | undefined;
    const isWholeFile = selectedIsFile || startLine === undefined;

    const options = isWholeFile
      ? undefined
      : {
          startLine: Math.max(0, startLine - CONTEXT_LINES),
          endLine: (endLine ?? startLine) + CONTEXT_LINES,
        };

    readFile(selectedFilePath, options)
      .then((result) => {
        if (!cancelled) {
          setFileResult(result);
          setIsLoadingFile(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFileResult(null);
          setIsLoadingFile(false);
          setFileError(err instanceof Error ? err.message : '加载失败');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedFilePath,
    selectedNode?.properties?.startLine,
    selectedNode?.properties?.endLine,
    selectedIsFile,
  ]);

  // Scroll to the selected node's startLine after content loads
  useEffect(() => {
    if (!selectedFileContent || !selectedNode?.properties?.startLine) return;
    const startLine = selectedNode.properties.startLine as number;

    // Double rAF: wait for SyntaxHighlighter to fully render before scrolling
    let cancelled = false;
    const outerRaf = requestAnimationFrame(() => {
      const innerRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        const container = selectedViewerRef.current;
        if (!container) return;
        const lineEl =
          (container.querySelector(`[data-line-number="${startLine + 1}"]`) as HTMLElement) ??
          (container.querySelectorAll('.linenumber')[startLine] as HTMLElement);
        if (lineEl) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback: estimate scroll position based on line height
          const lineHeight = 20.8; // 13px font * 1.6 line-height
          container.scrollTop = Math.max(0, startLine * lineHeight - container.clientHeight / 3);
        }
      });
      rafIds.push(innerRaf);
    });
    const rafIds = [outerRaf];
    return () => {
      cancelled = true;
      rafIds.forEach((id) => cancelAnimationFrame(id));
    };
  }, [selectedFileContent, selectedNode?.properties?.startLine]);

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-12 flex-shrink-0 flex-col items-center gap-2 border-r border-border-subtle bg-surface py-3">
        <button
          onClick={() => setIsCollapsed(false)}
          className="rounded p-2 text-text-secondary transition-colors hover:bg-cyan-500/10 hover:text-cyan-400"
          title="展开代码面板"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <div className="my-1 h-px w-6 bg-border-subtle" />
        {showSelectedViewer && (
          <div className="rotate-90 text-[9px] font-medium tracking-wide whitespace-nowrap text-amber-400">
            已选中
          </div>
        )}
        {showCitations && (
          <div className="mt-4 rotate-90 text-[9px] font-medium tracking-wide whitespace-nowrap text-cyan-400">
            AI · {aiReferences.length}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      ref={(el) => {
        panelRef.current = el;
      }}
      className="relative flex h-full animate-slide-in flex-col border-r border-border-subtle bg-surface/95 shadow-2xl backdrop-blur-md"
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize bg-transparent transition-colors hover:bg-cyan-500/25"
        title="拖动调整宽度"
      />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-gradient-to-r from-elevated/60 to-surface/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-text-primary">代码检查器</span>
        </div>
        <div className="flex items-center gap-1.5">
          {showCitations && (
            <button
              onClick={() => clearCodeReferences()}
              className="rounded p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
              title="清除 AI 引用"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded p-1.5 text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
              title="折叠面板"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Top: Selected file viewer (when a node is selected) */}
        {showSelectedViewer && (
          <div className={`${showCitations ? 'h-[42%]' : 'flex-1'} flex min-h-0 flex-col`}>
            <div className="flex items-center gap-2 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/8 to-orange-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/15 px-2 py-0.5">
                <MousePointerClick className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-semibold tracking-wide text-amber-300 uppercase">
                  已选中
                </span>
              </div>
              <FileCode className="ml-1 h-3.5 w-3.5 text-amber-400/70" />
              <span className="flex-1 truncate font-mono text-xs text-text-primary">
                {selectedNode?.properties?.filePath?.split('/').pop() ??
                  selectedNode?.properties?.name}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="rounded p-1 text-text-muted transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                title="清除选中"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div ref={selectedViewerRef} className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              {isLoadingFile ? (
                <div className="flex items-center justify-center gap-2 py-8 text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">正在加载源代码...</span>
                </div>
              ) : selectedFileContent ? (
                <AnnotatedCodeViewer
                  content={selectedFileContent}
                  filePath={selectedFilePath ?? ''}
                  startLine={fileStartLine}
                  highlightStart={selectedNode?.properties?.startLine as number | undefined}
                  highlightEnd={selectedNode?.properties?.endLine as number | undefined}
                />
              ) : fileError ? (
                <div className="flex flex-col gap-2 px-3 py-3">
                  <div className="flex items-start gap-2 text-sm text-red-400">
                    <span>无法加载文件：</span>
                    <div>
                      <div className="font-mono text-xs opacity-70">{selectedFilePath}</div>
                      <div className="mt-1 text-xs text-text-muted">{fileError}</div>
                    </div>
                  </div>
                  {fileError.includes('fetch') || fileError.includes('Failed') || fileError.includes('网络') || fileError.includes('connect') ? (
                    <div className="text-xs text-text-muted">
                      后端服务可能未启动，请先运行{' '}
                      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-cyan-400">pnpm run dev:backend</code>
                      {' '}后再试
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted">
                      请确认仓库已通过「分析新仓库」功能完成索引
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-3 py-3 text-sm text-text-muted">
                  {selectedIsFile ? (
                    <>
                      内存中无法加载文件{' '}
                      <span className="font-mono">{selectedFilePath}</span>
                    </>
                  ) : (
                    <>请选择一个文件节点以预览其内容。</>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Divider between Selected viewer and AI refs (more visible) */}
        {showSelectedViewer && showCitations && (
          <div className="h-1.5 bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
        )}

        {/* Bottom: AI citations list */}
        {showCitations && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* AI Citations Section Header */}
            <div className="flex items-center gap-2 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/8 to-teal-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 rounded-md border border-cyan-500/25 bg-cyan-500/15 px-2 py-0.5">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-semibold tracking-wide text-cyan-300 uppercase">
                  AI 引用
                </span>
              </div>
              <span className="ml-1 text-xs text-text-muted">
                {aiReferences.length} 个引用{aiReferences.length !== 1 ? '' : ''}
              </span>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {refsWithSnippets.map(
                ({ ref, content, start, error }) => {
                  const nodeColor = ref.label
                    ? (NODE_COLORS as any)[ref.label] || '#6b7280'
                    : '#6b7280';
                  const hasRange = typeof ref.startLine === 'number';
                  const startDisplay = hasRange ? (ref.startLine ?? 0) + 1 : undefined;
                  const endDisplay = hasRange ? (ref.endLine ?? ref.startLine ?? 0) + 1 : undefined;
                  const language = getSyntaxLanguageFromFilename(ref.filePath);
                  const highlightStart = hasRange ? (ref.startLine ?? 0) : 0;
                  const highlightEnd = hasRange ? (ref.endLine ?? ref.startLine ?? 0) : 0;

                  const isGlowing = glowRefId === ref.id;

                  return (
                    <div
                      key={ref.id}
                      ref={(el) => {
                        refCardEls.current.set(ref.id, el);
                      }}
                      className={[
                        'overflow-hidden rounded-xl border border-border-subtle bg-elevated transition-all',
                        isGlowing
                          ? 'animate-pulse shadow-[0_0_0_6px_rgba(34,211,238,0.14)] ring-2 ring-cyan-300/70'
                          : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-2 border-b border-border-subtle bg-surface/40 px-3 py-2">
                        <span
                          className="mt-0.5 flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                          style={{ backgroundColor: nodeColor, color: '#06060a' }}
                          title={ref.label ?? 'Code'}
                        >
                          {ref.label ?? 'Code'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-text-primary">
                            {ref.name ?? ref.filePath.split('/').pop() ?? ref.filePath}
                          </div>
                          <div className="truncate font-mono text-[11px] text-text-muted">
                            {ref.filePath}
                            {startDisplay !== undefined && (
                              <span className="text-text-secondary">
                                {' '}
                                • L{startDisplay}
                                {endDisplay !== startDisplay ? `–${endDisplay}` : ''}
                              </span>
                            )}
                            {typeof content === 'string' && (
                              <span className="text-text-muted"> • {content.split('\n').length} 行</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {ref.nodeId && (
                            <button
                              onClick={() => {
                                const nodeId = ref.nodeId!;
                                // Sync selection + focus graph
                                if (graph) {
                                  const node = nodeById.get(nodeId);
                                  if (node) setSelectedNode(node);
                                }
                                onFocusNode(nodeId);
                              }}
                              className="rounded p-1.5 text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
                              title="在图谱中聚焦"
                            >
                              <Target className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => removeCodeReference(ref.id)}
                            className="rounded p-1.5 text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
                              title="移除"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        {content ? (
                          <SyntaxHighlighter
                            language={language}
                            style={customTheme as any}
                            showLineNumbers
                            startingLineNumber={start + 1}
                            lineNumberStyle={{
                              minWidth: '3em',
                              paddingRight: '1em',
                              color: '#5a5a70',
                              textAlign: 'right',
                              userSelect: 'none',
                            }}
                            lineProps={(lineNumber) => {
                              const isHighlighted =
                                hasRange &&
                                lineNumber >= start + highlightStart + 1 &&
                                lineNumber <= start + highlightEnd + 1;
                              return {
                                style: {
                                  display: 'block',
                                  backgroundColor: isHighlighted
                                    ? 'rgba(6, 182, 212, 0.14)'
                                    : 'transparent',
                                  borderLeft: isHighlighted
                                    ? '3px solid #06b6d4'
                                    : '3px solid transparent',
                                  paddingLeft: '12px',
                                  paddingRight: '16px',
                                },
                              };
                            }}
                            wrapLines
                          >
                            {content}
                          </SyntaxHighlighter>
                        ) : error ? (
                          <div className="px-3 py-2 text-xs text-red-400">
                            <div>加载失败：{ref.filePath}</div>
                            <div className="mt-0.5 text-text-muted">{error}</div>
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-xs text-text-muted">
                            正在加载 {ref.filePath}...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
