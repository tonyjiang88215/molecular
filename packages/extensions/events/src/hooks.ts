import { useEffect } from 'react';
import { useExtensionContext } from '@tjmol/core';
import { IEventContext } from './declare';


export function useEventsListener(name: string, handler: (...args: any[]) => void) {
  const ctx = useExtensionContext<{ events: IEventContext }>();

  useEffect(() => {
    return ctx.events.register(name, handler);
  }, [ctx, name, handler]);
}

export function useEventsDispatcher(name: string) {
  const ctx = useExtensionContext<{ events: IEventContext }>();

  return function(params) {
    ctx.events.dispatch(name, params);
  };
}
