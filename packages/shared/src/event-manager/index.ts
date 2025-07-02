import {IDestructible, IDisposer} from "../types";

export type IListener<P extends {} = {}, R = void> = (params: P) => R;


export interface IEventManager<T extends Record<string, {}> = {}, R = void> {
  /**
   * 监听事件
   * @param eventName
   * @param handler
   */
  on<K extends keyof T>(eventName: K, handler: IListener<T[K], R>): IDisposer;

  /**
   * 取消监听
   * @param eventName
   * @param handler
   */
  off<K extends keyof T>(eventName: K, handler: IListener<T[K], R>): void;

  /**
   * 派发事件
   * @param eventName
   * @param params
   */
  dispatch<K extends keyof T>(eventName: K, params: T[K]): void;

  /**
   * 派发事件（支持异步回调函数）
   * @param eventName
   * @param params
   */
  dispatchAsync<K extends keyof T>(eventName: K, params: T[K]): Promise<any>;

  /**
   * 清空一个事件所有的监听
   * @param eventName
   */
  clear<K extends keyof T>(eventName: K): void;
}

export class EventManager<T extends Record<string, {}> = {}> implements IEventManager<T>, IDestructible {

  private eventStack: { [eventName: string]: Array<IListener> } = {};

  destructor() {
    // this.eventStack = undefined;
  }

  on(eventName, handler): IDisposer {
    if (!this.eventStack[eventName]) {
      this.eventStack[eventName] = [];
    }

    this.eventStack[eventName].push(handler);

    return () => this.off(eventName, handler)
  }

  off(eventName, handler) {
    const stackItem = this.eventStack[eventName];
    if (stackItem) {
      const index = stackItem.indexOf(handler);
      if (index !== -1) {
        stackItem.splice(index, 1);
      }
    }
  }

  dispatch(eventName, ...args: Array<any>) {
    // console.log('Voucher.EventController', eventName, params);
    const stackItem = this.eventStack[eventName];
    if (stackItem) {
      // @ts-ignore
      stackItem.forEach(listener => listener(...args));
    }
  }

  dispatchAsync(eventName, params) {

    const promises = [];

    const stackItem = this.eventStack[eventName];
    if (stackItem) {
      stackItem.forEach((listener) => promises.push(listener(params)));
    }

    return Promise.all(promises);
  }

  clear(eventName) {
    const stackItem = this.eventStack[eventName];
    if (stackItem) {
      stackItem.length = 0;
    }
  }
}
