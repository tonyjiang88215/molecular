import { BaseHook } from './base-hook';
import { IAsyncWaterfallHook } from './hook.type';

export function createAsyncWaterfallHook<T>(): IAsyncWaterfallHook<T> {
  return new AsyncWaterfallHook();
}

export class AsyncWaterfallHook<T> extends BaseHook<T, Promise<T>> implements IAsyncWaterfallHook<T> {
  async execute(payload: T): Promise<T> {
    return [...this.interceptors, ...this.hooks].reduce((before, hook) => {
      return new Promise((resolve, reject) => {
        before
          .then((v) => {
            hook(v)
              .then(resolve)
              .catch(reject);
          })
          .catch((err) => {
            reject(err);
          })
      });
    }, Promise.resolve(payload));
  }
}
