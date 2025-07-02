
export interface IDestructible {
  destructor(): void
}

export type IDisposer = () => void;

/**
 * Hook Function Def
 */
export type IHookFn<P, R> = (payload: P) => R


export type IHookDoneFn<P> = (payload: P) => void

/**
 * Hooks 用来定义对一个扩展点的扩展能力
 */
export interface IHooks<P = any, R = P> extends IDestructible {
  /**
   * 按先后顺序添加 hook 函数，遵循 FIFO（First-In-First-Out） 原则
   * @param hook
   */
  append(hook: IHookFn<P, R>): IDisposer

  /**
   * intercept 固定在执行前追加 hook 函数，遵循 LIFO（Last-In-First-Out）原则
   * @param hook
   */
  intercept(hook: IHookFn<P, R>): IDisposer

  /**
   * hook 完成后的收尾函数，只能接收到最终结果，不能再进行任何更新处理
   * @param hook
   */
  done(hook: IHookDoneFn<R>): IDisposer


  /**
   * 删除 append 的 hook 函数
   * @param hook
   */
  deleteAppend(hook: IHookFn<P, R>): boolean

  /**
   * 删除 intercept 的 hook 函数
   * @param hook
   */
  deleteIntercept(hook: IHookFn<P, R>): boolean

  /**
   * 删除 done 的 hook 函数
   * @param hook
   */
  deleteDone(hook: IHookDoneFn<R>): boolean

  /**
   * 执行 hooks 函数
   * @param payload
   */
  execute(payload: P): R
}

/**
 * CommonHooks，按照串行执行，标准 hooks
 */
export interface ICommonHook<T> extends IHooks<T, void> {
}

/**
 * WaterfallHooks，按照顺序串行执行，并且会将上一个函数的结果作为下一个函数的参数传入。
 */
export interface IWaterfallHook<T, R = T> extends IHooks<T, R> {
}

/**
 * AsyncWaterfallHooks 和 WaterfallHooks 逻辑相同，每一步会等待上一个 promise 执行完成
 */
export interface IAsyncWaterfallHook<T, R = Promise<T>> extends IHooks<T, R> {
}

/**
 * ConcurrentHooks，所有函数并行执行
 */
export interface IConcurrentHook<T> extends IHooks<T, Promise<any>> {
}

/**
 * payload 定义，为了编码时，可以快速通过 getHooks 推导出 IHooks 的泛型而增加
 */
export type IHookPayloadDef<T = any, R = any> = {}

/**
 * 在实现 IHookManager 时，可以提供一个 hook payload 的定义，实现类型推导
 */
export type IHookPayloads = Record<string, IHookPayloadDef>;

/**
 * HookPayload 的参数类型推导定义
 */
export type IHookPayload<T extends IHookPayloadDef> = T extends IHookPayloadDef<infer R> ? R : any;
export type IHookReturned<T extends IHookPayloadDef> = T extends IHookPayloadDef<any, infer R> ? R : any;

/**
 * HookManager 管理多个 hook 的对象
 */
export interface IHookManager<T extends IHookPayloads = {}> {
  /**
   * 获取 Hooks
   * @param name
   * @constructor
   */
  getHooks<K extends keyof T>(name: K): IHooks<IHookPayload<T[K]>, IHookReturned<T[K]>>

  /**
   * 添加 Hooks
   * @param name
   * @param hooks
   * @constructor
   */
  addHooks<K extends keyof T>(name: K, hooks: IHooks<IHookPayload<T[K]>, IHookReturned<T[K]>>): IDisposer;

  /**
   * 判断 hooks 是否存在
   * @param name
   */
  hasHooks<K extends keyof T>(name: K): boolean

}
