/**
 * Rate limiter for API calls
 * Ensures we don't exceed rate limits by spacing out requests
 */
export class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private running = false;
  private requestsPerSecond: number;
  private delayBetweenRequests: number;

  constructor(requestsPerSecond: number = 4) {
    // TMDB allows 40 requests per 10 seconds, so ~4 per second
    // Using 4 per second to maximize throughput while staying within limits
    this.requestsPerSecond = requestsPerSecond;
    this.delayBetweenRequests = 1000 / requestsPerSecond;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running || this.queue.length === 0) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Add delay between requests to respect rate limits
        if (this.queue.length > 0) {
          await this.sleep(this.delayBetweenRequests);
        }
      }
    }

    this.running = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Process items in batches with rate limiting
 * The processor function should use rateLimiter.execute internally for each API call
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, rateLimiter: RateLimiter) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  // Use 4 requests/second to maximize throughput (TMDB allows 40 per 10 seconds)
  const rateLimiter = new RateLimiter(4);

  // Process all items in parallel - the rate limiter will queue them appropriately
  // This is more efficient than processing in sequential batches
  const allResults = await Promise.all(
    items.map((item) => processor(item, rateLimiter))
  );

  return allResults;
}
