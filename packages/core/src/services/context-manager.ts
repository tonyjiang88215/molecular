import { IDisposer } from '@q7/shared';
import type { IContributeDefinitions, IExpansionManifest } from '../manifests';
import type { IContributionManager, IContributionKeywordImpl } from './contribution-keyword-manager';
import type { IManifestManager } from './manifest-manager';
import type { IExtensionManager } from './extension-manager';
import type { IHierarchyManager } from './hierarchy-manager';
import { ExpansionLifecycleEventNames, IEventManager } from './event-manager';

import { Autowired, Bean, ExpansionSeedNames } from '../beans';
import { ExpansionFeatureNames } from './constants';
import { fail } from './manifest-manager';
import {
  ExpansionManifestAssertionOptions,
  assertContributionKeywordIsDefined,
  assertContributionKeywordNameIsValid,
} from '../assertions';
import { IExpansionSystem } from '../expansion-system';
import { IContributionPointDefinitions } from '../manifests';
import { mergeContributes } from '../util';


/**
 * 扩展系统的基础上下文对象
 */
export interface IExpansionBaseContext {
  /**
   * 通过 registerContributionKeyword 可以注册新 keyword 处理函数。
   * 允许其他插件通过对应 keyword 进行贡献点的声明及扩展。
   *
   * @param name
   * @param impl
   */
  registerContributionKeyword(name: string, impl: IContributionKeywordImpl): IDisposer;

  /**
   * 通过getContributionKeywordImpl获取keyword的impl实例, 只有能获取到当前插件声明的keyword
   * @param name
   */
  getContributionKeywordImpl<T extends IContributionKeywordImpl>(name: string): T | undefined;

  /**
   * 根据 name 获取其他 extension 实例
   * @param name
   */
  getExtension<T = any>(name: string): T;

  /**
   * 获取嵌套插件系统的上下文共享信息
   */

  // getContextInfo(): Record<string, any>

  /**
   * 卸载时会自动执行的函数，可以将 disposable 的函数放进来
   * @param disposer
   */
  addDisposer(disposer: IDisposer): void;

  /**
   * 动态添加贡献点，在有些场景中，我们可能会根据模型或数据
   * 动态生成贡献点，这部分贡献点是没办法在静态 manifest 中进行描述的
   */
  addContributionPoints(contributionPoints: IContributionPointDefinitions): void;

  /**
   * 动态删除贡献点
   * @param keyword
   * @param name
   */
  removeContributionPoints(keyword: string, name: string): void;

  /**
   * 动态添加贡献
   */
  addContributes(contributes: IContributeDefinitions): void;

  /**
   * 动态删除贡献
   * @param keyword
   * @param name
   */
  removeContributes(keyword: string, name: string): void;
  //setStage(stage: string): this
}

export interface IRequestContributionContext {
  readonly contributor: string
  // readonly contributionPoint: string
  // readonly contributeTo: string
  readonly dependencies: string[]
}


export interface IContextManager {
  /**
   * 根据 name 获取对应的 activationContext，应该在组件加载时调用
   * @param name
   */
  getActivateContext(name: string): IExpansionBaseContext;

  /**
   * 根据 name 销毁对应的 activationContext，应该在组件卸载时调用
   * @param name
   */
  destroyActivateContext(name: string): void;

  /**
   * 根据 name 获取对应的注册扩展时的上下文对象，主要用于提供 name 检查
   * @param name
   * @param keyword
   */
  getRequestContributionContext(name: string, keyword: string): IRequestContributionContext;
}

@Bean(ExpansionFeatureNames.ContextManager)
export class ContextManager implements IContextManager {
  @Autowired(ExpansionSeedNames.ExpansionSystem) private es: IExpansionSystem;
  @Autowired(ExpansionSeedNames.ManifestAssertionOptions) private assertionOptions: ExpansionManifestAssertionOptions;
  @Autowired(ExpansionFeatureNames.ManifestManager) private manifestManager: IManifestManager;
  @Autowired(ExpansionFeatureNames.ExtensionManager) private extensionManager: IExtensionManager;
  @Autowired(ExpansionFeatureNames.ContributionKeywordManager) private contributionManager: IContributionManager;
  @Autowired(ExpansionFeatureNames.HierarchyManager) private hierarchyManager: IHierarchyManager;
  @Autowired(ExpansionFeatureNames.EventManager) private eventManager: IEventManager;

