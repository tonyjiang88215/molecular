import type { JSONSchema7 } from 'json-schema';
import type { IExpansionImplement } from '../services';

/**
 * 激活事件通常贯穿在方案的生命周期中，我们认为如果存在多个 activationEvents 时，
 * 则应该只有一个是入口事件，可以没有 preActivationEvents，其他的事件都需要明确定义
 * preActivationEvents
 */
export type IActivationEventDefinition = {
  /**
   * 激活事件名称
   */
  name: string,

  /**
   * 如果激活事件有前置事件，name需要再这里定义
   */
  preActivationEvents?: string[]
}

export type ActivationEventStruct = { name: string, when?: string};
export type ActivationEvent = string | ActivationEventStruct;

/**
 * 扩展的 manifest.json 的类型定义
 */
export type IExpansionManifest = {
  /**
   * 扩展名称，全局唯一，不能和其他扩展重名
   * 必填
   */
  name: string,

  /**
   * 插件说明
   */
  description: string,

  /**
   * README 地址
   */
  readme?: string,

  /**
   * 发布者名称
   * 必填
   */
  publisher: string,

  /**
   * 版本号
   * 遵循 semantic-version 规范进行版本管理
   * 必填
   */
  version: string,

  /**
   * 依赖项
   * 如果当前扩展对其他扩展有依赖，这需要在这里描述依赖关系及版本信息
   *
   * 注意：
   *  - 运行时我们会根据依赖关系确保加载顺序正确执行
   *  - 不允许存在循环依赖
   */
  dependencies?: Record<string, string>,

  /**
   * 插件的远程加载地址
   */
  remoteEntry?: string,

  /**
   * 插件的异步加载函数，由实现方负责加载代码，对插件系统来说，只是一个异步的函数
   */
  remoteImpl?: () => Promise<IExpansionImplement>,

  /**
   * @deprecated
   * 对于内置模块，暂时通过 localImpl 进行加载
   * 等 webpack 打包跑通了，在对这里进行调整
   */
  localImpl?: () => IExpansionImplement,

  /**
   * 扩展被激活的生命周期
   * 在不同的方案中，可用于激活扩展的生命周期不同，具体参考方案文档
   * 必填
   *
   * 注意： 当定义多个生命周期时，任意一个触发就会被加载
   */
  activationEvents: ActivationEvent[],

  /**
   * 扩展被销毁的生命周期
   * 并不是每个扩展都需要定义，只有在具体方案中，有明确的入口和出口时，
   * 才需要定义 deactivationEvents。
   * 非必填
   *
   * 注意： 当定义多个生命周期时，任意一个触发就会被卸载
   */
  // deactivationEvents?: string[],

  /**
   * 贡献声明
   * 插件对贡献点进行贡献，通过 contributes 进行声明
   * 我们会增加运行时的接口检查，以确保你贡献的代码，都能够和 contributes 的声明
   * 保持一致。
   *
   */
  contributes?: IContributeDefinitions,

  /**
   * 动态贡献，插件在 beforeActivate 生命周期中，通过 addContributes 注册的会放在这里，以便调试
   */
  dynamicContributes?: IContributeDefinitions,

  /**
   * 贡献点声明
   * 插件提供的扩展点，通过 contributionPoints 进行声明
   */
  contributionPoints?: IContributionPointDefinitions,

  /**
   * 动态贡献点，插件在 beforeActivate 生命周期中，通过 addContributionPoints 注册的会放在这里，以便调试
   */
  dynamicContributionPoints?: IContributionPointDefinitions,


  /**
   * 特性插件可以通过 contributionKeywords 提供扩展能力
   *
   */
  contributionKeywords?: IContributionKeywordDefinition[],

  /**
   * 是否提供挂载在全局的 context 对象
   */
  provideContext?: boolean,

  /**
   * 提供的全局的context的name， 如果和keyword中的contextName重名, 以该值为准
   */
  contextName?: string,
}

