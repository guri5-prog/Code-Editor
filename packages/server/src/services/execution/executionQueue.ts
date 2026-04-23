import { AppError } from '../../middleware/errorHandler.js';

const MAX_CONCURRENT_EXECUTIONS = 3;
const MAX_QUEUED_EXECUTIONS = 50;

type QueuedTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

let activeExecutions = 0;
const queue: QueuedTask<unknown>[] = [];

export function enqueueExecution<T>(run: () => Promise<T>): Promise<T> {
  if (queue.length >= MAX_QUEUED_EXECUTIONS) {
    throw new AppError(503, 'Execution queue is full, try again shortly');
  }

  return new Promise<T>((resolve, reject) => {
    queue.push({ run, resolve: resolve as (value: unknown) => void, reject });
    drainQueue();
  });
}

function drainQueue(): void {
  while (activeExecutions < MAX_CONCURRENT_EXECUTIONS && queue.length > 0) {
    const task = queue.shift();
    if (!task) return;

    activeExecutions += 1;
    task
      .run()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        activeExecutions -= 1;
        drainQueue();
      });
  }
}
