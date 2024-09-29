import {
  IContributeDefinition,
  IContributionKeywordDefinition,
  IContributionPointDefinition,
  ContributionPointDynamicSplitter,
} from '../manifests';

import {
  fail,
  IExpansionBaseContext,
  IExpansionKeywordDevtools,
  IContributionKeywordImpl,
  IRequestContributionContext,
  ContributionKeywordInitOptions,
  ContributionKeywordDevtoolsOverview,
} from '../services';


/**
 * 贡献关键字基类
 * 插件系统贡献声明是显式定义的，为了在运行时也可以做到按照 manifest
 * 进行检查，我们通常需要在插件安装时，来根据 manifest 进行依赖的贡献点
 * 和插件的检查。
 * 由于每个实现了 contributionKeywords 的插件，都需要做类似的事情，
 * 所以我们抽取了基类，来简化这部分的开发工作
 */
export interface IContributionKeywordBaseImpl<CPD extends IContributionPointDefinition, CD extends IContributeDefinition = IContributeDefinition> extends IContributionKeywordImpl {
  /**
   * 在注册贡献点之前，可以在这里进行前置检查，检查通过必须返回 true，返回 false 或不返回都认为不通过
   * @param ctx
   * @param definitions
   */
  beforeRequestContributionPoint?(ctx: IRequestContributionContext, definitions: CPD[]): boolean;

  /**
   * 在贡献点注册成功后，初始化逻辑可以在这里执行
   * @param ctx
   * @param definitions
   */
  afterRequestContributionPointSucceed?(ctx: IRequestContributionContext, definitions: CPD[]): void;

  /**
   * 在注销贡献点之前，可以在这里进行前置检查，检查通过必须返回 true，返回 false 或不返回都认为不通过
   * @param ctx
   * @param definitions
   */
  beforeRequestRevokeContributionPoint?(ctx: IRequestContributionContext, definitions: CPD[]): boolean;

  /**
   * 在注销贡献点之后，相应的清理操作可以在这里执行
   * @param ctx
   * @param definitions
   */
  afterRequestRevokeContributionPointSucceed?(ctx: IRequestContributionContext, definitions: CPD[]): void;

  /**
   * 在注册贡献之前，可以在这里进行前置检查，检查通过必须返回 true，返回 false 或不返回都认为不通过
   * @param ctx
   * @param definitions
   */
  beforeRequestContribution?(ctx: IRequestContributionContext, definitions: CD[]): boolean;

  /**
   * 在贡献注册成功后，初始化逻辑可以在这里执行
   * @param ctx
   * @param definitions
   */
  afterRequestContributionSucceed?(ctx: IRequestContributionContext, definitions: CD[]): void;

  /**
   * 在注销贡献之前，可以在这里进行前置检查，检查通过必须返回 true，返回 false 或不返回都认为不通过
   * @param ctx
   * @param definitions
   */
  beforeRequestRevokeContribution?(ctx: IRequestContributionContext, definitions: CD[]): boolean;

  /**
   * 在注销贡献之后，相应的清理操作可以在这里执行
   * @param ctx
   * @param definitions
   */
  afterRequestRevokeContributionSucceed?(ctx: IRequestContributionContext, definitions: CD[]): void;
}

export abstract class ContributionKeywordBaseImpl<CPD extends IContributionPointDefinition = IContributionPointDefinition, CD extends IContributeDefinition = IContributeDefinition> implements IContributionKeywordBaseImpl<CPD, CD> {
  protected name: string;

  protected ctx: IExpansionBaseContext;

  protected keywordDefinition: IContributionKeywordDefinition;

  /**
   * 贡献点声明，贡献者作为 key，声明集合作为 value
   * {
   *  `${contributor}`: CPD[]
   * }
   * @protected
   */
  protected contributionPointDefinitions: Record<string, CPD[]> = {};

  /**
   * 贡献声明，贡献者作为 key，声明集合作为 value
   * {
   *   `${contributor}`: CD[]
   * }
   * @protected
   */
  protected contributeDefinitions: Record<string, CD[]> = {};

  private initOptions: ContributionKeywordInitOptions;

