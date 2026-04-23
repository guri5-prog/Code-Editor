import { EXECUTION_CONFIG, getPistonId, getPistonLanguageVersion } from '../../config/execution.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { ExecutionResult } from '@code-editor/shared';

interface PistonRunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
  output: string;
}

interface PistonResponse {
  language: string;
  version: string;
  run?: PistonRunResult;
  compile?: PistonRunResult;
}

export async function executeWithPiston(
  languageId: string,
  code: string,
  stdin: string,
  args: string[],
): Promise<ExecutionResult> {
  const pistonId = getPistonId(languageId);
  if (!pistonId) {
    throw new AppError(400, `Language "${languageId}" is not executable`);
  }

  const version = getPistonLanguageVersion(pistonId);
  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXECUTION_CONFIG.defaultTimeout + 5000);

  try {
    const response = await fetch(`${EXECUTION_CONFIG.pistonApiUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonId,
        version,
        files: [{ content: code }],
        stdin,
        args,
        run_timeout: EXECUTION_CONFIG.defaultTimeout,
        compile_timeout: EXECUTION_CONFIG.defaultTimeout,
        compile_memory_limit: 256_000_000,
        run_memory_limit: 256_000_000,
      }),
      signal: controller.signal,
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new AppError(502, `Execution service error: ${text}`);
    }

    const data = (await response.json()) as PistonResponse;

    if (!data.run) {
      throw new AppError(502, 'Execution service returned an invalid response');
    }

    if (data.compile && data.compile.code !== 0 && data.compile.code !== null) {
      const limited = limitCombinedOutput(
        data.compile.stdout || '',
        data.compile.stderr || data.compile.output || 'Compilation failed',
      );

      return {
        stdout: limited.stdout,
        stderr: limited.stderr,
        exitCode: data.compile.code ?? 1,
        signal: data.compile.signal,
        executionTime,
        timedOut: false,
      };
    }

    const { stdout, stderr } = limitCombinedOutput(data.run.stdout || '', data.run.stderr || '');

    return {
      stdout,
      stderr,
      exitCode: data.run.code ?? 0,
      signal: data.run.signal,
      executionTime,
      timedOut: data.run.signal === 'SIGKILL',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;

    if (err instanceof Error && err.name === 'AbortError') {
      return {
        stdout: '',
        stderr: 'Execution timed out',
        exitCode: 124,
        signal: 'SIGKILL',
        executionTime: Date.now() - startTime,
        timedOut: true,
      };
    }

    throw new AppError(502, 'Failed to connect to execution service');
  } finally {
    clearTimeout(timeout);
  }
}

function limitCombinedOutput(stdout: string, stderr: string): { stdout: string; stderr: string } {
  const max = EXECUTION_CONFIG.maxOutputSize;
  if (stdout.length + stderr.length <= max) {
    return { stdout, stderr };
  }

  const marker = '\n[Output truncated - exceeded 1MB limit]';
  const stdoutBudget = Math.min(stdout.length, Math.floor(max * 0.7));
  const stderrBudget = Math.max(0, max - stdoutBudget - marker.length);

  return {
    stdout: stdout.slice(0, stdoutBudget),
    stderr: stderr.slice(0, stderrBudget) + marker,
  };
}
