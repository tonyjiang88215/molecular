import { IDisposer } from '@q7/shared';

import { Autowired, Bean, ExpansionSeedNames, PostConstruct, PreDestroy } from '../beans';
import { ExpansionFeatureNames } from './constants';
import { ExpansionLifecycleEventNames, IEventManager } from './event-manager';
import { ExpansionManifestAssertionOptions, IManifestManager } from './manifest-manager';
import { IContextManager, IRequestContributionContext } from './context-manager';
import { IExpansionDevtools, IExpansionKeywordDevtools } from './devtools';
import { assertContributionPointExists, fail } from '../assertions';
import {
  IContributeDefinition,
  IContributeDefinitions,
  IContributionKeywordDefinition,
  IContributionPointDefinition,
  IContributionPointDefinitions,
} from '../manifests';
import { mergeContributes } from '../util';


export type ContributionKeywordInitOptions = {
  devtools: IExpansionKeywordDevtools,
  assertionOptions?: ExpansionManifestAssertionOptions,
}

export type ContributionKeywordDevtoolsOverview = {
  definition: IContributionKeywordDefinition,
  usage: {
    name: string,
    description: string,
    provider: string,
    consumers?: { dynamics?: string, name: string, description: string, consumer: string, currentValue?: any, impl?: any }[]
  }[],
}

/**
 * 扩展实现 ContributionKeyword 时，所需要实现的接口
 */
export interface IContributionKeywordImpl {
  /**
   * 初始化，插件系统中有一些基本信息会通过 init 接口与 keywordImpl 进行同步
   */
  init?(options: ContributionKeywordInitOptions): void

  /**
   * 当扩展对贡献点提供扩展时，通过 requestContribution 传递参数
   * manifest.contributes 用来定义贡献点的扩展
   * @param ctx
   * @param definitions
   */
  requestContribution(ctx: IRequestContributionContext, definitions: IContributeDefinition[]): void

  /**
   * 当扩展准备取消已经提供的扩展时，通过 requestRevokeContribution 进行撤回通知
   * @param ctx
   * @param definitions
   */
  requestRevokeContribution(ctx: IRequestContributionContext, definitions: IContributeDefinition[]): void

  /**
   * 当扩展定义新的贡献点时，通过 requestContributionPoint 传递参数
   * manifest.contributionPoints 用来定义贡献点
   * @param ctx
   * @param definitions
   */
  requestContributionPoint?(ctx: IRequestContributionContext, definitions: IContributionPointDefinition[]): void

  /**
   * 当扩展取消贡献点时，通过 requestRevokeContributionPoint 进行撤回通知
   * @param ctx
   * @param definitions
   */
  requestRevokeContributionPoint?(ctx: IRequestContributionContext, definitions: IContributionPointDefinition[]): void

  /**
   * 如果扩展定义了 provideContext = true，则通过 getContext 获取挂载的全局对象
   */
  getContext?(contributor: string): any

  /**
   * 为调试工具提供数据，最终结果以 console.table 进行展示
   */
  // __devtools_getOverviewTables?(): ContributionKeywordDevtoolsOverview

  /**
   * 为调试工具提供实现代码
   * @param contributor
   * @param name
   */
  // __devtools_getImpl?(contributor: string, name: string): any

  /**
   * 为调试工具提供当前信息
   * @param contributor
   * @param name
   */
  // __devtools_getCurrentInfo?(contributor: string, name: string): any

  /**
   * 销毁函数
   */
  destructor?(): void
}

export interface IContributionManager {
  /**
   * 注册 keyword 实现
   * @param name
   * @param impl
   */
  implementContributionKeyword(name: string, impl: IContributionKeywordImpl): IDisposer

  /**
   * contributor 申请一个 name 提供的 contributionKeyword 的 context
   * @param keyword
   * @param contributor
   */
  getContributionKeywordContext(keyword: string, contributor: string): any | void;

  /**
   * 获取 keyword 实现
   * @param keyword
   */
  getContributionKeywordImpl<T extends IContributionKeywordImpl>(keyword: string): T | undefined;
}

