import type { IExpansionManifest } from './manifests';

export type DAG = {
  names: string[],
  dependencies: [string, string][]
};

/**
 *
 * @param manifests
 */
export function makeDependenciesDAG(manifests: IExpansionManifest[], activatedManifest: string[]): DAG {
  const mkeys = manifests.map(m=>m.name)
  // TODO 需要检查是否存在环，如果存在，则抛出错误
  return manifests.reduce((dag, manifest) => {
    dag.names.push(manifest.name);
    if (manifest.dependencies) {
      Object.keys(manifest.dependencies).forEach(dependent => {
        // 如果依赖的插件不存在并且已经安装过了 补充进去 保证图的完整性
        if(!mkeys.includes(dependent) &&  !dag.names.includes(dependent) && activatedManifest.includes(dependent)){
          dag.names.push(dependent);
        }
        dag.dependencies.push([manifest.name, dependent]);
      })
    }

    return dag;
  }, { names: [], dependencies: []});
}


/**
 * 根据 manifests 中的依赖关系，生成加载的优先级顺序
 * @param manifests
 */
export function makePrioritySequence(manifests: IExpansionManifest[], activatedManifest: string[]): string[][] {

  let dag = makeDependenciesDAG(manifests, activatedManifest);

  const priorities = [];
  while(dag.names.length > 0) {
    const result = pickPriorityNodes(dag);
    if(result.names.length === 0) {
      throw new Error('分析插件安装顺序失败，有不正确的依赖关系，请检查');
    }
    dag = result.dag;
    priorities.push(result.names);

    if(dag.names.length === 0) {
      break;
    }
  }

  return priorities;
}


function pickPriorityNodes(dag: DAG): { dag: DAG, names: string[] } {
  const names = dag.names.filter(name => {
    return !dag.dependencies.some(([source, target]) => source === name);
  });

  dag.names = dag.names.filter(a => !names.some(b => a === b));
  dag.dependencies = dag.dependencies.filter(([source, target]) => !names.some(name => name === target));
  return {
    dag, names
  }
}
