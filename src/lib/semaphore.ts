type Waiter = () => void;

class Semaphore {
  private running = 0;
  private queue: Waiter[] = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.running--;
    }
  }
}

const g = globalThis as unknown as { __semaphores?: Map<string, Semaphore> };
if (!g.__semaphores) g.__semaphores = new Map();

export function getSemaphore(name: string, max: number): Semaphore {
  let s = g.__semaphores!.get(name);
  if (!s) {
    s = new Semaphore(max);
    g.__semaphores!.set(name, s);
  }
  return s;
}