  private contextPool = new Map<string, ActivateContext>();
  private requestContributionContext = new Map<string, RequestContributionContext>();

  // private contributionImplContext = new Map<string, any>();

  getActivateContext(name: string): IExpansionBaseContext {
    if (!this.contextPool.has(name)) {
      const manifest = this.manifestManager.getManifest(name);
      const context = new ActivateContext({
        es: this.es,
        assertionOptions: this.assertionOptions,
        manifest: manifest,
        contributionManager: this.contributionManager,
        extensionManager: this.extensionManager,
        hierarchyManager: this.hierarchyManager,
        manifestManager: this.manifestManager,
        eventManager: this.eventManager,
      });

      if (manifest.dependencies) {
        const provideContexts = [];
        const addContext = (name: string, context: any) => {
          if (provideContexts.findIndex(x => x.name === name) > -1) {
            fail(`【参数错误】contextName: ${name} 重复定义`);
            return;
          }

          provideContexts.push({ name, context });
        };

        Object.keys(manifest.dependencies).forEach(dependent => {
          const dependentManifest = this.manifestManager.getManifest(dependent);
          if (dependentManifest.provideContext) {
            if (!dependentManifest.contextName) {
              fail(`【参数错误】插件${dependent} 设置了provideContext, 没有提供 contextName`);
            } else {
              const ctx = this.extensionManager.getContext(dependentManifest, name, context);
              addContext(dependentManifest.contextName, ctx);
            }
          }

          if (!dependentManifest.contributionKeywords || dependentManifest.contributionKeywords.length === 0) {
            return;
          }

          dependentManifest.contributionKeywords.forEach(({ name, contextName = name }) => {
            if (provideContexts.findIndex(x => x.name === contextName) > -1) {
              return;
            }

            // 如果依赖模块有 context，则追加到当前的 context 上
            let keywordContext = this.contributionManager.getContributionKeywordContext(name, manifest.name);
            if (keywordContext) {
              addContext(contextName, keywordContext);
            }
          });
        });

        provideContexts.forEach(({ name, context: c }) => {
          Object.defineProperty(context, name, {
            value: c,
            writable: false,
            configurable: false,
          });
        });
      }

      this.contextPool.set(name, context);
    }

    return this.contextPool.get(name);
  }

  destroyActivateContext(name: string): void {
    if (this.contextPool.has(name)) {
      this.contextPool.get(name).destructor();
      this.contextPool.delete(name);
    }
  }

  getRequestContributionContext(name: string, keyword: string): IRequestContributionContext {
    const key = `${name}-${keyword}`;
    if (!this.requestContributionContext.has(key)) {
      const manifest = this.manifestManager.getManifest(name);
      const context = new RequestContributionContext({
        manifest,
        keyword,
      });
      this.requestContributionContext.set(key, context);
    }
    return this.requestContributionContext.get(key);
  }
}

type ActivateContextOptions = {
  es: IExpansionSystem,
  manifest: IExpansionManifest,
  assertionOptions: ExpansionManifestAssertionOptions,
  contributionManager: IContributionManager,
  extensionManager: IExtensionManager,
  hierarchyManager: IHierarchyManager,
  manifestManager: IManifestManager,
  eventManager: IEventManager,
}

class ActivateContext implements IExpansionBaseContext {

  private stage;
  private disposers = [];

  constructor(private options: ActivateContextOptions) {
  }

  destructor() {
    this.disposers.forEach(disposer => disposer());
    this.disposers.length = 0;
  }

  getExpansionSystem(): IExpansionSystem {
    return this.options.es;
  }

  getExtension(name: string): any {
    if (!this.options.manifestManager.getAssertion().assertIsDependentValid(this.options.manifest.name, name)) {
      return;
    }

    return this.options.extensionManager.getApi(name);
  }

  // getContextInfo() {
  //   return this.options.hierarchyManager.getContextInfo();
  // }

