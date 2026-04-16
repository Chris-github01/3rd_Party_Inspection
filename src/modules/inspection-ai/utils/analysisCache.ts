import type { AIAnalysisResult } from '../types';

const MAX_ENTRIES = 50;
const TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  result: AIAnalysisResult;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedResult(hash: string): AIAnalysisResult | null {
  const entry = cache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(hash);
    return null;
  }
  return entry.result;
}

export function setCachedResult(hash: string, result: AIAnalysisResult): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(hash, { result, cachedAt: Date.now() });
}

export function clearAnalysisCache(): void {
  cache.clear();
}

export function cacheSize(): number {
  return cache.size;
}
