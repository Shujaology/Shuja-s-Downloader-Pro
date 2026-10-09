const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export { sleep };

/** Global token bucket shared by every connection, so the limit applies to total bandwidth. */
export class Throttle {
  private rate = 0;
  private tokens = 0;
  private last = performance.now();

  /** Short burst allowance so the limit holds over small windows, not just on average. */
  private get burst() {
    return Math.max(64 * 1024, this.rate / 4);
  }

  setRate(bytesPerSecond: number) {
    this.rate = Math.max(0, bytesPerSecond);
    this.tokens = Math.min(this.tokens, this.burst);
    this.last = performance.now();
  }

  async take(bytes: number, signal?: AbortSignal) {
    if (!this.rate) return;
    const now = performance.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    this.tokens -= bytes;
    if (this.tokens < 0) await sleep((-this.tokens / this.rate) * 1000, signal);
  }
}