  registerContributionKeyword(name: string, impl: IContributionKeywordImpl): IDisposer {
    if (!assertContributionKeywordNameIsValid(this.options.manifest.name, name, this.options.assertionOptions)) {
      return;
    }
    if (!assertContributionKeywordIsDefined(this.options.manifest, name)) {
      return;
    }

    const disposer =  this.options.contributionManager.implementContributionKeyword(name, impl);
    this.addDisposer(disposer);
    return disposer;
  }

  getContributionKeywordImpl<T extends IContributionKeywordImpl>(name: string): T | undefined {
    if (!assertContributionKeywordIsDefined(this.options.manifest, name)) {
      return;
    }
    return this.options.contributionManager.getContributionKeywordImpl<T>(name);
  }

  addDisposer(disposer: IDisposer) {
    this.disposers.push(disposer);
  }

  addContributionPoints(contributionPoints: IContributionPointDefinitions) {
    if(!this.options.manifestManager.getAssertion().assertManifestContributionPointsIsValid(this.options.manifest, contributionPoints)) {
      return;
    }

    if (this.options.manifest.dynamicContributionPoints) {
      this.options.manifest.dynamicContributionPoints = mergeContributes(this.options.manifest.dynamicContributionPoints, contributionPoints);
    } else {
      this.options.manifest.dynamicContributionPoints = contributionPoints;
    }
    if (this.stage != 'beforeActivate') {
      this.options.eventManager.dispatch(ExpansionLifecycleEventNames.onDynamicContributionPointsAdded, [this.options.manifest.name, contributionPoints]);
    }
  }

  addContributes(contributes: IContributeDefinitions) {
    if(!this.options.manifestManager.getAssertion().assertManifestContributeIsValid(this.options.manifest, contributes)) {
      return;
    }

    if (this.options.manifest.dynamicContributes) {
      this.options.manifest.dynamicContributes = mergeContributes(this.options.manifest.dynamicContributes, contributes);
    } else {
      this.options.manifest.dynamicContributes = contributes;
    }

    if(this.stage != 'beforeActivate') {
      this.options.eventManager.dispatch(ExpansionLifecycleEventNames.onDynamicContributesAdded, [this.options.manifest.name, contributes]);
    }
  }

  removeContributes(keywords: string, name: string) {
    const { dynamicContributes } = this.options.manifest
    const contributes = dynamicContributes && dynamicContributes[keywords];
    if (!contributes) {
      fail(`【参数错误】removeContributes ${keywords}不存在contribute:${name}`);
      return;
    }

    const removed = contributes.filter(x => x.name == name);
    this.options.manifest.dynamicContributes[keywords] = contributes.filter(x => x.name != name);

    if (this.stage != 'beforeActivate') {
      this.options.eventManager.dispatch(ExpansionLifecycleEventNames.onDynamicContributesRemoved, [this.options.manifest.name, { [keywords]: removed }]);
    }
  }

  removeContributionPoints(keywords: string, name: string): void {

    const { dynamicContributionPoints } = this.options.manifest
    const contributionPoints = dynamicContributionPoints && dynamicContributionPoints[keywords];
    if (!contributionPoints) {
      fail(`【参数错误】removeContributionPoints ${keywords}不存在contributionPoint:${name}`);
      return;
    }
    const removed = contributionPoints.filter(x => x.name == name);
    this.options.manifest.dynamicContributionPoints[keywords] = contributionPoints.filter(x => x.name != name);


    if(this.stage != 'beforeActivate') {
      this.options.eventManager.dispatch(ExpansionLifecycleEventNames.onDynamicContributionPointsRemoved, [this.options.manifest.name, { [keywords]: removed }]);
    }
  }

  setStage(stage: string): this {
    this.stage = stage;
    return this;
  }
}

type RequestContributionContextOptions = {
  manifest: IExpansionManifest,
  keyword: string,
}

class RequestContributionContext implements IRequestContributionContext {

  constructor(private options: RequestContributionContextOptions) {
  }

  // assertNameIsValid(contributedName: string): true | void {
  //   return assertNameIsValid(this.options.manifest.name, contributedName);
  // }

  get contributor() {
    return this.options.manifest.name;
  }

  // get contributionPoint() {
  //   return this.options.cpName;
  // }

  // get contributeTo() {
  //   return this.options.contributeTo
  // }

  get dependencies() {
    return Object.keys(this.options.manifest.dependencies);
  }
}
