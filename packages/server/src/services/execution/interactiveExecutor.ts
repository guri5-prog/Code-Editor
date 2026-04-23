import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { mkdtemp, rm, writeFile, chmod } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExecutionResult } from '@code-editor/shared';
import { sanitizeExecutionInput } from './sanitizer.js';

interface InteractiveRun {
  writeStdin(data: string): void;
  stop(): void;
  done: Promise<ExecutionResult>;
}

interface RunSpec {
  fileName: string;
  run: string[];
  compile?: string[];
}

interface RunOptions {
  language: string;
  code: string;
  stdin?: string;
  args?: string[];
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
}

const MAX_RUNTIME_MS = 10_000;
const MAX_OUTPUT_SIZE = 1_048_576;
const MAX_STDIN_CHUNK = 65_536;

const ENV_ALLOWLIST = new Set([
  'PATH',
  'HOME',
  'USER',
  'LANG',
  'LC_ALL',
  'TERM',
  'TMPDIR',
  'TEMP',
  'TMP',
  'SHELL',
  'SYSTEMROOT',
  'WINDIR',
  'COMSPEC',
  'PATHEXT',
  'PYTHONUNBUFFERED',
  'NODE_OPTIONS',
]);

function sanitizedEnv(): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (ENV_ALLOWLIST.has(key) && value !== undefined) {
      safe[key] = value;
    }
  }
  return safe;
}

export async function startInteractiveExecution(options: RunOptions): Promise<InteractiveRun> {
  const { language, code, stdin = '', args = [], onStdout, onStderr } = options;
  sanitizeExecutionInput(language, code, stdin);

  const startedAt = Date.now();
  const dir = await mkdtemp(join(tmpdir(), 'code-editor-run-'));
  const spec = getRunSpec(language);
  await writeFile(join(dir, spec.fileName), code, 'utf8');
  if (process.platform !== 'win32') {
    await chmod(dir, 0o700);
  }

  let stopped = false;
  let outputSize = 0;
  let runProcess: ChildProcessWithoutNullStreams | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const writeOutput = (stream: 'stdout' | 'stderr', data: Buffer) => {
    if (outputSize >= MAX_OUTPUT_SIZE) return;
    let text = data.toString('utf8');
    const remaining = MAX_OUTPUT_SIZE - outputSize;
    if (text.length > remaining) {
      text = `${text.slice(0, Math.max(0, remaining))}\n[Output truncated - exceeded 1MB limit]`;
    }
    outputSize += text.length;
    if (stream === 'stdout') onStdout(text);
    else onStderr(text);
  };

  const cleanup = async () => {
    if (timeout) clearTimeout(timeout);
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  };

  const done = new Promise<ExecutionResult>((resolve) => {
    void (async () => {
      let stdout = '';
      let stderr = '';

      const appendStdout = (data: string) => {
        stdout += data;
        onStdout(data);
      };
      const appendStderr = (data: string) => {
        stderr += data;
        onStderr(data);
      };

      const finish = async (exitCode: number, signal: string | null, timedOut = false) => {
        await cleanup();
        resolve({
          stdout,
          stderr,
          exitCode,
          signal,
          executionTime: Date.now() - startedAt,
          timedOut,
        });
      };

      try {
        if (spec.compile) {
          const compileResult = await runCompile(spec.compile, dir);
          if (compileResult.stdout) appendStdout(compileResult.stdout);
          if (compileResult.stderr) appendStderr(compileResult.stderr);
          if (compileResult.exitCode !== 0) {
            await finish(compileResult.exitCode, compileResult.signal);
            return;
          }
        }

        const sanitizedArgs = args.map((a) => a.slice(0, 256));
        const [command, ...commandArgs] = [...spec.run, ...sanitizedArgs];
        const child = spawn(command, commandArgs, {
          cwd: dir,
          windowsHide: true,
          env: sanitizedEnv(),
        });
        runProcess = child;

        timeout = setTimeout(() => {
          stopped = true;
          child.kill('SIGKILL');
        }, MAX_RUNTIME_MS);

        child.stdout.on('data', (data: Buffer) => {
          const before = stdout;
          writeOutput('stdout', data);
          stdout += data.toString('utf8').slice(0, Math.max(0, MAX_OUTPUT_SIZE - before.length));
        });
        child.stderr.on('data', (data: Buffer) => {
          const before = stderr;
          writeOutput('stderr', data);
          stderr += data.toString('utf8').slice(0, Math.max(0, MAX_OUTPUT_SIZE - before.length));
        });
        child.on('error', async (err) => {
          appendStderr(`Failed to start ${command}: ${err.message}`);
          await finish(1, null);
        });
        child.on('close', async (code, signal) => {
          await finish(stopped ? 124 : (code ?? 0), signal, stopped);
        });

        if (stdin) {
          child.stdin.write(stdin);
          if (!stdin.endsWith('\n')) child.stdin.write('\n');
        }
      } catch (err) {
        appendStderr(err instanceof Error ? err.message : 'Execution failed');
        await finish(1, null);
      }
    })();
  });

  return {
    writeStdin(data: string) {
      if (data.length > MAX_STDIN_CHUNK) return;
      runProcess?.stdin.write(data);
    },
    stop() {
      stopped = true;
      runProcess?.kill('SIGTERM');
    },
    done,
  };
}

