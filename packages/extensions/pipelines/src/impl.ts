import {
  createAsyncWaterfallHook,
  createCommonHook,
  createConcurrentHook,
  createHookManager,
  createWaterfallHook,
  IDestructible,
  IDisposer,
  IHooks,
} from './pipelines';

import {
  fail, IContributeDefinition,
  IRequestContributionContext,
  IExpansionKeywordDevtools,
  ContributionKeywordBaseImpl, reportExecutedWrapper,
} from '@tjmol/core';
import {
  IPipelineContributionPointDefinition,
  IPipelinesContext,
  PipelineType,
} from './declare';

export class PipelinesImplement extends ContributionKeywordBaseImpl<IPipelineContributionPointDefinition> implements IDestructible {
  private hookManager = createHookManager<Record<string, IHooks>>();

  /**
   * 贡献者的销毁函数
   * {
   *   `${contributor}`: IDisposers[]
   * }
   * @private
   */
  private contributionDisposers: Record<string, IDisposer[]> = {};
  private contributionPointDisposers: Record<string, IDisposer[]> = {};


  destructor(): void {
    Object.keys(this.contributionDisposers).forEach(name => {
      this.cleanContribution(name);
    });
  }

  beforeRequestContributionPoint(ctx: IRequestContributionContext, definitions: IPipelineContributionPointDefinition[]) {
    for (let definition of definitions) {
      if (!definition.type) {
        fail(`【${this.name}检查失败】插件 ${ctx.contributor} 的 name = ${name} 的贡献点声明没有定义类型`);
        return false;
      }
    }
    return true;
  }

  /**
   * 贡献点声明成功后，创建对应的生命周期
   * @param ctx
   * @param definitions
   */
  afterRequestContributionPointSucceed(ctx: IRequestContributionContext, definitions: IPipelineContributionPointDefinition[]) {
    this.contributionPointDisposers[ctx.contributor] = this.requestLifecycleContribution(definitions);
  }

  /**
   * 贡献点声明撤销后，移除对应的生命周期
   * @param ctx
   * @param definitions
   */
  afterRequestRevokeContributionPointSucceed(ctx: IRequestContributionContext, definitions: IPipelineContributionPointDefinition[]) {
    this.contributionPointDisposers[ctx.contributor]?.forEach(disposer => disposer && disposer());
    delete this.contributionPointDisposers[ctx.contributor];
  }


  /**
   * 撤销贡献后，移除相应的生命周期监听函数
   * @param ctx
   * @param definitions
   */
  afterRequestRevokeContributionSucceed(ctx: IRequestContributionContext, definitions: IContributeDefinition[]) {
    this.cleanContribution(ctx.contributor);
  }

  getContext(contributor: string): IPipelinesContext {
    return {
      execute: (name: string, payload) => {
        if (!this.isContributionPointValid(contributor, name)) {
          return;
        }

        if (this.hookManager.hasHooks(name)) {
          return this.hookManager.getHooks(name).execute(payload) as any;
        }
      },

      register: (name: string, handler: (payload: any) => any): IDisposer => {
        const contributeTo = this.resolveContributionPointName(contributor, name);
        if (!contributeTo) {
          return () => {};
        }

        const def = this.findContributionPointDefinition(contributeTo);
        if (!def) {
          return () => {};
        }
        // @ts-ignore
        if (process.env.NODE_ENV !== 'production') {
          if (def && (def.type == 'waterfall' || def.type == 'asyncWaterfall')) {
            handler = checkWaterfallMustReturn(contributor, name, handler);
          }
        }

        if (this.devtools.isAlive()) {
          handler = reportExecutedWrapper(this.devtools, name, handler);
        }

        const disposer = this.hookManager.getHooks(contributeTo)?.append(handler);
        this.addContributeDisposer(contributor, disposer);

        return disposer;
      },

    };
  };


  /**
   * 贡献一个新的生命周期
   * @private
   * @param definitions
   */
  private requestLifecycleContribution(definitions: IContributeDefinition[]): IDisposer[] {
    return definitions.map(configure => this.createLifecycle(configure.name, configure.type));
  }


  private createLifecycle(name: string, type: PipelineType): IDisposer {
    if (this.hookManager.hasHooks(name)) {
      fail(`生命周期 ${name} 已经存在，请确认`);
      return () => {};
    }

    const removeHooks = this.hookManager.addHooks(name, this.createHooks(type));

    return () => {
      this.hookManager.getHooks(name).destructor();
      removeHooks();
    };
  }

  private createHooks(type: PipelineType): IHooks {
    switch (type) {
      case 'common':
        return createCommonHook();

      case 'concurrent':
        return createConcurrentHook();

      case 'waterfall':
        return createWaterfallHook();

      case 'asyncWaterfall':
        return createAsyncWaterfallHook();
    }
  }

  private addContributeDisposer(contributor: string, disposer) {
    if (!this.contributionDisposers[contributor]) {
      this.contributionDisposers[contributor] = [];
    }
    this.contributionDisposers[contributor].push(disposer);
  }

  private cleanContribution(name: string) {
    this.contributionDisposers[name]?.forEach(disposer => disposer());
    this.contributionDisposers[name] = [];
  }
}

function checkWaterfallMustReturn(contributor: string, name: string, handler) {
  return (payload) => {
    const returned = handler(payload);

    if(returned === undefined && returned !== payload) {
      fail(`【lifecycles执行错误】${contributor} 实现的 ${name} 返回了 undefined，waterfall 类型函数必须保持相同类型的返回值`);
    }

    return returned;
  };
}
