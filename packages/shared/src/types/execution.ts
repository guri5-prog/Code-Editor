export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'timeout';

export interface ExecutionRequest {
  language: string;
  code: string;
  stdin?: string;
  args?: string[];
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: string | null;
  executionTime: number;
  timedOut: boolean;
}

export interface ExecutionHistoryEntry {
  id: string;
  language: string;
  code: string;
  output: string;
  exitCode: number;
  duration: number;
  result: ExecutionResult;
  timestamp: string;
}

export interface TerminalTabInfo {
  id: string;
  type: 'execution' | 'repl';
  title: string;
  language: string;
  sourceName?: string;
  createdAt: string;
  output: string;
}

export interface ReplEvalMessage {
  type: 'eval';
  code: string;
}

export interface ReplResetMessage {
  type: 'reset';
}

export type ReplClientMessage = ReplEvalMessage | ReplResetMessage;

export interface ReplResultMessage {
  type: 'result';
  stdout: string;
  stderr: string;
}

export interface ReplErrorMessage {
  type: 'error';
  message: string;
}

export interface ReplReadyMessage {
  type: 'ready';
  language: string;
}

export type ReplServerMessage = ReplResultMessage | ReplErrorMessage | ReplReadyMessage;

export interface ExecutionStartMessage {
  type: 'start';
  language: string;
  code: string;
  stdin?: string;
  args?: string[];
}

export interface ExecutionStdinMessage {
  type: 'stdin';
  data: string;
}

export interface ExecutionStopMessage {
  type: 'stop';
}

export type ExecutionClientMessage =
  | ExecutionStartMessage
  | ExecutionStdinMessage
  | ExecutionStopMessage;

export interface ExecutionStartedMessage {
  type: 'started';
}

export interface ExecutionOutputMessage {
  type: 'output';
  stream: 'stdout' | 'stderr';
  data: string;
}

export interface ExecutionExitMessage {
  type: 'exit';
  result: ExecutionResult;
}

export interface ExecutionWsErrorMessage {
  type: 'error';
  message: string;
}

export type ExecutionServerMessage =
  | ExecutionStartedMessage
  | ExecutionOutputMessage
  | ExecutionExitMessage
  | ExecutionWsErrorMessage;
