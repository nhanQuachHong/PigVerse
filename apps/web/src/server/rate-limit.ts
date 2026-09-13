export interface RateLimiter {
  consume(key: string, now?: number): boolean;
}

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly entries = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string, now = Date.now()) {
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.entries.size >= 10_000) {
        for (const [entryKey, entry] of this.entries)
          if (entry.resetAt <= now) this.entries.delete(entryKey);
        if (this.entries.size >= 10_000) return false;
      }
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}
