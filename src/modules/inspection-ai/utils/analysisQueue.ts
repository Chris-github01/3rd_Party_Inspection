type QueueTask = () => Promise<void>;

interface QueuedEntry {
  task: QueueTask;
  resolve: () => void;
  reject: (err: unknown) => void;
}

const MIN_GAP_MS = 2000;

let isRunning = false;
let lastCompletedAt = 0;
const queue: QueuedEntry[] = [];

function drain() {
  if (isRunning || queue.length === 0) return;

  const entry = queue.shift()!;
  isRunning = true;

  const now = Date.now();
  const elapsed = now - lastCompletedAt;
  const delay = elapsed < MIN_GAP_MS ? MIN_GAP_MS - elapsed : 0;

  setTimeout(async () => {
    try {
      await entry.task();
      entry.resolve();
    } catch (err) {
      entry.reject(err);
    } finally {
      lastCompletedAt = Date.now();
      isRunning = false;
      drain();
    }
  }, delay);
}

export function enqueue(task: QueueTask): Promise<void> {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    drain();
  });
}

export function queueLength(): number {
  return queue.length;
}

export function isQueueBusy(): boolean {
  return isRunning;
}
