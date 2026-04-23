import { useEffect, useMemo, useState } from 'react';
import DiffMatchPatch from 'diff-match-patch';
import {
  fetchFileVersionContent,
  fetchFileVersions,
  type FileVersionEntry,
} from '../../services/projectService';

interface VersionHistoryProps {
  fileId: string | null;
  currentContent: string;
  onRestore: (content: string) => Promise<void>;
}

type CompareTarget = 'current' | number;

interface DiffLine {
  kind: 'add' | 'remove' | 'same';
  text: string;
}

const dmp = new DiffMatchPatch();

function targetLabel(value: CompareTarget): string {
  if (value === 'current') return 'Current Working Copy';
  return `Version ${value}`;
}

function buildDiffLines(base: string, compare: string): DiffLine[] {
  const diffs = dmp.diff_main(base, compare);
  dmp.diff_cleanupSemantic(diffs);
  const lines: DiffLine[] = [];
  for (const [op, text] of diffs) {
    const chunks = text.split('\n');
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (i === chunks.length - 1 && chunk === '') continue;
      if (op === 1) lines.push({ kind: 'add', text: chunk });
      else if (op === -1) lines.push({ kind: 'remove', text: chunk });
      else lines.push({ kind: 'same', text: chunk });
    }
  }
  return lines;
}

