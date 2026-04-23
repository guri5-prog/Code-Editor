import type { ExecutionResult } from '@code-editor/shared';
import { sanitizeExecutionInput } from './sanitizer.js';
import { executeWithPiston } from './pistonExecutor.js';
import { enqueueExecution } from './executionQueue.js';

export async function executeCode(
  languageId: string,
  code: string,
  stdin: string,
  args: string[],
): Promise<ExecutionResult> {
  sanitizeExecutionInput(languageId, code, stdin);
  return enqueueExecution(() => executeWithPiston(languageId, code, stdin, args));
}
