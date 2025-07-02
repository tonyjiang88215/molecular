
import { IContributeDefinition, IContributionPointDefinition, IExpansionManifest } from '@tjmol/core';

export type IDisposer = () => void;

export interface IPipelinesContext {
  /**
   * 执行 pipelines
   * @param name
   * @param payload
   */
  execute(name: string|any, payload: any): any | Promise<any>

  /**
   * 实现 manifest 中声明的对 pipelines 的扩展函数
   * @param name
   * @param handler
   */
  register(name: string, handler: (payload: any) => any): IDisposer
}

/**
 * pipelines 类型，必填
 *  - common
 *    标准广播模式，按照函数注册的先后顺序依次执行，函数不要求有返回值，每一个函数的参数，都是相同的。
 *
 *  - waterfall
 *    串行模式，按照函数注册的先后顺序依次执行，对每一个函数都要求其返回值的类型必须和参数完全相同。前一个函数的返回结果会作为后一个函数的参数传入。
 *
 *  - asyncWaterfall
 *    跟 waterfall 逻辑相同，只是会返回 promise，并在每个阶段等待上一个函数执行完成
 *
 *  - concurrent
 *    平行模式中添加的所有函数都会使用 Promise.all 包装，按照异步函数同步执行。
 */
export type PipelineType = 'common' | 'concurrent' | 'waterfall' | 'asyncWaterfall';


export type IPipelineContributionPointDefinition = IContributionPointDefinition<{
  /**
   * 类型，必填
   */
  type: PipelineType
}>;

/**
 * 生命周期的定义
 */
export type IPipelineContributionPointDefinitions = IPipelineContributionPointDefinition[];

export const manifest: IExpansionManifest = {
  name: 'pipelines',
  version: '1.0.0',
  description: "",
  publisher: 'tonyjiang',
  activationEvents: [],
  contributionKeywords: [
    {
      name: 'pipelines',
      supportContributionPoint: true,
      contributionPointSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['concurrent', 'waterfall', 'asyncWaterfall', 'common'],
          },
        },
      },
      devtoolsDefinition: {
        typical: 'executing'
      }

      // identityPropertyPath: 'name'
      // isIdentityPropertyObeyNamespaceRule: true
    },
  ],
};
