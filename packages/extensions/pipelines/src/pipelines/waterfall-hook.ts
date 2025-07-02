import {IHookDoneFn, IHookFn, IWaterfallHook} from "./hook.type";
import {BaseHook} from "./base-hook";

export function createWaterfallHook<T>(): IWaterfallHook<T> {
  return new WaterfallHook();
}

export class WaterfallHook<T> extends BaseHook<T, T> implements IWaterfallHook<T> {
  /**
   * 执行 hooks，按照 interceptor、hooks 的顺序进行执行
   * @param payload
   */
  execute(payload: T): T {
    const out = [this.interceptors, this.hooks].reduce(
      (payload, hooks) => hooks.reduce((payload, hook) => hook(payload), payload),
      payload
    );
    this.dones.forEach(fn => fn(out));

    return out;
  }

}
