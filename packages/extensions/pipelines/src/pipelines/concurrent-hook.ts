import { BaseHook } from './base-hook';
import { IConcurrentHook } from './hook.type';

export function createConcurrentHook<T>(): IConcurrentHook<T> {
  return new ConcurrentHook();
}

export class ConcurrentHook<T> extends BaseHook<T, Promise<any>> implements IConcurrentHook<T> {

  intercept(hook: (payload: T) => void): () => void {
    throw new Error(`Concurrent 模式不支持 intercept`);
  }

  async execute(payload: T) {
    await Promise.all(
      this.hooks.map(hook => hook(payload)),
    );

    if (this.dones.length > 0) {
      await Promise.all(
        this.dones.map(hook => hook(undefined)),
      );
    }
  }
}
