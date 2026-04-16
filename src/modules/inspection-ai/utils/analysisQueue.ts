type QueueTask = () => Promise<void>;

interface QueuedEntry {
  id: string;
  task: QueueTask;
  resolve: () => void;
  reject: (err: unknown) => void;
  enqueuedAt: number;
}

type QueueListener = () => void;

const BUCKET_CAPACITY = 3;
const BUCKET_REFILL_RATE_MS = 6000;
const MIN_GAP_MS = 3000;
const DEBOUNCE_MS = 5000;
const RATE_LIMIT_PAUSE_BASE_MS = 30000;

let isRunning = false;
let lastCompletedAt = 0;
let pausedUntil = 0;
let consecutiveRateLimits = 0;
let tokens = BUCKET_CAPACITY;
let lastRefillAt = Date.now();

const queue: QueuedEntry[] = [];
const listeners = new Set<QueueListener>();
const recentRequests = new Map<string, number>();

function emit() {
  listeners.forEach((l) => l());
}

function refillTokens() {
  const now = Date.now();
  const elapsed = now - lastRefillAt;
  const newTokens = Math.floor(elapsed / BUCKET_REFILL_RATE_MS);
  if (newTokens > 0) {
    tokens = Math.min(BUCKET_CAPACITY, tokens + newTokens);
    lastRefillAt = now;
  }
}

function jitteredPauseDuration(consecutiveHits: number): number {
  const base = RATE_LIMIT_PAUSE_BASE_MS * Math.pow(1.5, Math.min(consecutiveHits - 1, 4));
  const jitter = Math.random() * 5000;
  return Math.min(base + jitter, 180000);
}

export function addQueueListener(fn: QueueListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function drain() {
  if (isRunning || queue.length === 0) return;

  const now = Date.now();

  if (now < pausedUntil) {
    const waitMs = pausedUntil - now;
    console.warn(`[Queue] Rate-limit pause active — resuming in ${Math.ceil(waitMs / 1000)}s`);
    setTimeout(drain, waitMs + 100);
    return;
  }

  refillTokens();

  if (tokens <= 0) {
    setTimeout(drain, BUCKET_REFILL_RATE_MS);
    return;
  }

  const gapMs = now - lastCompletedAt;
  if (gapMs < MIN_GAP_MS) {
    setTimeout(drain, MIN_GAP_MS - gapMs + 50);
    return;
  }

  const entry = queue.shift()!;
  tokens -= 1;
  isRunning = true;
  emit();

  (async () => {
    try {
      await entry.task();
      entry.resolve();
      consecutiveRateLimits = 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isRateLimit = msg.includes('rate') || msg.includes('429') || msg.includes('throttl');

      if (isRateLimit) {
        consecutiveRateLimits += 1;
        const pauseMs = jitteredPauseDuration(consecutiveRateLimits);
        pausedUntil = Date.now() + pauseMs;
        tokens = 0;
        lastRefillAt = Date.now();
        console.warn(`[Queue] 429 hit #${consecutiveRateLimits} — pausing for ${Math.round(pauseMs / 1000)}s`);
      }

      entry.reject(err);
    } finally {
      lastCompletedAt = Date.now();
      isRunning = false;
      emit();
      drain();
    }
  })();
}

export function enqueue(
  task: QueueTask,
  taskId?: string,
  priority: 'high' | 'normal' = 'normal'
): Promise<void> {
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
    const entry: QueuedEntry = { id, task, resolve, reject, enqueuedAt: Date.now() };
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

export function isQueuePaused(): boolean {
  return Date.now() < pausedUntil;
}

export function queuePausedForMs(): number {
  return Math.max(0, pausedUntil - Date.now());
}

export function queueDepth(): number {
  return queue.length + (isRunning ? 1 : 0);
}

export function availableTokens(): number {
  refillTokens();
  return tokens;
}

export function clearQueue() {
  while (queue.length > 0) {
    const entry = queue.pop()!;
    entry.reject(new Error('Queue cleared'));
  }
  emit();
}
