/**
 * 以枚举 T 的 key 抽取出来，作为新的联合类型
 */
export type KeyOfEnums<T> = keyof T;