function getRunSpec(language: string): RunSpec {
  const id =
    language === 'restricted-python'
      ? 'python'
      : language === 'restricted-javascript'
        ? 'javascript'
        : language;

  switch (id) {
    case 'javascript':
      return { fileName: 'main.js', run: ['node', 'main.js'] };
    case 'typescript':
      return { fileName: 'main.ts', run: ['npx', 'tsx', 'main.ts'] };
    case 'python':
      return { fileName: 'main.py', run: ['python', 'main.py'] };
    case 'ruby':
      return { fileName: 'main.rb', run: ['ruby', 'main.rb'] };
    case 'php':
      return { fileName: 'main.php', run: ['php', 'main.php'] };
    case 'go':
      return { fileName: 'main.go', run: ['go', 'run', 'main.go'] };
    case 'rust':
      return {
        fileName: 'main.rs',
        compile: ['rustc', 'main.rs', '-o', executableName('main')],
        run: [executablePath('main')],
      };
    case 'c':
      return {
        fileName: 'main.c',
        compile: ['gcc', 'main.c', '-o', executableName('main')],
        run: [executablePath('main')],
      };
    case 'cpp':
      return {
        fileName: 'main.cpp',
        compile: ['g++', 'main.cpp', '-o', executableName('main')],
        run: [executablePath('main')],
      };
    case 'java':
      return {
        fileName: 'Main.java',
        compile: ['javac', 'Main.java'],
        run: ['java', 'Main'],
      };
    default:
      throw new Error(`Interactive execution is not available for ${language}`);
  }
}

function executableName(base: string): string {
  return process.platform === 'win32' ? `${base}.exe` : base;
}

function executablePath(base: string): string {
  return process.platform === 'win32' ? `.\\${executableName(base)}` : `./${base}`;
}

function runCompile(
  command: string[],
  cwd: string,
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: string | null;
}> {
  return new Promise((resolve) => {
    const [cmd, ...args] = command;
    const child = spawn(cmd, args, { cwd, windowsHide: true, env: sanitizedEnv() });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString('utf8');
    });
    child.on('error', (err) => {
      resolve({
        stdout,
        stderr: `${stderr}${stderr ? '\n' : ''}Failed to start ${cmd}: ${err.message}`,
        exitCode: 1,
        signal: null,
      });
    });
    child.on('close', (code, signal) => {
      resolve({ stdout, stderr, exitCode: code ?? 0, signal });
    });
  });
}
