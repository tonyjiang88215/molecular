import { useCallback, useEffect } from 'react';
import type { IExpansionSystem } from '../expansion-system';

export function useDevtools(es: IExpansionSystem) {

  /*
   * 初始化
   */
  // useEffect(() => {
  //   postMessage(es.id, 'init', {
  //     parentId: es.parent?.id
  //   });
  //
  //   return () => {
  //     postMessage(es.id, 'destroy');
  //   }
  // }, []);

  const devtoolsCallback = useCallback((ev) => {
    if(ev?.data?.source == 'expansionSystemDevtools' && ev?.data?.id == es.id) {
      console.log('receive message', ev?.data);
    }
  }, [es]);
  /**
   *
   */
  useEffect(() => {
    window.addEventListener('message', devtoolsCallback);

    return () => {
      console.log('销毁事件监听')
      window.removeEventListener('message', devtoolsCallback);
    }
  }, []);


}

function postMessage(id: string, type: string, payload?: any) {
  window.postMessage({
    source: 'expansionSystem',
    id, type, payload
  }, '*');
}
