import {IHookDoneFn, IHookFn, IHooks} from "./hook.type";

export abstract class BaseHook<P, R> implements IHooks<P, R> {
  protected hooks: Array<IHookFn<P, R>> = [];
  protected interceptors: Array<IHookFn<P, R>> = [];
  protected dones: Array<IHookDoneFn<R>> = [];

  destructor() {
    this.interceptors.length = 0;
    this.hooks.length = 0;
    this.dones.length = 0;
  }

  /**
   * hooks 遵循 FIFO（First-In-First-Out）
   * @param hook
   */
  append(hook: (payload: P) => R) {
    this.hooks.push(hook);
    return () => {
      this.hooks = this.hooks.filter(i => i !== hook);
    }
  }

  /**
   * 移除 append 的 hooks
   * @param hook
   */
  deleteAppend(hook: IHookFn<P, R>): boolean {
    const idx = this.hooks.findIndex(i => i === hook);
    if (idx !== -1) {
      this.hooks.splice(idx, 1);
      return true;
    }

    return false;
  }

  /**
   * interceptors 遵循 LIFO（Last-In-First-Out）
   * @param hook
   */
  intercept(hook: (payload: P) => R) {
    this.interceptors.unshift(hook);
    return () => {
      this.interceptors = this.interceptors.filter(i => i !== hook);
    }
  }

  /**
   * 移除 intercept 的 hooks
   * @param hook
   */
  deleteIntercept(hook: IHookFn<P, R>): boolean {
    const idx = this.interceptors.findIndex(i => i === hook);
    if (idx !== -1) {
      this.interceptors.splice(idx, 1);
      return true;
    }

    return false;
  }

  /**
   * hooks 执行完成后的通知函数
   * @param hook
   */
  done(hook: IHookDoneFn<R>) {
    this.dones.push(hook);
    return () => {
      this.dones = this.dones.filter(i => i !== hook);
    }
  }

  /**
   * 移除 done 的 hooks
   * @param hook
   */
  deleteDone(hook: IHookDoneFn<R>): boolean {
    const idx = this.dones.findIndex(i => i === hook);
    if (idx !== -1) {
      this.dones.splice(idx, 1);
      return true;
    }

    return false;
  }

  /**
   * 执行 hooks，按照 interceptor、hooks 的顺序进行执行
   * @param payload
   */
  abstract execute(payload: P): R;
}