export type IContributionPointDefinition<SpecifyProperties extends object = { [key: string]: any }> = {
  /**
   * 贡献点名称
   */
  name: string,

  /**
   * 描述信息，用于描述贡献点的用途
   */
  description?: string,

  /**
   * 当 keyword 支持动态贡献点时，可以通过这个属性
   * 来开启这个贡献点支持动态
   *
   */
  supportDynamics?: boolean,


  /**
   * 是否被自动补充
   */
  isReplenish?: boolean

  /**
   * 被哪个插件补充的
   */
  replenishBy?: string

} & SpecifyProperties;

export type IContributionPointDefinitions = {
  [key in string]: IContributionPointDefinition[];
};

/**
 * 贡献声明定义
 */
export type IContributeDefinition<SpecifyAttributes extends object = { [key: string]: any }> = {

  /**
   * 贡献点名称
   * 当 keyword.supportContributionPoint = false 时，不需要填写
   */
  cp?: string,

  /**
   * 贡献内容名称
   */
  name: string,

  /**
   * 描述信息，用于描述贡献做了哪些处理
   */
  description?: string,

  // /**
  //  * 是否允许覆盖
  //  */
  // isAllowOverride?: boolean
  //
  // /**
  //  * 是否进行覆盖
  //  */
  // override?: boolean

  /**
   * 是否被自动补充
   */
  isReplenish?: boolean

  /**
   * 被哪个插件补充的
   */
  replenishBy?: string

} & SpecifyAttributes;


export type IContributeDefinitions = {
  [pName: string]: IContributeDefinition[]
}


export type IAutoReplenish = {
  contributes?: IContributeDefinitions,
  contributionPoints?: IContributionPointDefinitions
}

/**
 * 动态贡献点的分割字符
 */
export const ContributionPointDynamicSplitter = ":";


/**
 * 关键字开发工具的配置信息
 */
export type IContributionKeywordDevtoolDefinition = {
  /**
   * 调试工具中跟踪值的类型：
   *   - value 表示需要显示当前值
   *   - executing 表示需要显示调用过程
   */
  typical: 'value' | 'executing'
}

/**
 * 新增贡献点的描述
 */