@Bean(ExpansionFeatureNames.ContributionKeywordManager)
export class ContributionKeywordManager implements IContributionManager {
  @Autowired(ExpansionSeedNames.ManifestAssertionOptions) assertionOptions: ExpansionManifestAssertionOptions;
  @Autowired(ExpansionFeatureNames.ManifestManager) private manifestManager: IManifestManager;
  @Autowired(ExpansionFeatureNames.EventManager) private eventManager: IEventManager;
  @Autowired(ExpansionFeatureNames.ContextManager) private contextManager: IContextManager;
  @Autowired(ExpansionFeatureNames.Devtools) private devtools: IExpansionDevtools;

  private contributionKeywordDefinitions: Record<string, any> = {};
  private contributionKeywordImpls: Record<string, IContributionKeywordImpl> = {};

  private disposers = [];

  @PostConstruct
  private postConstruct() {
    this.disposers.push(
      this.eventManager.on(ExpansionLifecycleEventNames.beforeExtensionActivate, this.beforeExtensionActivateHandler),
      this.eventManager.on(ExpansionLifecycleEventNames.onExtensionActivated, this.onExtensionActivatedHandler),
      this.eventManager.on(ExpansionLifecycleEventNames.onExtensionDeactivated, this.onExtensionDeactivatedHandler),
      this.eventManager.on(ExpansionLifecycleEventNames.onDynamicContributesAdded, this.onDynamicContributesAdded),
      this.eventManager.on(ExpansionLifecycleEventNames.onDynamicContributionPointsAdded, this.onDynamicContributionPointsAdded),
      this.eventManager.on(ExpansionLifecycleEventNames.onDynamicContributesRemoved, this.onDynamicContributesRemoved),
      this.eventManager.on(ExpansionLifecycleEventNames.onDynamicContributionPointsRemoved, this.onDynamicContributionPointsRemoved)
    );
  }

  @PreDestroy
  private preDestroy() {
    this.disposers.forEach(disposer => {
      disposer();
    });
    this.disposers.length = 0;
  }

  private onDynamicContributesAdded = ([name, contributes]) => {
    this.addContributes(name, contributes);
  }

  private onDynamicContributionPointsAdded = ([name, contributionPoints]) => {
    this.addContributionPoints(name, contributionPoints);
  }

  private onDynamicContributesRemoved = ([contributor, def]) => {
    this.removeContributes(contributor, def);
  }

  private onDynamicContributionPointsRemoved = ([contributor, def]) => {
    this.removeContributionPoints(contributor, def);
  }

  private beforeExtensionActivateHandler = name => {
    const manifest = this.manifestManager.getManifest(name);

    if (manifest.contributionPoints || manifest.dynamicContributionPoints) {
      const mergedContributionPoints = mergeContributes(manifest.contributionPoints ,manifest.dynamicContributionPoints);
      this.addContributionPoints(name, mergedContributionPoints);
    }

    if (manifest.contributes || manifest.dynamicContributes) {
      const mergedContributes = mergeContributes(manifest.contributes ,manifest.dynamicContributes);
      this.addContributes(name, mergedContributes);
    }
  };

  private onExtensionActivatedHandler = name => {
    const manifest = this.manifestManager.getManifest(name);

    if (manifest.contributionKeywords) {
      manifest.contributionKeywords.forEach(keywordDefinition => {
        this.contributionKeywordDefinitions[keywordDefinition.name] = keywordDefinition;
        this.devtools.notifyContributionKeywordAdded(name, keywordDefinition);
      });
    }
  };

  private onExtensionDeactivatedHandler = name => {
    const manifest = this.manifestManager.getManifest(name);

    if(manifest.contributes) {
      this.removeContributes(name, manifest.contributes);
    }

    if(manifest.contributionPoints) {
      this.removeContributionPoints(name, manifest.contributionPoints);
    }
  }

  /**
   * 通知 keyword 实现者，注册新的贡献点
   * @param contributor
   * @param contributionPoints
   * @private
   */
  private addContributionPoints(contributor: string, contributionPoints: IContributionPointDefinitions) {
    Object.entries(contributionPoints).forEach(([keyword, definitions]) => {
      if (!assertContributionPointExists(this.contributionKeywordImpls, keyword)) {
        return;
      }

      this.requestContributionPoint(contributor, keyword, definitions);
    });

    this.devtools.notifyContributionPointAdded(contributor, contributionPoints);
  }

