import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { useObserver } from 'mobx-react-lite';
import type { IExpansionSystem } from '../expansion-system';

export type ExpansionDevtoolsProps = {
  container: Element,
  wrapper: Element,
  es: IExpansionSystem
}

export const ExpansionDevtools = memo((props: ExpansionDevtoolsProps) => {
  const isHighlight = useObserver(() => props.es?.getDevtools().isHighlight);

  useEffect(() => {
    if(isHighlight) {
      props.wrapper['style'] = `display: block;`;
    }else {
      props.wrapper['style'] = `display: none;`;
    }

  }, [isHighlight, props.wrapper]);


  return (
      <div id={`expansion-system-${props.es?.id}`}>插件</div>
  );
});