export type IContributionKeywordDefinition = {

  /**
   * 贡献点的名称，其他扩展如果要进行扩展，会在 contributes 中通过该
   * 名称进行扩展的声明
   * 必填
   */
  name: string,

  /**
   * 是否支持声明贡献点
   * 当 supportContributionPoint = true 时：
   *  - 允许插件在 contributionPoints 中使用该 keyword 声明贡献点。
   *  - contributes 中必须通过 cp 指定贡献点
   *
   * 当 supportContributionPoint = false 时：
   *  - 插件只能通过 contributes 声明贡献内容。
   *  - contributes 中 cp 非必填，会忽略
   */
  supportContributionPoint?: boolean,

  /**
   * 是否支持动态扩展
   * 在某些场景下，贡献点只能描述一类扩展，需要根据运行时的数据动态确定贡献点
   * 例如：
   *   当我们定义一个 onValueChanged 贡献点时，我们可以在运行时
   *   通过 onValueChanged:department、onValueChanged:user 来指定不同的
   *   动态路径。
   *   定义贡献点的插件，也可以通过 onValueChanged:department 拿到该命名空间下
   *   的所有贡献内容。
   *
   * 动态扩展是一个约定概念，一旦贡献点支持动态扩展，则需要由 keyword 负责实现。
   */
  supportDynamics?: boolean,

  /**
   * 对贡献点进行贡献的声明定义 schema
   */
  contributeSchema?: JSONSchema7,

  /**
   * 如果贡献点依赖其他贡献点的能力，需要通过 contributeAutoReplenishContributes 描述
   * 对其他贡献点的补充，这部分贡献点会自动增加到原始贡献者的 manifest 中。
   * 对于动态部分可以使用模版字符串，模版字符串填充内容以 identityPropertyPath
   * 指定的属性为准。
   *
   * 例如：
   *
   * // 数据源贡献点
   * {
   *   name: 'dataSources',
   *   contributionKeywords: [
   *     {
   *       name: 'dataSources',
   *       contributeSchema: {
   *         type: 'array',
   *         items: {
   *           type: 'object',
   *           properties: {
   *             name: {
   *              type: 'string'
   *             }
   *           }
   *         }
   *       },
   *       contributeAutoReplenish: {
   *         contributionPoints: {
   *           lifecycles: [
   *             {
   *               name: 'dataSources.beforeFetch.{{name}}
   *             },
   *             {
   *               name: 'dataSources.fetchCompleted.{{name}}'
   *             }
   *           ]
   *         }
   *       }
   *     }
   *   ]
   * }
   *
   * // 贡献方 manifest
   * {
   *   name: 'dropdown',
   *   contributes: {
   *     dataSources: [
   *       {
   *         name: 'dropdown'
   *       }
   *     ]
   *   }
   * }
   *
   * // 数据源贡献点 runtime manifest
   * {
   *   name: 'dataSources',
   *   contributionKeywords: [
   *     {
   *       name: 'dataSources',
   *       contributeSchema: {
   *         type: 'array',
   *         items: {
   *           type: 'object',
   *           properties: {
   *             name: {
   *              type: 'string'
   *             }
   *           }
   *         }
   *       },
   *       contributeAutoReplenish: {
   *         contributionPoints: {
   *           lifecycles: [
   *             {
   *               name: 'dataSources.beforeFetch.{{name}}
   *             },
   *             {
   *               name: 'dataSources.fetchCompleted.{{name}}'
   *             }
   *           ]
   *         }
   *       }
   *     }
   *   ],
   *   contributionPoints: {
   *     lifecycles: [
   *       {
   *         name: 'dataSources.beforeFetch.dropdown',
   *         isReplenish: true,
   *         replenishBy: 'dropdown'
   *       },
   *       {
   *         name: 'dataSources.fetchCompleted.dropdown',
   *         isReplenish: true,
   *         replenishBy: 'dropdown'
   *       }
   *     ]
   *   }
   * }
   *
   * // 贡献方 runtime manifest
   * {
   *   name: 'dropdown',
   *   contributes: {
   *     dataSources: [
   *       {
   *         name: 'dropdown'
   *       }
   *     ]
   *   }
   * }
   *
   */
  contributeAutoReplenish?: IAutoReplenish,

  /**
   * 贡献点的声明定义 schema
   */
  contributionPointSchema?: JSONSchema7,

  /**
   * 当提供贡献点时，自动补充的 contributes 定义。
   */
  contributionPointAutoReplenish?: IAutoReplenish,

  /**
   * 贡献点被扩展时的声明数据结构定义，在 contributes 中对该贡献点扩展时，
   * 定义的声明数据需要遵循这个 schema 的描述
   * 这部分属性会在运行时和 IContributeDefinition 进行合并，组成完整的定义。
   * 非必填
   */
  definitionSchema?: JSONSchema7,


  /**
   * 禁用 name 唯一性检查
   * 默认值 = false
   */
  disableNameUnique?: boolean

  /**
   * 禁用 name 是否必须遵循命名规则检查，即必须以 ${contributor.name}. 作为前缀
   * 默认值 = false
   */
  disableNameObeyNamespaceRule?: boolean,

  /**
   * 是否提供挂载在全局的 context 对象
   */
  provideContext?: boolean,

  /**
   * 提供的全局 context 的别名，有些情况下，我们希望 manifest 中的 keyword
   * 和代码中 context 中的名称不同，则可以通过这个属性来进行设置
   * 如果没有设置 contextAliasName，则使用 name 作为默认值
   */
  contextName?: string,

  /**
   * 如果 provideContext = true，需要使用 contextSchema 来描述
   * 提供的 context 的类型
   */
  // contextSchema?: Record<string, JSONSchema7[]>

  /**
   * 开发工具的配置信息，允许在开发工具中实时跟踪分析运行时信息
   */
  devtoolsDefinition?: IContributionKeywordDevtoolDefinition

}