  /**
   * 通知 keyword 实现者，移除贡献点
   * @param contributor
   * @param contributionPoints
   * @private
   */
  private removeContributionPoints(contributor: string, contributionPoints: IContributionPointDefinitions) {
    Object.entries(contributionPoints).forEach(([keyword, definitions]) => {
      this.requestRevokeContributionPoint(contributor, keyword, definitions);
    });
  }

  /**
   * 通知 keyword 实现者，注册新的贡献
   * @param contributor
   * @param contributes
   * @private
   */
  private addContributes(contributor: string, contributes: IContributeDefinitions) {
    Object.entries(contributes).forEach(([keyword, configurations]) => {
      if (!assertContributionPointExists(this.contributionKeywordImpls, keyword)) {
        return;
      }

      this.requestContribute(contributor, keyword, configurations);
    });

    this.devtools.notifyContributeAdded(contributor, contributes);
  }

  /**
   * 通知 keyword 实现者，移除贡献
   * @param name
   * @param contributes
   * @private
   */
  private removeContributes(name: string, contributes: IContributeDefinitions) {
    Object.entries(contributes).forEach(([keyword, configurations]) => {
      this.requestRevokeContribute(name, keyword, configurations);
    });
  }

  /**
   * 注册贡献
   * @param contributor
   * @param keyword
   * @param definitions
   * @private
   */
  private requestContribute(contributor: string, keyword: string, definitions: IContributeDefinition[]) {
    const ctx = this.contextManager.getRequestContributionContext(contributor, keyword);

    this.contributionKeywordImpls[keyword].requestContribution(ctx, definitions);
  }

  /**
   * 撤销贡献
   * @param contributor
   * @param keyword
   * @param definitions
   * @private
   */
  private requestRevokeContribute(contributor: string, keyword: string, definitions: IContributeDefinition[]) {
    const ctx = this.contextManager.getRequestContributionContext(contributor, keyword);

    this.contributionKeywordImpls[keyword].requestRevokeContribution(ctx, definitions);
  }


  /**
   * 注册贡献点
   * @param contributor
   * @param keyword
   * @param definitions
   * @private
   */
  private requestContributionPoint(contributor: string, keyword: string, definitions: IContributionPointDefinition[]) {
    const ctx = this.contextManager.getRequestContributionContext(contributor, keyword);

    this.contributionKeywordImpls[keyword].requestContributionPoint(ctx, definitions);
  }

  /**
   * 撤销贡献点
   * @param contributor
   * @param keyword
   * @param definitions
   * @private
   */
  private requestRevokeContributionPoint(contributor: string, keyword: string, definitions: IContributionPointDefinition[]) {
    const ctx = this.contextManager.getRequestContributionContext(contributor, keyword);

    this.contributionKeywordImpls[keyword].requestRevokeContributionPoint(ctx, definitions);
  }

  public implementContributionKeyword(name: string, impl: IContributionKeywordImpl): IDisposer {
    if (this.contributionKeywordImpls[name]) {
      throw new Error(`${name} 已经被实现`);
    }

    const devtools = this.devtools.getKeywordDevtools(name);

    this.contributionKeywordImpls[name] = impl;
    impl.init?.({
      assertionOptions: this.assertionOptions,
      devtools: devtools
    });

    const disposers = [];
    // if (impl.getContext) {
    //   disposers.push(
    //     this.contextManager.registerContributionImplContext(name, impl.getContext),
    //   );
    // }

    disposers.push(
      () => {
        impl.destructor?.();
      },
      () => {
        delete this.contributionKeywordImpls[name];
      },
    );

    return () => {
      disposers.forEach(disposer => disposer());
      disposers.length = 0;
    };
  }

  public getContributionKeywordContext(keyword: string, contributor: string): any | void {
    if (!this.contributionKeywordImpls[keyword]) {
      fail(`contributionKeyword ${keyword} 未定义`);
      return;
    }

    const impl = this.contributionKeywordImpls[keyword];
    if (impl.getContext) {
      return impl.getContext(contributor);
    }

    return undefined;
  }

  public getContributionKeywordImpl<T extends IContributionKeywordImpl>(keyword: string): T | undefined {
    return this.contributionKeywordImpls[keyword] as T;
  }

}

