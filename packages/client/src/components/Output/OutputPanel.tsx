import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useExecutionStore } from '../../store/executionStore';
import { useFileStore } from '../../store/fileStore';
import { runCode } from '../../services/executionService';
import { SUPPORTED_LANGUAGES } from '@code-editor/shared';
import styles from './OutputPanel.module.css';

function StatusIndicator({ status }: { status: string }) {
  if (status === 'running') return <span className={styles.statusRunning} />;
  if (status === 'success') return <span className={styles.statusSuccess} />;
  if (status === 'error') return <span className={styles.statusError} />;
  if (status === 'timeout') return <span className={styles.statusTimeout} />;
  return null;
}

export function OutputPanel() {
  const status = useExecutionStore((s) => s.status);
  const result = useExecutionStore((s) => s.currentResult);
  const clearOutput = useExecutionStore((s) => s.clearOutput);
  const files = useFileStore((s) => s.files);
  const activeFileId = useFileStore((s) => s.activeFileId);
  const [stdinValue, setStdinValue] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleRun = useCallback(() => {
    if (useExecutionStore.getState().status === 'running') return;
    if (!activeFileId) return;
    const file = files[activeFileId];
    if (!file) return;

    const lang = SUPPORTED_LANGUAGES.find(
      (l) => l.monacoId === file.language || l.id === file.language,
    );
    if (!lang || lang.pistonId === '') return;

    runCode(lang.id, file.content, stdinValue);
  }, [activeFileId, files, stdinValue]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    const text = [result.stdout, result.stderr].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
  }, [result]);

  const isRunnable = (() => {
    if (!activeFileId) return false;
    const file = files[activeFileId];
    if (!file) return false;
    const lang = SUPPORTED_LANGUAGES.find(
      (l) => l.monacoId === file.language || l.id === file.language,
    );
    return !!lang && lang.pistonId !== '';
  })();

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.title}>Output</span>
          <StatusIndicator status={status} />
          {status === 'running' && <span>Running...</span>}
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={styles.btn}
            onClick={() => setShowStdin((v) => !v)}
            title="Toggle stdin input"
          >
            stdin
          </button>
          <button
            className={styles.btn}
            onClick={handleCopy}
            disabled={!result}
            title="Copy output"
          >
            Copy
          </button>
          <button
            className={styles.btn}
            onClick={clearOutput}
            disabled={!result && status === 'idle'}
            title="Clear output"
          >
            Clear
          </button>
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={status === 'running' || !isRunnable}
            title="Run code (Ctrl+Enter)"
          >
            Run
          </button>
        </div>
      </div>

      {showStdin && (
        <div className={styles.stdinSection}>
          <label htmlFor="stdin-input">stdin:</label>
          <textarea
            id="stdin-input"
            className={styles.stdinInput}
            value={stdinValue}
            onChange={(e) => setStdinValue(e.target.value)}
            placeholder="Enter input for your program..."
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRun();
              }
            }}
          />
        </div>
      )}

      <div className={styles.outputBody} ref={outputRef}>
        {!result && status !== 'running' ? (
          <div className={styles.emptyOutput}>
            Press <strong>Ctrl+Enter</strong> or click <strong>Run</strong> to execute code
          </div>
        ) : (
          <>
            {result?.stdout && <AnsiOutput text={result.stdout} className={styles.stdout} />}
            {result?.stderr && <AnsiOutput text={result.stderr} className={styles.stderr} />}
            {result && (
              <div className={styles.meta}>
                <span>Exit code: {result.exitCode}</span>
                <span>Time: {result.executionTime}ms</span>
                {result.signal && <span>Signal: {result.signal}</span>}
                {result.timedOut && <span>Timed out</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AnsiOutput({ text, className }: { text: string; className: string }) {
  return <div className={className}>{renderAnsi(text)}</div>;
}

function renderAnsi(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = new RegExp(`${String.fromCharCode(27)}\\[([0-9;]*)m`, 'g');
  let lastIndex = 0;
  let colorClass = '';
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(wrapAnsiText(text.slice(lastIndex, match.index), colorClass, parts.length));
    }
    colorClass = nextAnsiColorClass(match[1], colorClass);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(wrapAnsiText(text.slice(lastIndex), colorClass, parts.length));
  }

  return parts;
}

function wrapAnsiText(text: string, colorClass: string, key: number): ReactNode {
  if (!colorClass) return <span key={key}>{text}</span>;
  return (
    <span key={key} className={colorClass}>
      {text}
    </span>
  );
}

function nextAnsiColorClass(codes: string, current: string): string {
  const values = codes
    .split(';')
    .filter(Boolean)
    .map((code) => Number(code));
  if (values.length === 0 || values.includes(0) || values.includes(39)) return '';

  const colorMap: Record<number, string> = {
    30: styles.ansiBlack,
    31: styles.ansiRed,
    32: styles.ansiGreen,
    33: styles.ansiYellow,
    34: styles.ansiBlue,
    35: styles.ansiMagenta,
    36: styles.ansiCyan,
    37: styles.ansiWhite,
    90: styles.ansiBrightBlack ?? styles.ansiBlack,
    91: styles.ansiBrightRed ?? styles.ansiRed,
    92: styles.ansiBrightGreen ?? styles.ansiGreen,
    93: styles.ansiBrightYellow ?? styles.ansiYellow,
    94: styles.ansiBrightBlue ?? styles.ansiBlue,
    95: styles.ansiBrightMagenta ?? styles.ansiMagenta,
    96: styles.ansiBrightCyan ?? styles.ansiCyan,
    97: styles.ansiBrightWhite ?? styles.ansiWhite,
  };

  const lastColor = [...values].reverse().find((v) => (v >= 30 && v <= 37) || (v >= 90 && v <= 97));
  if (!lastColor) return current;

  return colorMap[lastColor] ?? current;
}
