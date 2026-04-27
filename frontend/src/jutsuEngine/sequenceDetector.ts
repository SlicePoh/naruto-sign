import type { SignLabel } from '../classifier/types';
import { JUTSUS, type JutsuKey } from './jutsuRegistry';

const SIGN_TIMEOUT = 5000; // 5 seconds between signs
const DUPLICATE_THRESHOLD = 500; // Ignore same sign within 500ms

export class SequenceDetector {
  private buffer: SignLabel[] = [];
  private lastSignTime: number = 0;
  private lastSign: SignLabel = 'unknown';
  private onJutsuDetected: ((jutsu: JutsuKey) => void) | null = null;

  constructor(onJutsuDetected?: (jutsu: JutsuKey) => void) {
    this.onJutsuDetected = onJutsuDetected || null;
  }

  /**
   * Add a new sign to the buffer and check for sequence matches
   */
  addSign(sign: SignLabel): void {
    if (sign === 'unknown') {
      return;
    }

    const now = Date.now();

    // Ignore duplicate rapid detections
    if (sign === this.lastSign && now - this.lastSignTime < DUPLICATE_THRESHOLD) {
      return;
    }

    // Reset buffer if timeout exceeded
    if (this.buffer.length > 0 && now - this.lastSignTime > SIGN_TIMEOUT) {
      this.buffer = [];
    }

    // Add sign to buffer
    this.buffer.push(sign);
    this.lastSign = sign;
    this.lastSignTime = now;

    console.log(`🖐️ Sequence buffer: [${this.buffer.join(' → ')}]`);

    // Keep buffer size limited (max length of longest jutsu)
    const maxLen = Math.max(...Object.values(JUTSUS).map(s => s.length));
    if (this.buffer.length > maxLen) {
      this.buffer.shift();
    }

    // Check for jutsu matches
    this.checkForJutsu();
  }

  /**
   * Check if current buffer matches any registered jutsu sequence
   */
  private checkForJutsu(): void {
    for (const [jutsuName, sequence] of Object.entries(JUTSUS)) {
      if (this.matchesSequence(sequence)) {
        this.buffer = []; // Reset buffer on success
        if (this.onJutsuDetected) {
          this.onJutsuDetected(jutsuName as JutsuKey);
        }
        return;
      }
    }
  }

  /**
   * Check if buffer ends with a sequence
   */
  private matchesSequence(sequence: readonly SignLabel[]): boolean {
    if (this.buffer.length < sequence.length) {
      return false;
    }

    const tail = this.buffer.slice(-sequence.length);
    return tail.every((sign, index) => sign === sequence[index]);
  }

  /**
   * Get current buffer
   */
  getBuffer(): SignLabel[] {
    return [...this.buffer];
  }

  /**
   * Reset the detector
   */
  reset(): void {
    this.buffer = [];
    this.lastSignTime = 0;
    this.lastSign = 'unknown';
  }
}
