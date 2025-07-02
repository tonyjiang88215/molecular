import { useCallback } from 'react';
import { useExtensionContext } from '@tjmol/core';
import { IPipelinesContext } from './declare';

export function usePipelinesExecutor<T = any>(name: string): (payload: T) => any | Promise<any> {
  const ctx = useExtensionContext<{ pipelines: IPipelinesContext }>();
  return useCallback((payload) => ctx.pipelines.execute(name, payload), [ctx, name]);
}
