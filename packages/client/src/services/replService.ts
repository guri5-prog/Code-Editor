import type { ReplClientMessage, ReplServerMessage } from '@code-editor/shared';
import { getWebSocketUrl } from '../config/runtime';

export interface ReplCallbacks {
  onReady: (language: string) => void;
  onResult: (stdout: string, stderr: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export class ReplConnection {
  private ws: WebSocket | null = null;
  private callbacks: ReplCallbacks;

  constructor(language: string, callbacks: ReplCallbacks) {
    this.callbacks = callbacks;
    const url = `${getWebSocketUrl('/ws/repl')}?language=${encodeURIComponent(language)}`;

    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      let msg: ReplServerMessage;
      try {
        msg = JSON.parse(event.data) as ReplServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'ready':
          this.callbacks.onReady(msg.language);
          break;
        case 'result':
          this.callbacks.onResult(msg.stdout, msg.stderr);
          break;
        case 'error':
          this.callbacks.onError(msg.message);
          break;
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onClose();
    };

    this.ws.onerror = () => {
      this.callbacks.onError('WebSocket connection failed');
    };
  }

  eval(code: string): void {
    this.send({ type: 'eval', code });
  }

  reset(): void {
    this.send({ type: 'reset' });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(msg: ReplClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
