import type { RawSegment } from "./segment";

export type DirtyQueueItem = {
  segment: RawSegment;
  docVersion: number;
  addedAt: number;
};

export class LiveExaminerScheduler {
  private queue: Map<string, DirtyQueueItem> = new Map();
  private activeControllers: Map<string, AbortController> = new Map();
  private retryDelayMs = 1000;
  private consecutiveErrors = 0;
  private maxConcurrency = 2;
  private inFlightBatches = 0;

  /** Adds or updates dirty sentences in the queue */
  enqueue(segments: RawSegment[], docVersion: number): void {
    for (const seg of segments) {
      if (!seg.isComplete) continue; // Don't check incomplete sentences
      this.queue.set(seg.hash, {
        segment: seg,
        docVersion,
        addedAt: Date.now(),
      });
    }
  }

  /** Removes sentences from queue that are no longer dirty */
  dequeue(sentenceHashes: string[]): void {
    for (const h of sentenceHashes) {
      this.queue.delete(h);
    }
  }

  /** Gets next batch of dirty sentences up to batchSize */
  getNextBatch(batchSize = 6): DirtyQueueItem[] {
    if (this.inFlightBatches >= this.maxConcurrency) {
      return [];
    }
    const items = Array.from(this.queue.values()).slice(0, batchSize);
    return items;
  }

  /** Registers in-flight request */
  registerInFlight(batchKey: string, controller: AbortController): void {
    this.inFlightBatches++;
    this.activeControllers.set(batchKey, controller);
  }

  /** Marks batch finished */
  markBatchDone(batchKey: string, success: boolean): void {
    this.inFlightBatches = Math.max(0, this.inFlightBatches - 1);
    this.activeControllers.delete(batchKey);

    if (success) {
      this.consecutiveErrors = 0;
      this.retryDelayMs = 1000;
    } else {
      this.consecutiveErrors++;
      // Exponential backoff capped at 16s
      this.retryDelayMs = Math.min(16000, 1000 * Math.pow(2, this.consecutiveErrors));
    }
  }

  /** Cancels all in-flight requests (e.g. on unmount or question change) */
  cancelAll(): void {
    for (const controller of this.activeControllers.values()) {
      controller.abort();
    }
    this.activeControllers.clear();
    this.inFlightBatches = 0;
    this.queue.clear();
  }

  getBackoffDelay(): number {
    return this.retryDelayMs;
  }

  hasPending(): boolean {
    return this.queue.size > 0;
  }
}
