/**
 * boxValue 定义，拥有 get 和 set 两个 api
 */
export interface IBoxValue<T = any> {
  get(): T,

  set(v: T): void,

  isVariable?: boolean;
}

/**
 * 只读 boxValue
 */
export interface IReadonlyBoxValue<T = any> extends Omit<IBoxValue<T>, "set"> {
}

/**
 * boxValue 集合定义，通常使用 Map 或者 Record<string, IBoxValue> 实现
 */
export interface IBoxValues<T extends Record<string, any> = Record<string, any>> {
  get<K extends keyof T>(selector: K): T[K];

  has<K extends keyof T>(selector: K): boolean;

  set<K extends keyof T>(selector: K, value: T[K]): void;
}


/**
 * 只读 boxValue 集合定义
 */
export interface IReadonlyBoxValues<T extends Record<string, any> = Record<string, any>> extends Omit<IBoxValues, "set"> {}
