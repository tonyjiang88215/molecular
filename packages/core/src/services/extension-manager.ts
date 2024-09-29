import { functionalized } from '@q7/shared';
import type { IContributeDefinitions, IExpansionManifest, IActivationEventDefinition, IContributionKeywordDefinition } from '../manifests';

import { Bean, Autowired, ExpansionSeedNames, PostConstruct, PreDestroy } from '../beans';
import { ExpansionFeatureNames } from './constants';
import { IContextManager, IExpansionBaseContext } from './context-manager';
import { ExpansionLifecycleEventNames, IEventManager } from './event-manager';
import { IManifestManager } from './manifest-manager';
import type { IContributionManager, IContributionKeywordImpl } from './contribution-keyword-manager';

import { makePrioritySequence } from '../helpers';
import { assertActivationEventIsDefined } from '../assertions';


/**
 * 扩展实例需要实现的接口，主要需要实现以下两个生命周期函数：
 *
 *  - activate 扩展被激活的生命周期
 *  - deactivate 扩展被卸载的生命周期
 */
export interface IExpansionImplement<T = any, ContextProvider = any> {
  /**
   * 在插件激活之前，如果存在动态贡献点 和 贡献，可以在这个阶段进行补充
   * @param ctx
   */
  beforeActivate?(ctx: IExpansionBaseContext): void;

  /**
   * 插件被激活时的入口函数，在扩展中，所有对主系统的互动，都需要在 activate 生命周期中，
   * 如果插件需要提供 api，则需要作为 activate 函数的返回值
   */
  activate(ctx: IExpansionBaseContext): T | Promise<T>;

  /**
   * 在一个 activationEvent 的所有插件安装完成后执行
   * @param ctx
   */
  postActivated?(ctx: IExpansionBaseContext): void;

  /**
   * 插件被卸载时的入口函数，在这里通常要卸载事件的注册、清理使用的内存等等
   * 对于提供了 Contribution Point 的插件来说，这里的处理往往更为复杂
   */
  deactivate?(ctx?: IExpansionBaseContext): void;

  /**
   * 获取keyword的impl
   * @param keyword
   * @param ctx
   */
  getContributionKeyword?(keyword: IContributionKeywordDefinition, ctx: IExpansionBaseContext): IContributionKeywordImpl;

  /**
   * 获取context, 主要用于不提供keyword，只提供context的情况
   *
   * @param contributor
   * @param ctx
   */
  getContext?(contributor: string, ctx: IExpansionBaseContext): ContextProvider;
}


export interface IExtensionManager {
  /**
   * 按照 activationEvent 寻找应该被安装的扩展
   * @param activationEvent
   */
  activate(activationEvent: string, context?: Record<string, any>, repeat?: boolean): Promise<void>

  /**
   * 按照 activationEvent 寻找应该被卸载的扩展
   * @param activationEvent
   */
  deactivate(activationEvent: string): void

  /**
   * 获取 extension 暴露的 api 对象
   * @param name
   */
  getApi(name: string): any

  /**
   * 根据 manifest 分析安装依赖顺序
   * @param manifests
   */
  analysisActivateWaterfall(manifests: IExpansionManifest[]): string[][]

  /**
   * 获取插件实例
   * @param name
   */
  getImpl(name: string): IExpansionImplement

  /**
   * 获取挂载在插件上的 context provider
   * @param manifest
   * @param contributor
   * @param ctx
   */
  getContext(manifest: IExpansionManifest, contributor: string, ctx: IExpansionBaseContext): any
}

@Bean(ExpansionFeatureNames.ExtensionManager)
export class ExtensionManager implements IExtensionManager {

  @Autowired(ExpansionSeedNames.Manifests) private manifests: IExpansionManifest[];
  @Autowired(ExpansionSeedNames.ActivationEventDefinitions) private activationEventDefinitions: IActivationEventDefinition[];
  @Autowired(ExpansionFeatureNames.ManifestManager) private manifestManager: IManifestManager;
  @Autowired(ExpansionFeatureNames.ContextManager) private contextManager: IContextManager;
  @Autowired(ExpansionFeatureNames.EventManager) private eventManager: IEventManager;
  @Autowired(ExpansionFeatureNames.ContributionKeywordManager) private contributionManager: IContributionManager;

