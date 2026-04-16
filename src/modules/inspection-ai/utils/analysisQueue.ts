type QueueTask = () => Promise<void>;

interface QueuedEntry {
  id: string;
  task: QueueTask;
  resolve: () => void;
  reject: (err: unknown) => void;
}

type QueueListener = () => void;

const MIN_GAP_MS = 4000;
const DEBOUNCE_MS = 8000;

let isRunning = false;
let lastCompletedAt = 0;
const queue: QueuedEntry[] = [];
const listeners = new Set<QueueListener>();
const recentRequests = new Map<string, number>();

function emit() {
  listeners.forEach((l) => l());
}

export function addQueueListener(fn: QueueListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function drain() {
  if (isRunning || queue.length === 0) return;

  const entry = queue.shift()!;
  isRunning = true;
  emit();

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
      emit();
      drain();
    }
  }, delay);
}

export function enqueue(task: QueueTask, taskId?: string, priority: 'high' | 'normal' = 'normal'): Promise<void> {
  if (taskId) {
    const last = recentRequests.get(taskId);
    if (last && Date.now() - last < DEBOUNCE_MS) {
      return Promise.reject(new Error('debounced'));
    }
    recentRequests.set(taskId, Date.now());
    setTimeout(() => recentRequests.delete(taskId), DEBOUNCE_MS * 2);
  }

  const id = taskId ?? Math.random().toString(36).slice(2);

  return new Promise((resolve, reject) => {
    const entry: QueuedEntry = { id, task, resolve, reject };
    if (priority === 'high') {
      queue.unshift(entry);
    } else {
      queue.push(entry);
    }
    emit();
    drain();
  });
}

export function queueLength(): number {
  return queue.length;
}

export function isQueueBusy(): boolean {
  return isRunning;
}

export function queueDepth(): number {
  return queue.length + (isRunning ? 1 : 0);
}

export function clearQueue() {
  while (queue.length > 0) {
    const entry = queue.pop()!;
    entry.reject(new Error('Queue cleared'));
  }
  emit();
}
