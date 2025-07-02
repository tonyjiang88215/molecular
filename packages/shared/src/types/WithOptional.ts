/**
 * 将 T 中的 K 属性，设置为 optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