  private impls: Record<string, IExpansionImplement> = {};
  private apis: Record<string, any> = {};
  private activated: Record<string, boolean> = {};

  private activtedEvents: string[] = [];

  @PostConstruct
  private postConstruct() {
  }

  @PreDestroy
  private preDestroy() {
    this.apis = undefined;
  }

  getApi(name: string): any {
    return this.apis?.[name];
  }

  async activate(activationEvent: string, context?: Record<string, any>, repeat = false) {
    if (!assertActivationEventIsDefined(this.activationEventDefinitions, activationEvent)) {
      return;
    }

    if (!repeat && this.activtedEvents.includes(activationEvent)) {
      return;
    }

    !repeat && this.activtedEvents.push(activationEvent);
    const manifests = this.getManifestByActivationEvents(activationEvent, context);
    if (manifests.length === 0) {
      return;
    }

    await this.installExtensions(manifests);
  }

  deactivate(activationEvent: string) {
    if (!assertActivationEventIsDefined(this.activationEventDefinitions, activationEvent)) {
      return;
    }
    if (this.activtedEvents[this.activtedEvents.length - 1] !== activationEvent) {
      return;
    }
    this.activtedEvents = this.activtedEvents.filter(name => name !== activationEvent);
    const manifests = this.getManifestByDeactivationEvents(activationEvent);
    if (manifests.length === 0) {
      return;
    }
    this.uninstallExtensions(manifests);
  }

  private async installExtensions(manifests: IExpansionManifest[]) {
    const waterfalls = this.analysisActivateWaterfall(manifests);
    await this.loadingWaterfalls(waterfalls);
    this.internalPostActivated(manifests);
  }

  private async uninstallExtensions(manifests: IExpansionManifest[]) {
    const waterfalls = this.analysisActivateWaterfall(manifests);
    // 按照waterfall逆序卸载插件
    waterfalls.reverse().forEach(names => {
      names.reverse().forEach(name => {
        if (manifests.findIndex(x => x.name === name) > -1) {
          this.internalDeactivate(this.manifestManager.getManifest(name));
        }
      });
    });
  }

  /**
   * 根据 manifest 中的依赖关系，生成激活的先后顺序，例如：
   *   b      c
   *   \     /
   *    \   d
   *     \ /
   *      a
   *
   * 分析的结果应该是：
   * [
   *   ['b', 'c'],
   *   ['d'],
   *   ['a']
   * ]
   *
   * 数组第一层表示加载的顺序，数据第二层表示当前加载过程中可以并行的扩展
   *
   * @param manifests
   * @private
   */
  analysisActivateWaterfall(manifests: IExpansionManifest[]): string[][] {
    return makePrioritySequence(manifests, Object.keys(this.activated));
  }

  getImpl(name: string): IExpansionImplement {
    return this.impls[name];
  }

  public getContext(manifest: IExpansionManifest, contributor: string, ctx: IExpansionBaseContext) {
    const impl = this.impls[manifest.name];
    if (impl.getContext) {
      return impl.getContext(contributor, ctx);
    }

    return;
  }

  /**
   * 根据激活事件，获取这个阶段需要加载的扩展
   * @param name
   * @private
   */
  private getManifestByActivationEvents(name: string, context?: Record<string, any>): IExpansionManifest[] {
    return this.manifestManager.getShouldActivates(name).filter(x => {
      const [manifest, activationEvent] = x;
      if (this.activated[manifest.name]) {
        return false;
      }
      const { when } = activationEvent;
      return this.exprIsBoolean(when, context);
    }).map(x => x[0]);
  }

  private exprCache = new Map<string, Function>();
  private exprIsBoolean(expr: string, context?: Record<string, any>): boolean {
    if (!expr) {
      return true;
    }
    if (expr === 'true') {
      return true;
    }
    if (expr === 'false') {
      return false;
    }
    if (this.exprCache.has(expr)) {
      return this.exprCache.get(expr)(context);
    }
    const func = functionalized(expr);
    this.exprCache.set(expr, func);
    return func(context);
  }

  /**
   * 根据激活事件，获取这个阶段需要卸载的扩展
   * @param name
   * @private
   */
  private getManifestByDeactivationEvents(name: string): IExpansionManifest[] {
    return this.manifestManager.getShouldDeactivates(name).filter(manifest => this.activated[manifest.name]);
  }

