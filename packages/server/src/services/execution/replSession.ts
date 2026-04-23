import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const RESPONSE_IDLE_MS = 80;
const MAX_OUTPUT_PER_EVAL = 1_048_576;
const EVAL_TIMEOUT_MS = 15_000;

type ReplOutput = { stdout: string; stderr: string };

export class ReplSession {
  private process: ChildProcessWithoutNullStreams | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: {
    resolve: (output: ReplOutput) => void;
    stdout: string;
    stderr: string;
    outputSize: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
    evalTimer: ReturnType<typeof setTimeout> | null;
  } | null = null;
  private onExpire: (() => void) | null = null;

  constructor(
    public readonly language: string,
    onExpire?: () => void,
  ) {
    this.onExpire = onExpire ?? null;
    this.startProcess();
    this.resetTimer();
  }

  async evaluate(line: string): Promise<ReplOutput> {
    this.resetTimer();

    if (!this.process || this.process.killed || !this.process.stdin.writable) {
      return { stdout: '', stderr: 'REPL process is not available' };
    }

    if (this.pending) {
      return { stdout: '', stderr: 'Previous evaluation is still running' };
    }

    return new Promise((resolve) => {
      const evalTimer = setTimeout(() => {
        if (!this.pending) return;
        const partial: ReplOutput = {
          stdout: this.pending.stdout,
          stderr: this.pending.stderr + '\n[Evaluation timed out]',
        };
        this.resolvePending(partial);
        this.reset();
      }, EVAL_TIMEOUT_MS);

      this.pending = { resolve, stdout: '', stderr: '', outputSize: 0, idleTimer: null, evalTimer };
      this.process?.stdin.write(`${line}\n`);
    });
  }

  reset(): void {
    this.stopProcess();
    this.startProcess();
    this.resetTimer();
  }

  dispose(): void {
    this.stopProcess();
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private startProcess(): void {
    const spec = getReplSpec(this.language);
    const child = spawn(spec.command, spec.args, {
      env: { ...process.env, ...spec.env },
      windowsHide: true,
    });
    this.process = child;

    child.stdout.on('data', (data: Buffer) => this.recordOutput('stdout', data));
    child.stderr.on('data', (data: Buffer) => this.recordOutput('stderr', data));
    child.on('error', (err) => {
      this.resolvePending({ stdout: '', stderr: `Failed to start REPL: ${err.message}` });
    });
    child.on('close', () => {
      this.resolvePending({ stdout: '', stderr: 'REPL process exited' });
    });
  }

  private stopProcess(): void {
    this.resolvePending({ stdout: '', stderr: '' });
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
    }
    this.process = null;
  }

  private recordOutput(stream: 'stdout' | 'stderr', data: Buffer): void {
    if (!this.pending) return;

    if (this.pending.outputSize >= MAX_OUTPUT_PER_EVAL) return;

    let text = stripPrompts(this.language, data.toString('utf8'));
    if (!text) return;

    const remaining = MAX_OUTPUT_PER_EVAL - this.pending.outputSize;
    if (text.length > remaining) {
      text = text.slice(0, remaining) + '\n[Output truncated]';
    }
    this.pending.outputSize += text.length;

    if (stream === 'stdout') this.pending.stdout += text;
    else this.pending.stderr += text;

    if (this.pending.idleTimer) clearTimeout(this.pending.idleTimer);
    this.pending.idleTimer = setTimeout(() => {
      if (!this.pending) return;
      this.resolvePending({
        stdout: this.pending.stdout,
        stderr: this.pending.stderr,
      });
    }, RESPONSE_IDLE_MS);
  }

  private resolvePending(output: ReplOutput): void {
    if (!this.pending) return;
    if (this.pending.idleTimer) clearTimeout(this.pending.idleTimer);
    if (this.pending.evalTimer) clearTimeout(this.pending.evalTimer);
    const { resolve } = this.pending;
    this.pending = null;
    resolve(output);
  }

  private resetTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      this.onExpire?.();
    }, INACTIVITY_TIMEOUT);
  }
}

function getReplSpec(language: string): {
  command: string;
  args: string[];
  env?: Record<string, string>;
} {
  if (language === 'python') {
    return {
      command: process.platform === 'win32' ? 'python' : 'python3',
      args: ['-i', '-q'],
      env: { PYTHONUNBUFFERED: '1' },
    };
  }

  if (language === 'javascript') {
    return { command: 'node', args: ['-i'] };
  }

  throw new Error(`Unsupported REPL language: ${language}`);
}

function stripPrompts(language: string, text: string): string {
  if (language === 'python') {
    return text.replace(/^(>>> |\.\.\. )/gm, '');
  }

  if (language === 'javascript') {
    return text.replace(/^> /gm, '');
  }

  return text;
}
