import { useEffect, useRef, useCallback } from 'react';
import { DEFAULT_EDITOR_SETTINGS, type ExecutionHistoryEntry } from '@code-editor/shared';
import { useExecutionStore } from '../../store/executionStore';
import { TerminalToolbar } from './TerminalToolbar';
import { TerminalTab } from './TerminalTab';
import type { TerminalInstanceHandle } from './TerminalInstance';
import { ReplMode } from './ReplMode';
import { OutputHistory } from '../Output/OutputHistory';
import { sendExecutionInput } from '../../services/executionService';
import { useSettings } from '../../hooks/useSettings';
import { formatShortcutLabel } from '../../utils/shortcuts';
import styles from './TerminalPanel.module.css';

export function TerminalPanel() {
  const { settings } = useSettings();
  const tabs = useExecutionStore((s) => s.terminalTabs);
  const activeTabId = useExecutionStore((s) => s.activeTerminalTabId);
  const showHistory = useExecutionStore((s) => s.showHistory);
  const stdinVisible = useExecutionStore((s) => s.stdinVisible);
  const stdinValue = useExecutionStore((s) => s.stdinValue);
  const executionStatus = useExecutionStore((s) => s.status);
  const currentResult = useExecutionStore((s) => s.currentResult);
  const latestExecutionTabId = useExecutionStore((s) => s.latestExecutionTabId);

  const setActiveTerminalTab = useExecutionStore((s) => s.setActiveTerminalTab);
  const removeTerminalTab = useExecutionStore((s) => s.removeTerminalTab);
  const setShowHistory = useExecutionStore((s) => s.setShowHistory);
  const setStdinVisible = useExecutionStore((s) => s.setStdinVisible);
  const setStdinValue = useExecutionStore((s) => s.setStdinValue);
  const clearTabOutput = useExecutionStore((s) => s.clearTabOutput);
  const appendTabOutput = useExecutionStore((s) => s.appendTabOutput);
  const setTabOutput = useExecutionStore((s) => s.setTabOutput);
  const addTerminalTab = useExecutionStore((s) => s.addTerminalTab);

  const terminalRefs = useRef<Map<string, TerminalInstanceHandle>>(new Map());
  const writtenResultRef = useRef<string | null>(null);
  const writtenRunningRef = useRef<string | null>(null);
  const tabsRef = useRef(tabs);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const writeTabOutput = useCallback((id: string, output: string) => {
    const handle = terminalRefs.current.get(id);
    if (!handle) return;
    handle.clear();
    if (output) handle.write(output.replace(/\n/g, '\r\n'));
  }, []);

  const setTerminalRef = useCallback(
    (id: string) => (handle: TerminalInstanceHandle | null) => {
      if (handle) {
        terminalRefs.current.set(id, handle);
        const tab = tabsRef.current.find((t) => t.id === id);
        if (tab?.output) {
          writeTabOutput(id, tab.output);
        }
      } else {
        terminalRefs.current.delete(id);
      }
    },
    [writeTabOutput],
  );

  useEffect(() => {
    if (executionStatus !== 'running' || !latestExecutionTabId) return;
    if (writtenRunningRef.current === latestExecutionTabId) return;
    writtenRunningRef.current = latestExecutionTabId;

    let output = '\x1b[2mRunning code...\x1b[0m\n';
    if (stdinValue) {
      output += '\x1b[2mstdin attached from terminal input panel\x1b[0m\n';
    }
    setTabOutput(latestExecutionTabId, output);
  }, [executionStatus, latestExecutionTabId, stdinValue, setTabOutput]);

  useEffect(() => {
    if (executionStatus === 'running') return;
    if (!currentResult || !latestExecutionTabId) return;

    const resultKey = `${latestExecutionTabId}-${JSON.stringify(currentResult).slice(0, 100)}`;
    if (writtenResultRef.current === resultKey) return;
    writtenResultRef.current = resultKey;
    writtenRunningRef.current = null;

    const activeTab = tabs.find((tab) => tab.id === latestExecutionTabId);
    const hasStreamedOutput =
      Boolean(activeTab?.output) &&
      activeTab.output !== '\x1b[2mRunning code...\x1b[0m\n' &&
      !activeTab.output.endsWith('\x1b[2mstdin attached from terminal input panel\x1b[0m\n');

    let terminalOutput = hasStreamedOutput
      ? activeTab?.output ?? ''
      : '';

    if (!hasStreamedOutput && currentResult.stdout) {
      terminalOutput += currentResult.stdout;
    }
    if (!hasStreamedOutput && currentResult.stderr) {
      terminalOutput += `\x1b[31m${currentResult.stderr}\x1b[0m`;
    }

    const statusColor = currentResult.exitCode === 0 ? '32' : '31';
    terminalOutput +=
      `\n\x1b[2m--- Exit: \x1b[${statusColor}m${currentResult.exitCode}\x1b[0;2m | ` +
      `Time: ${currentResult.executionTime}ms` +
      (currentResult.signal ? ` | Signal: ${currentResult.signal}` : '') +
      (currentResult.timedOut ? ' | \x1b[33mTIMED OUT\x1b[0;2m' : '') +
      ` ---\x1b[0m\n`;

    setTabOutput(latestExecutionTabId, terminalOutput);
  }, [currentResult, executionStatus, latestExecutionTabId, setTabOutput, tabs]);

  useEffect(() => {
    if (!activeTabId || showHistory) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.type === 'execution') {
      writeTabOutput(activeTabId, tab.output);
    }
  }, [activeTabId, showHistory, tabs, writeTabOutput]);

  const handleClear = useCallback(() => {
    if (activeTabId) {
      terminalRefs.current.get(activeTabId)?.clear();
      clearTabOutput(activeTabId);
    }
  }, [activeTabId, clearTabOutput]);

  const handleCopy = useCallback(() => {
    const handle = activeTabId ? terminalRefs.current.get(activeTabId) : null;
    if (handle) {
      const content = handle.getContent();
      navigator.clipboard.writeText(content);
    }
  }, [activeTabId]);

  const handleDownload = useCallback(() => {
    const handle = activeTabId ? terminalRefs.current.get(activeTabId) : null;
    if (!handle) return;
    const content = handle.getContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tab = tabs.find((t) => t.id === activeTabId);
    a.download = `${tab?.title ?? 'output'}-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTabId, tabs]);

  const handleSearch = useCallback(
    (query: string) => {
      if (!activeTabId || !query) return;
      terminalRefs.current.get(activeTabId)?.findNext(query);
    },
    [activeTabId],
  );

  const handleSelectTab = useCallback(
    (id: string) => {
      setActiveTerminalTab(id);
    },
    [setActiveTerminalTab],
  );

  const handleCloseTab = useCallback(
    (id: string) => {
      removeTerminalTab(id);
    },
    [removeTerminalTab],
  );

  const handleToggleHistory = useCallback(() => {
    setShowHistory(!showHistory);
  }, [showHistory, setShowHistory]);

  const handleToggleStdin = useCallback(() => {
    setStdinVisible(!stdinVisible);
  }, [stdinVisible, setStdinVisible]);

  const handleSelectHistoryEntry = useCallback(
    (entry: ExecutionHistoryEntry) => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
      const id = addTerminalTab({
        type: 'execution',
        title: `${entry.language} history ${timestamp}`,
        language: entry.language,
        sourceName: `history-${entry.id}`,
      });
      const output =
        (entry.result.stdout || '') +
        (entry.result.stderr ? `\x1b[31m${entry.result.stderr}\x1b[0m` : '') +
        `\n\x1b[2m--- Exit: ${entry.result.exitCode} | Time: ${entry.result.executionTime}ms` +
        (entry.result.timedOut ? ' | TIMED OUT' : '') +
        ` ---\x1b[0m\n`;
      setTabOutput(id, output);
      requestAnimationFrame(() => writeTabOutput(id, output));
    },
    [addTerminalTab, setTabOutput, writeTabOutput],
  );

  const handleExecutionInput = useCallback(
    (tabId: string, data: string) => {
      if (executionStatus !== 'running') return;
      if (!sendExecutionInput(tabId, data === '\r' ? '\n' : data)) return;

      const handle = terminalRefs.current.get(tabId);
      if (!handle) return;
      if (data === '\r') {
        handle.write('\r\n');
        appendTabOutput(tabId, '\n');
      } else if (data === '\x7f' || data === '\b') {
        handle.write('\b \b');
      } else if (data.charCodeAt(0) >= 32 || data === '\t') {
        handle.write(data);
        appendTabOutput(tabId, data);
      }
    },
    [appendTabOutput, executionStatus],
  );

  const isEmpty = tabs.length === 0 && !showHistory;
  const terminalFontSize = settings.editor.fontSize || DEFAULT_EDITOR_SETTINGS.fontSize;
  const runShortcutLabel = formatShortcutLabel(settings.keybindings.run);

  return (
    <div className={styles.panel} data-terminal-panel="true">
      <TerminalToolbar
        tabs={tabs}
        activeTabId={activeTabId}
        showHistory={showHistory}
        stdinVisible={stdinVisible}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onToggleHistory={handleToggleHistory}
        onToggleStdin={handleToggleStdin}
        onClear={handleClear}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onSearch={handleSearch}
      />

      <div className={styles.body}>
        {stdinVisible && (
          <div className={styles.stdinDock}>
            <label className={styles.stdinLabel} htmlFor="terminal-stdin">
              stdin before run
            </label>
            <textarea
              id="terminal-stdin"
              className={styles.stdinInput}
              value={stdinValue}
              onChange={(event) => setStdinValue(event.target.value)}
              placeholder="Input sent when Run starts. While code is running, type directly in the active terminal."
              spellCheck={false}
            />
          </div>
        )}

        {isEmpty && !showHistory && (
          <div className={styles.emptyState}>
            Press <strong>{runShortcutLabel}</strong> or click <strong>Run</strong> to execute code
          </div>
        )}

        {tabs.map((tab) =>
          tab.type === 'repl' ? (
            <ReplMode
              key={tab.id}
              ref={setTerminalRef(tab.id)}
              language={tab.language}
              visible={!showHistory && activeTabId === tab.id}
              fontSize={terminalFontSize}
            />
          ) : (
            <TerminalTab
              key={tab.id}
              ref={setTerminalRef(tab.id)}
              visible={!showHistory && activeTabId === tab.id}
              fontSize={terminalFontSize}
              onData={(data) => handleExecutionInput(tab.id, data)}
            />
          ),
        )}

        <OutputHistory visible={showHistory} onSelectEntry={handleSelectHistoryEntry} />
      </div>
    </div>
  );
}