  /**
   * 根据 manifest 生成的 waterfall（加载优先级），生成 promise 执行链
   * @param waterfalls
   * @private
   */
  private loadingWaterfalls(waterfalls: string[][]) {
    return waterfalls.reduce((arr, names) => {
      return new Promise((resolve, reject) => {
        arr
          .then(() => {
            // console.log(`分批加载 ${names}`);
            Promise.all(
              names.map(name => (async () => {
                try {
                  const manifest = this.manifestManager.getManifest(name);
                  await this.internalActivate(manifest);
                } catch (e) {
                  console.error(e);
                  throw e;
                }
              })()),
            )
              .then((args) => {
                // console.log(`分批加载 ${names} 完毕!`);
                resolve();
              })
              .catch((error) => {
                reject(error);
              });

          })
          .catch((error) => {
            reject(error);
          });

      });
    }, Promise.resolve());
  }

  private async internalActivate(manifest: IExpansionManifest) {
    // 已经安装过了 直接跳过
    if(this.activated[manifest.name]){
      return
    }
    const impl = await this.loadImpl(manifest);
    this.impls[manifest.name] = impl;

    const ctx = this.contextManager.getActivateContext(manifest.name);

    // 如果插件实现了 beforeActivate，则先调用，确保动态的贡献和贡献点可以被收集到
    // @ts-ignore
    impl.beforeActivate?.(ctx.setStage('beforeActivate'));

    this.eventManager.dispatch(ExpansionLifecycleEventNames.beforeExtensionActivate, manifest.name);
    if (manifest.contributionKeywords && impl.getContributionKeyword) {
      manifest.contributionKeywords.forEach(x => {
        const keywordImpl = impl.getContributionKeyword(x, ctx);
        const contextName = x.contextName || x.name;
        const disposer = this.contributionManager.implementContributionKeyword(x.name, keywordImpl);
        if (!Object.prototype.hasOwnProperty.call(ctx, contextName)) {
          Object.defineProperty(ctx, contextName, {
            value: this.contributionManager.getContributionKeywordContext(x.name, manifest.name),
            configurable: false,
            writable: false
          })
        }
        ctx.addDisposer(disposer);
      });
    }

    // @ts-ignore
    const api = await impl.activate(ctx.setStage('activate'));
    if (api) {
      this.apis[manifest.name] = api;
    }
    this.eventManager.dispatch(ExpansionLifecycleEventNames.onExtensionActivated, manifest.name);
    this.activated[manifest.name] = true;
  }

  private async loadImpl(manifest: IExpansionManifest): Promise<IExpansionImplement> {
    if(manifest.localImpl) {
      return manifest.localImpl();
    }

    if(manifest.remoteImpl) {
      return (await manifest.remoteImpl());
    }

    return (await this.dynamicImport(manifest.remoteEntry)).default;

  }

  private internalPostActivated(manifests: IExpansionManifest[]) {
    manifests.filter(t=>this.impls[t.name]).forEach(manifest => {
      this.impls[manifest.name].postActivated?.(this.contextManager.getActivateContext(manifest.name));
    });
  }

  /**
   * todo 需要按照依赖关系反向卸载
   */
  private internalDeactivate(manifest: IExpansionManifest) {
    this.eventManager.dispatch(ExpansionLifecycleEventNames.beforeExtensionDeactivate, manifest.name);
    this.impls[manifest.name]?.deactivate?.(this.contextManager.getActivateContext(manifest.name));
    if (this.apis[manifest.name]) {
      delete this.apis[manifest.name];
    }
    this.eventManager.dispatch(ExpansionLifecycleEventNames.onExtensionDeactivated, manifest.name);
    this.contextManager.destroyActivateContext(manifest.name);
    this.activated[manifest.name] = false;
  }

  /**
   * 为了避免 webpack 将 import 关键字翻译，所以我们通过自定义函数
   * 来实现 es6 原生的 async import
   * @param url
   * @private
   */
  private dynamicImport(url: string): Promise<{ default: IExpansionImplement }> {
    return (new Function('url', `return import('${url}')`))(url);
  }
}
