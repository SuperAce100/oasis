import { LRUCache } from 'lru-cache';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class TTLCache<K extends {}, V> {
  private cache: LRUCache<K, CacheEntry<V>>;
  private ttlMs: number;

  constructor(maxSize: number = 100, ttlMs: number = 2 * 60 * 1000) {
    this.cache = new LRUCache({ max: maxSize });
    this.ttlMs = ttlMs;
  }

  set(key: K, value: V): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries and return actual size
    const now = Date.now();
    const keysToDelete: K[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    return this.cache.size;
  }
}

// Notion cache instance
export const notionCache = new TTLCache<string, any>(100, 2 * 60 * 1000);