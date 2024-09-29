import type { IExpansionSystem } from '../expansion-system';

import { Autowired, Bean, PostConstruct, ExpansionSeedNames, PreDestroy } from '../beans';
import { ExpansionFeatureNames } from './constants';

/**
 * 嵌套插件系统管理对象
 *
 * 在我们的应用中，存在多个插件系统嵌套的场景，比如
 *   表单 -> 参照 -> 列表
 * 这样一个路径，其中，表单方案、参照方案、列表方案各自都实现了自己的插件化。
 *
 * 我们希望在参照插件系统中，能够访问表单插件系统共享的数据。
 * 为了解决这个问题，我们引入的 HierarchyManager 用于解决这个问题。
 *
 * HierarchyManager 会以最顶层的插件系统为基础管理对象，维护一个和插件系统
 * 嵌套关系相同的内存命名空间，以便各个插件系统可以共享自己的数据出来。
 *
 * 假设我们嵌套的插件系统层级如下：
 *   表单
 *    |———— User 参照
 *    |———— Department 参照
 *
 * 那么当所有插件系统初始化完成后，我们应该得到的嵌套关系如下：
 *   formExpansions 表单
 *        |———— ReferenceExpansions#User 参照
 *        |———— ReferenceExpansions#Department 参照
 *
 *
 * 再复杂一点的情况下，我们可能存在如下层级：
 *   表单
 *    |———— User 参照
 *    |      |———— AdvanceQueryList 高级参照列表
 *    |      |          |———— QuerySolution 查询方案
 *    |      |          |          |———— Department 参照
 *
 * 此时，我们得到的嵌套关系如下：
 *   formExpansions 表单
 *        |———— ReferenceExpansions#User 参照
 *                |———— QueryListExpansions 高级列表
 *                        |———— QuerySolutionExpansions 查询方案
 *                                    |———— ReferencesExpansions#Department 参照
 *
 * 在整个路径上，出现了两次 ReferenceExpansions，这种情况下，可能存在某些
 * 公共信息需要被覆盖的情况（类似 React 的 Context）
 *
 */
export interface IHierarchyManager {
  /**
   * 添加下级插件系统
   * @param es
   */
  add(es: IExpansionSystem): void

  /**
   * 移除下级插件系统
   * @param es
   */
  remove(es: IExpansionSystem): void

  /**
   * 获取上下文信息，会将父级的上下文信息一起合并
   */
  getContextInfo(): Record<string, any>

  /**
   * 设置当前插件系统的上下文信息
   * @param info
   */
  setContextInfo(info: Record<string, any>): void

}

@Bean(ExpansionFeatureNames.HierarchyManager)
export class HierarchyManager implements IHierarchyManager {

  @Autowired(ExpansionSeedNames.ParentExpansionSystem) private parent: IExpansionSystem;
  // private parent: IExpansionSystem;
  private children: IExpansionSystem[] = [];

  private info: Record<string, any>;

  @PostConstruct
  private postConstruct() {
    this.parent?.addHierarchy(this);
  }

  @PreDestroy
  private preDestroy() {
    this.parent?.removeHierarchy(this);
  }

  add(es) {
    this.children.push(es);
    // es.beanManager.getBean(ExpansionFeatureNames.HierarchyManager).parent = this;
  }

  remove(es) {
    this.children = this.children.filter(child => child != es);
    // es.beanManager.getBean(ExpansionFeatureNames.HierarchyManager).parent = undefined;
  }

  getContextInfo(): Record<string, any> {
    if(this.parent) {
      return Object.assign({}, this.parent.getContextInfo(), this.info);
    }

    return this.info;
  }

  setContextInfo(info: Record<string, any>) {
    this.info = info;
  }
}
