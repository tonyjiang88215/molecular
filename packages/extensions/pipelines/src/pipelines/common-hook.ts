import {ICommonHook} from "./hook.type";
import {BaseHook} from "./base-hook";

export function createCommonHook<T>(): ICommonHook<T> {
  return new CommonHook();
}

export class CommonHook<T> extends BaseHook<T, void> implements ICommonHook<T> {
  /**
   * 执行 hooks，按照 interceptor、hooks 的顺序进行执行
   * @param payload
   */
  execute(payload: T) {
    this.interceptors.forEach(hooks => hooks(payload));
    this.hooks.forEach(hooks => hooks(payload));
    this.dones.forEach(hooks => hooks(undefined));
  }

}