  protected devtools: IExpansionKeywordDevtools;

  constructor(ctx: IExpansionBaseContext, definition: IContributionKeywordDefinition) {
    this.name = definition.name;
    this.ctx = ctx;
    this.keywordDefinition = definition;
  }

  beforeRequestContributionPoint?(ctx: IRequestContributionContext, definitions: CPD[]): boolean

  afterRequestContributionPointSucceed?(ctx: IRequestContributionContext, definitions: CPD[]): void

  beforeRequestRevokeContributionPoint?(ctx: IRequestContributionContext, definitions: CPD[]): boolean

  afterRequestRevokeContributionPointSucceed?(ctx: IRequestContributionContext, definitions: CPD[]): void

  beforeRequestContribution?(ctx: IRequestContributionContext, definitions: CD[]): boolean

  afterRequestContributionSucceed?(ctx: IRequestContributionContext, definitions: CD[]): void

  beforeRequestRevokeContribution?(ctx: IRequestContributionContext, definitions: CD[]): boolean

  afterRequestRevokeContributionSucceed?(ctx: IRequestContributionContext, definitions: CD[]): void

  init(options: ContributionKeywordInitOptions) {
    this.initOptions = options;
    this.devtools = options.devtools;
  }

  /**
   * 注册贡献点的通用检查
   * @param ctx
   * @param definitions
   */
  requestContributionPoint(ctx: IRequestContributionContext, definitions: CPD[]) {
    if (this.needCheckContributionPoint(ctx.contributor)) {
      if (this.beforeRequestContributionPoint && this.beforeRequestContributionPoint(ctx, definitions) != true) {
        return;
      }
    }

    definitions.forEach(definition => {
      if (!this.keywordDefinition.supportDynamics && definition.supportDynamics) {
        fail(`【${this.name}检查失败】${this.name}未开启动态贡献点的支持，${ctx.contributor} 定义的贡献点 ${definition.name} 不能使用动态贡献点的能力`);
        return;
      }

    });

    if (this.contributionPointDefinitions[ctx.contributor]) {
      this.contributionPointDefinitions[ctx.contributor].push(...definitions)
    } else {
      this.contributionPointDefinitions[ctx.contributor] = definitions;
    }

    this.afterRequestContributionPointSucceed?.(ctx, definitions);
  }

  /**
   * 撤销贡献点的通用检查
   * @param ctx
   * @param definitions
   */
  requestRevokeContributionPoint(ctx: IRequestContributionContext, definitions: CPD[]) {
    if (this.beforeRequestRevokeContributionPoint && this.beforeRequestRevokeContributionPoint(ctx, definitions) != true) {
      return;
    }

    if (this.contributionPointDefinitions[ctx.contributor]) {
      this.contributionPointDefinitions[ctx.contributor] = this.contributionPointDefinitions[ctx.contributor].filter(x => definitions.findIndex(def => def.name == x.name) == -1);
    }

    this.afterRequestRevokeContributionPointSucceed?.(ctx, definitions);
  }

