import React, { useContext } from 'react';
import { useExpansions } from './useExpansions';
import { IExpansionBaseContext } from '../services';


export type IExtensionContext<T extends object = {}> = IExpansionBaseContext & T;

const ExtensionContext = React.createContext();
ExtensionContext.displayName = 'ExtensionContext';

export function ExtensionContextProvider({ contributor, children }) {
  const expansions = useExpansions();
  const ctx = expansions.getExtensionContext(contributor);

  return (
    <ExtensionContext.Provider value={ctx}>
      {children}
    </ExtensionContext.Provider>
  );
}

export function useExtensionContext<T extends object = {}>(): IExtensionContext<T> {
  return useContext(ExtensionContext);
}