export function VersionHistory({ fileId, currentContent, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersionEntry[]>([]);
  const [selectedRestoreVersion, setSelectedRestoreVersion] = useState<number | null>(null);
  const [baseTarget, setBaseTarget] = useState<CompareTarget>('current');
  const [compareTarget, setCompareTarget] = useState<CompareTarget>('current');
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setVersions([]);
      setSelectedRestoreVersion(null);
      setBaseTarget('current');
      setCompareTarget('current');
      setContentCache({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    fetchFileVersions(fileId)
      .then((items) => {
        if (cancelled) return;
        setVersions(items);
        const newest = items[0]?.version ?? null;
        setSelectedRestoreVersion(newest);
        setBaseTarget('current');
        setCompareTarget(newest ?? 'current');
        setContentCache({ current: currentContent });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load versions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, currentContent]);

  useEffect(() => {
    setContentCache((prev) => ({ ...prev, current: currentContent }));
  }, [currentContent]);

  useEffect(() => {
    if (!fileId) return;
    const needed = [selectedRestoreVersion, baseTarget, compareTarget]
      .filter((value): value is number => typeof value === 'number')
      .filter((value) => !(String(value) in contentCache));

    if (needed.length === 0) return;

    let cancelled = false;
    Promise.all(
      needed.map(async (version) => ({
        version,
        content: await fetchFileVersionContent(fileId, version),
      })),
    )
      .then((resolved) => {
        if (cancelled) return;
        setContentCache((prev) => {
          const next = { ...prev };
          for (const { version, content } of resolved) next[String(version)] = content;
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load version content');
      });

    return () => {
      cancelled = true;
    };
  }, [baseTarget, compareTarget, contentCache, fileId, selectedRestoreVersion]);

  const restoreContent =
    selectedRestoreVersion !== null ? (contentCache[String(selectedRestoreVersion)] ?? '') : '';
  const baseContent =
    baseTarget === 'current' ? currentContent : (contentCache[String(baseTarget)] ?? '');
  const compareContent =
    compareTarget === 'current' ? currentContent : (contentCache[String(compareTarget)] ?? '');

  const diffLines = useMemo(
    () => buildDiffLines(baseContent, compareContent),
    [baseContent, compareContent],
  );
  const diffStats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.kind === 'add') added++;
      if (line.kind === 'remove') removed++;
    }
    return { added, removed };
  }, [diffLines]);

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <h3 style={titleStyle}>Version History</h3>
      </header>
      {!fileId && <p style={mutedStyle}>Open a file to browse versions.</p>}
      {fileId && (
        <>
          {loading && <p style={mutedStyle}>Loading versions...</p>}
          {error && <p style={errorStyle}>{error}</p>}
          {!loading && versions.length === 0 && <p style={mutedStyle}>No saved versions yet.</p>}
          {!loading && versions.length > 0 && (
            <>
              <div style={controlsWrapStyle}>
                <label style={labelStyle}>
                  Restore target
                  <select
                    value={selectedRestoreVersion ?? ''}
                    onChange={(e) => setSelectedRestoreVersion(Number(e.target.value))}
                    style={selectStyle}
                  >
                    {versions.map((entry) => (
                      <option key={entry.version} value={entry.version}>
                        v{entry.version} - {new Date(entry.timestamp).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  Diff base
                  <select
                    value={baseTarget}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBaseTarget(value === 'current' ? 'current' : Number(value));
                    }}
                    style={selectStyle}
                  >
                    <option value="current">{targetLabel('current')}</option>
                    {versions.map((entry) => (
                      <option key={`base-${entry.version}`} value={entry.version}>
                        {targetLabel(entry.version)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  Diff compare
                  <select
                    value={compareTarget}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCompareTarget(value === 'current' ? 'current' : Number(value));
                    }}
                    style={selectStyle}
                  >
                    <option value="current">{targetLabel('current')}</option>
                    {versions.map((entry) => (
                      <option key={`compare-${entry.version}`} value={entry.version}>
                        {targetLabel(entry.version)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={summaryStyle}>
                <span style={mutedInlineStyle}>
                  {targetLabel(baseTarget)} {'->'} {targetLabel(compareTarget)}
                </span>
                <span style={addedStyle}>+{diffStats.added}</span>
                <span style={removedStyle}>-{diffStats.removed}</span>
              </div>

              <div style={diffViewStyle}>
                {diffLines.length === 0 && <span style={mutedInlineStyle}>No differences.</span>}
                {diffLines.map((line, index) => (
                  <div
                    key={`${line.kind}-${index}`}
                    style={{
                      ...diffLineStyle,
                      backgroundColor:
                        line.kind === 'add'
                          ? 'rgba(22, 163, 74, 0.12)'
                          : line.kind === 'remove'
                            ? 'rgba(220, 38, 38, 0.12)'
                            : 'transparent',
                      color:
                        line.kind === 'add'
                          ? 'var(--success)'
                          : line.kind === 'remove'
                            ? 'var(--error)'
                            : 'var(--text-primary)',
                    }}
                  >
                    <span style={gutterStyle}>
                      {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
                    </span>
                    <span style={codeStyle}>{line.text || ' '}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                style={restoreBtnStyle}
                disabled={restoring || selectedRestoreVersion === null}
                onClick={async () => {
                  if (selectedRestoreVersion === null) return;
                  const content = contentCache[String(selectedRestoreVersion)] ?? restoreContent;
                  setRestoring(true);
                  setError('');
                  try {
                    await onRestore(content);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Restore failed');
                  } finally {
                    setRestoring(false);
                  }
                }}
              >
                {restoring ? 'Restoring...' : `Restore v${selectedRestoreVersion}`}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  width: 360,
  minWidth: 360,
  borderLeft: '1px solid var(--border)',
  backgroundColor: 'var(--bg-secondary)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const headerStyle: React.CSSProperties = {
  height: 36,
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 0.4,
  fontWeight: 700,
  color: 'var(--text-secondary)',
};

const controlsWrapStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid var(--border)',
  display: 'grid',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  display: 'grid',
  gap: 4,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  padding: '7px 8px',
  fontSize: 12,
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderBottom: '1px solid var(--border)',
};

const diffViewStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  backgroundColor: 'var(--bg-primary)',
  fontFamily: 'Consolas, monospace',
  fontSize: 11,
};

const diffLineStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '14px 1fr',
  alignItems: 'start',
  lineHeight: 1.45,
};

const gutterStyle: React.CSSProperties = {
  textAlign: 'center',
  opacity: 0.8,
};

const codeStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  padding: '0 6px 0 2px',
};

const restoreBtnStyle: React.CSSProperties = {
  margin: 10,
  border: 'none',
  borderRadius: 6,
  padding: '8px 10px',
  backgroundColor: 'var(--accent)',
  color: 'var(--accent-text)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 12,
  padding: '8px 10px',
};

const mutedInlineStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
};

const errorStyle: React.CSSProperties = {
  color: 'var(--error)',
  fontSize: 12,
  padding: '8px 10px',
};

const addedStyle: React.CSSProperties = {
  color: 'var(--success)',
  fontSize: 11,
};

const removedStyle: React.CSSProperties = {
  color: 'var(--error)',
  fontSize: 11,
};
