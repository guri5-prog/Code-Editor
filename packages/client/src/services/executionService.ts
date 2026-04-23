import type { ExecutionResult, ExecutionServerMessage } from '@code-editor/shared';
import { useExecutionStore } from '../store/executionStore';
import { getAccessToken } from './auth';
import { getApiUrl, getWebSocketUrl } from '../config/runtime';

type ExecutionEvent =
  | { type: 'started' }
  | { type: 'result'; result: ExecutionResult }
  | { type: 'error'; message: string; statusCode: number };

let activeExecution: {
  tabId: string;
  ws: WebSocket;
} | null = null;

export async function runCode(
  language: string,
  code: string,
  stdin = '',
  fileName = 'output',
): Promise<void> {
  const store = useExecutionStore.getState();
  if (store.status === 'running') return;

  store.clearOutput();
  store.createExecutionTab(fileName, language);
  const tabId = useExecutionStore.getState().latestExecutionTabId;
  store.showOutput();
  store.setStatus('running');

  if (tabId && typeof WebSocket !== 'undefined') {
    const ranViaWebSocket = await runCodeOverWebSocket(tabId, language, code, stdin);
    if (ranViaWebSocket) return;
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(getApiUrl('/api/execute'), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ language, code, stdin }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const message =
        (body as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
      setErrorResult(language, code, message);
      return;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream') && res.body) {
      await consumeEventStream(res.body, (event) => {
        if (event.type === 'result') {
          useExecutionStore.getState().setResult(language, code, event.result);
        } else if (event.type === 'error') {
          setErrorResult(language, code, event.message);
        }
      });
      return;
    }

    const result = (await res.json()) as ExecutionResult;
    useExecutionStore.getState().setResult(language, code, result);
  } catch {
    setErrorResult(language, code, 'Network error - could not reach execution service');
  }
}

export function sendExecutionInput(tabId: string, data: string): boolean {
  if (!activeExecution || activeExecution.tabId !== tabId) return false;
  if (activeExecution.ws.readyState !== WebSocket.OPEN) return false;
  activeExecution.ws.send(JSON.stringify({ type: 'stdin', data }));
  return true;
}

export function stopExecution(tabId: string): void {
  if (!activeExecution || activeExecution.tabId !== tabId) return;
  if (activeExecution.ws.readyState === WebSocket.OPEN) {
    activeExecution.ws.send(JSON.stringify({ type: 'stop' }));
  }
}

function runCodeOverWebSocket(
  tabId: string,
  language: string,
  code: string,
  stdin: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(getWebSocketUrl('/ws/execute'));
    let opened = false;
    let settled = false;

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const startedAt = performance.now();

    const settle = (usedWebSocket: boolean) => {
      if (settled) return;
      settled = true;
      resolve(usedWebSocket);
    };

    const clearActive = () => {
      if (activeExecution?.ws === ws) {
        activeExecution = null;
      }
    };

    ws.onopen = () => {
      opened = true;
      activeExecution = { tabId, ws };
      ws.send(JSON.stringify({ type: 'start', language, code, stdin }));
      settle(true);
    };

    ws.onmessage = (event) => {
      let message: ExecutionServerMessage;
      try {
        message = JSON.parse(event.data) as ExecutionServerMessage;
      } catch {
        return;
      }

      const store = useExecutionStore.getState();
      if (message.type === 'started') {
        return;
      }

      if (message.type === 'output') {
        if (message.stream === 'stdout') stdoutChunks.push(message.data);
        else stderrChunks.push(message.data);
        store.appendTabOutput(
          tabId,
          message.stream === 'stderr' ? `\x1b[31m${message.data}\x1b[0m` : message.data,
        );
        return;
      }

      if (message.type === 'exit') {
        clearActive();
        store.setResult(language, code, message.result);
        return;
      }

      if (message.type === 'error') {
        clearActive();
        setErrorResult(language, code, message.message);
      }
    };

    ws.onerror = () => {
      clearActive();
      if (!opened) settle(false);
    };

    ws.onclose = () => {
      clearActive();
      if (!opened) {
        settle(false);
        return;
      }

      const store = useExecutionStore.getState();
      if (store.status === 'running') {
        store.setResult(language, code, {
          stdout: stdoutChunks.join(''),
          stderr: stderrChunks.join(''),
          exitCode: 1,
          signal: null,
          executionTime: Math.round(performance.now() - startedAt),
          timedOut: false,
        });
      }
    };
  });
}

async function consumeEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ExecutionEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      try {
        onEvent(JSON.parse(dataLine.slice(6)) as ExecutionEvent);
      } catch {
        // Ignore malformed stream chunks
      }
    }
  }
}

function setErrorResult(language: string, code: string, message: string): void {
  useExecutionStore.getState().setResult(language, code, {
    stdout: '',
    stderr: message,
    exitCode: 1,
    signal: null,
    executionTime: 0,
    timedOut: false,
  });
}