  /**
   * 注册贡献的通用检查
   *   - 当关键字支持贡献点时，贡献的 cp 是否有效；
   * @param ctx
   * @param definitions
   */
  requestContribution(ctx: IRequestContributionContext, definitions: CD[]) {
    if (this.needCheckContribute(ctx.contributor)) {
      if (this.beforeRequestContribution && this.beforeRequestContribution(ctx, definitions) != true) {
        return;
      }

      if (this.keywordDefinition.supportContributionPoint) {
        definitions.forEach(definition => {
          if (!definition.cp) {
            fail(`【${this.name}检查失败】${ctx.contributor} 的贡献声明中，没有通过 cp 定义贡献点，请检查 contributes`);
            return;
          }

          let { cp } = definition;
          let dynamicContribute: string;

          [cp, dynamicContribute] = cp.split(ContributionPointDynamicSplitter);

          // 如果支持动态贡献点，则需要根据 分隔符 取前半部分
          if (!this.keywordDefinition.supportDynamics && dynamicContribute) {
            fail(`【${this.name}检查失败】${this.name} 不支持动态贡献点，${ctx.contributor} 的贡献点 ${definition.cp} 使用了动态贡献点，请检查`);
            return;
          }

          /**
           * 找到对应的 contributionPoint
           */
          let cpDefinition: CPD;
          Object.values(this.contributionPointDefinitions).forEach(contributionPointDefinition => {
            if (!cpDefinition) {
              cpDefinition = contributionPointDefinition.find(def => def.name == cp);
            }
          });

          if (!cpDefinition) {
            fail(`【${this.name}检查失败】${ctx.contributor} 的贡献声明中，${definition.name} 的贡献点 ${definition.cp} 不再依赖的插件中，请检查`);
            return;
          }

          if (!cpDefinition.supportDynamics && dynamicContribute) {
            fail(`【${this.name}检查失败】${ctx.contributor} 的贡献声明中，${definition.name} 的贡献点 ${definition.cp} 不支持动态贡献点，请检查`);
            return;
          }


        });
      }
    }

    if (this.contributeDefinitions[ctx.contributor]) {
      this.contributeDefinitions[ctx.contributor].push(...definitions)
    } else {
      this.contributeDefinitions[ctx.contributor] = definitions;
    }

    this.afterRequestContributionSucceed?.(ctx, definitions);
  }

  requestRevokeContribution(ctx: IRequestContributionContext, definitions: CD[]) {
    if (this.beforeRequestRevokeContribution && this.beforeRequestRevokeContribution(ctx, definitions) != true) {
      return;
    }

    if (this.contributeDefinitions[ctx.contributor]) {
      this.contributeDefinitions[ctx.contributor] = this.contributeDefinitions[ctx.contributor].filter(x => definitions.findIndex(def => def.name == x.name) == -1);
    }

    this.afterRequestRevokeContributionSucceed?.(ctx, definitions);
  }

  isContributeExist(name: string): boolean {
    return Object.keys(this.contributeDefinitions)
      .some(contributor => this.contributeDefinitions[contributor].some(def => def.name == name));
  }

  isContributeValid(contributor: string, name: string): boolean {
    if (!this.needCheckContribute(contributor)) {
      return true;
    }

    if (!this.contributeDefinitions[contributor]) {
      fail(`【${this.name}检查失败】插件 ${contributor} 没有贡献声明，请检查 contributes`);
      return false;
    }

    const definition: IContributeDefinition = this.contributeDefinitions[contributor].find(def => def.name == name);
    if (!definition) {
      fail(`【${this.name}检查失败】插件 ${contributor} 的贡献声明中，没找到 name = ${name} 的声明，请检查 contributes`);
      return false;
    }

    return true;
  }

  isContributionPointExist(name: string): boolean {
    return Object.keys(this.contributionPointDefinitions)
      .some(contributor => this.contributionPointDefinitions[contributor].some(def => def.name == name));
  }

  isContributionPointValid(contributor: string, name: string): boolean {
    if (!this.needCheckContributionPoint(contributor)) {
      return true;
    }

    if (!this.contributionPointDefinitions[contributor]) {
      fail(`【${this.name}检查失败】插件 ${contributor} 没有贡献点声明，请检查 contributionPoints`);
      return false;
    }

    const definition: IContributionPointDefinition = this.contributionPointDefinitions[contributor].find(def => def.name == name);
    if (!definition) {
      fail(`【${this.name}检查失败】插件 ${contributor} 的贡献点声明中，没找到 name = ${name} 的声明，请检查 contributionPoints`);
      return false;
    }

    return true;
  }

  resolveContributionPointName(contributor: string, contributeName: string): string {
    const contributeDefinitions = this.contributeDefinitions[contributor];

    if (!contributeDefinitions) {
      return undefined;
    }

    // 使用 name 寻找贡献目标
    const contributeTo = contributeDefinitions.find(definition => definition.name === contributeName)?.cp;
    if (!contributeTo) {
      fail(`【${this.name}检查失败】插件 ${contributor} 的贡献声明中，没找到 name = ${contributeName} 的声明或声明没有 cp，请检查 contributes`);
    }
    return contributeTo;
  }

  findContributionPointDefinition(cp: string): CPD {
    return Object.values(this.contributionPointDefinitions).flatMap(v => v).find(d => d.name == cp);
  }

