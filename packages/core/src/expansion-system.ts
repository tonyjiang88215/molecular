
import type { IActivationEventDefinition, IExpansionManifest } from './manifests';
import type { IExpansionBeans } from './beans';
import { BeanManager, ExpansionSeedNames } from './beans';
import type { ExpansionManifestAssertionOptions, IExpansionDevtools, IExpansionDevtoolsOptions } from './services';
import {
  ContextManager,
  ContributionKeywordManager,
  Devtools,
  EventManager,
  ExtensionManager,
  HierarchyManager,
  IExpansionBaseContext,
  ManifestManager,
} from './services';
import { ExpansionFeatureNames } from './services/constants';
import { IBeanManager } from './beans/creator';

let uuid = 0;

export interface IExpansionSystem {
  readonly id: string
  /**
   * 当运行环境到达可以激活扩展的生命周期时，通过调用
   * 这个函数来触发扩展的加载 及 安装。
   * name 具体的可用值由具体方案确定。
   *
   * @param name
   * @param context 上下文对象, activationEvent中when的执行上下文
   */
  activate(name: string, context?: Record<string, any>, repeat?: boolean): Promise<void>

  /**
   * 当运行环境到达销毁扩展的生命周期时，通过调用
   * 这个函数来触发扩展的卸载。
   * @param name
   */
  deactivate(name: string): void

  /**
   * 根据 name 获取对应 extension 提供的 api
   * @param name
   */
  getExtension(name: string): any

  /**
   * 获取 extensions 的 context 对象
   * @param name
   */
  getExtensionContext<T extends IExpansionBaseContext = IExpansionBaseContext>(name: string): T

  /**
   * 添加一个嵌套的子插件系统
   * @param es
   */
  addHierarchy(es: IExpansionSystem): void

  /**
   * 移除一个嵌套的子插件系统
   * @param es
   */
  removeHierarchy(es: IExpansionSystem): void

  /**
   * 获取上下文信息，会和父级插件系统进行合并
   */
  getContextInfo(): Record<string, any>

  /**
   * 设置上下文信息，可以被嵌套的插件系统获取到
   * @param info
   */
  setContextInfo(info: Record<string, any>): void

  /**
   * 调试工具使用的 api 对象
   */
  getDevtools(): IExpansionDevtools

  /**
   * 销毁所有扩展
   */
  destroy(): void

  /**
   * 动态增加插件
   * @param manifests
   */
  dynamicAddManifest(manifests: IExpansionManifest[]): void

}

export type ExpansionSystemOptions = {
  /**
   * 扩展的元数据信息
   */
  manifests: IExpansionManifest[],

  /**
   * 激活事件定义
   */
  activationEventDefinitions: IActivationEventDefinition[],

  /**
   * 断言检查参数
   */
  assertionOptions?: ExpansionManifestAssertionOptions,

  /**
   *
   */
  devtoolsOptions?: IExpansionDevtoolsOptions

  /**
   * 父级插件系统
   */
  parent?: IExpansionSystem,
}

export class ExpansionSystem implements IExpansionSystem {
  public readonly id = `${uuid++}`;
  private beanManager: IBeanManager<IExpansionBeans>;

  constructor(private options: ExpansionSystemOptions) {

    const beans = [
      ManifestManager,
      ExtensionManager,
      ContextManager,
      ContributionKeywordManager,
      EventManager,
      HierarchyManager,
      Devtools
    ];

    const seeds = {
      [ExpansionSeedNames.Manifests]: options.manifests,
      [ExpansionSeedNames.ManifestAssertionOptions]: options.assertionOptions,
      [ExpansionSeedNames.ActivationEventDefinitions]: options.activationEventDefinitions,
      [ExpansionSeedNames.DevtoolsOptions]: options.devtoolsOptions,
      [ExpansionSeedNames.ParentExpansionSystem]: options.parent,
      [ExpansionSeedNames.ExpansionSystem]: this,
    };

    this.beanManager = new BeanManager({ seeds, beans });

    this.beanManager.init();
  }

  async activate(name: string, context?: Record<string, any>, repeat?: boolean): Promise<void> {
    return this.beanManager.getBean(ExpansionFeatureNames.ExtensionManager).activate(name, context, repeat);
  }

  deactivate(name: string) {
    return this.beanManager.getBean(ExpansionFeatureNames.ExtensionManager).deactivate(name);

  }

  getExtension(name: string): any {
    return this.beanManager.getBean(ExpansionFeatureNames.ExtensionManager).getApi(name);
  }

  getExtensionContext<T extends IExpansionBaseContext = IExpansionBaseContext>(name: string): T {
    return this.beanManager.getBean(ExpansionFeatureNames.ContextManager).getActivateContext(name) as T;
  }

  addHierarchy(es: IExpansionSystem) {
    return this.beanManager.getBean(ExpansionFeatureNames.HierarchyManager).add(es);
  }

  removeHierarchy(es: IExpansionSystem) {
    return this.beanManager.getBean(ExpansionFeatureNames.HierarchyManager).remove(es);
  }

  getContextInfo() {
    return this.beanManager.getBean(ExpansionFeatureNames.HierarchyManager).getContextInfo();
  }

  setContextInfo(info: Record<string, any>) {
    return this.beanManager.getBean(ExpansionFeatureNames.HierarchyManager).setContextInfo(info);
  }

  getDevtools(): IExpansionDevtools {
    return this.beanManager.getBean(ExpansionFeatureNames.Devtools);
  }

  destroy() {
    this.beanManager.destructor();
  }

  get parent() {
    return this.options.parent;
  }

  dynamicAddManifest(manifests: IExpansionManifest[]): void {
    return this.beanManager.getBean(ExpansionFeatureNames.ManifestManager).dynamicAddManifest(manifests)
  }
}