  findContribute(contributor: string, name: string): CD {
    return this.contributeDefinitions[contributor]?.find(def => def.name == name);
  }

  // ['props']
  /**
   *
   * null => true
   * ['props'] => false
   */
  protected needCheckContribute(contributor: string) {
    if (!this.initOptions.assertionOptions?.ignoreContributesCheckManifests) {
      return true;
    }

    return !this.initOptions.assertionOptions.ignoreContributesCheckManifests.includes(contributor);
  }

  protected needCheckContributionPoint(contributor: string) {
    return this.initOptions.assertionOptions?.ignoreContributionPointCheckManifests?.every(name => name != contributor);
  }

  // __devtools_getOverviewTables(): ContributionKeywordDevtoolsOverview {
  //   const usage = [];
  //
  //   if (this.keywordDefinition.supportContributionPoint) {
  //     Object.keys(this.contributionPointDefinitions).forEach(provider => {
  //       this.contributionPointDefinitions[provider].forEach(cp => {
  //         /**
  //          * 组织贡献点消费方信息
  //          */
  //         const consumers = Object.keys(this.contributeDefinitions).reduce((contributes, consumer) => {
  //           this.contributeDefinitions[consumer]
  //             .filter(contribute => contribute.cp.split(ContributionPointDynamicSplitter)[0] == cp.name)
  //             .forEach(contribute => {
  //               const [_, dynamics] = contribute.cp.split(ContributionPointDynamicSplitter);
  //
  //               const currentValue = (this as IContributionKeywordBaseImpl<CPD, CD>).__devtools_getCurrentInfo?.(consumer, contribute.name);
  //
  //               contributes.push({
  //                 dynamics: dynamics,
  //                 name: contribute.name,
  //                 description: contribute.description,
  //                 consumer: consumer,
  //                 currentValue: currentValue
  //               });
  //             });
  //           return contributes;
  //         }, []);
  //
  //         /**
  //          * 将贡献点完整信息添加到 usage 中
  //          */
  //         usage.push({
  //           name: cp.name,
  //           description: cp.description,
  //           provider: provider,
  //           consumers: consumers,
  //         });
  //       });
  //     });
  //   } else {
  //     Object.keys(this.contributeDefinitions).forEach(provider => {
  //       this.contributeDefinitions[provider].forEach(c => {
  //         usage.push({
  //           name: c.name,
  //           description: c.description,
  //           provider: provider,
  //         });
  //       });
  //     });
  //   }
  //
  //
  //   return {
  //     definition: this.keywordDefinition,
  //     usage: usage,
  //   };
  // }
}

export function reportExecutedWrapper(devtools: IExpansionKeywordDevtools, contributes: string, handler) {
  return (...params) => {
    let returned = handler(...params);

    (async () => {
      let serializeParams;
      if (params.length) {
        try {
          serializeParams = JSON.parse(JSON.stringify(params));
        } catch (e) {
          serializeParams = 'UnknownParams Serialize Failed';
        }
      }

      returned = await returned;

      let serializeReturned;
      if (returned !== undefined) {
        try {
          serializeReturned = JSON.parse(JSON.stringify(returned));
        } catch (e) {
          serializeReturned = 'UnknownReturned Serialize Failed';
        }
      }

      try {
        devtools.notifyContributeExecuted(contributes, serializeParams, serializeReturned);
      } catch (e) {
      }
    })();
    // let serializeParams;
    // if(params !== undefined) {
    //   try {
    //     serializeParams = JSON.parse(JSON.stringify(params));
    //   } catch (e) {
    //     serializeParams = 'UnknownParams Serialize Failed';
    //   }
    // }
    //
    // let serializeReturned;
    // if(returned !== undefined) {
    //   try {
    //     serializeReturned = JSON.parse(JSON.stringify(returned));
    //   } catch (e) {
    //     serializeReturned = 'UnknownReturned Serialize Failed';
    //   }
    // }
    //
    // try {
    //   devtools.notifyContributeExecuted(contributes, serializeParams, serializeReturned);
    // } catch (e) {
    // }

    return returned;
  };

}
