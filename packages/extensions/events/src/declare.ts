import { IContributeDefinition, IContributionPointDefinition, IExpansionManifest } from '@tjmol/core';

export type IDisposer = () => void;

export type IEventHandler = (...args: any[]) => void;

export interface IEventContext {
  /**
   * 注册事件回调函数
   */
  register(eventName: string, handler: IEventHandler): IDisposer

  /**
   * 派发事件
   */
  dispatch(eventName: string, ...args: Array<any>): void
}

export type IEventContributionDefinition = IContributeDefinition

export type IEventContributionDefinitions = IEventContributionDefinition[];

export type IEventContributionPointDefinition = IContributionPointDefinition;

export const manifest: IExpansionManifest = {
  name: 'events',
  version: '1.0.0',
  description: "在插件系统内提供事件能力",
  activationEvents: [],
  publisher: 'platform',
  contributionKeywords: [
    {
      name: 'events',
      supportContributionPoint: true,
      devtoolsDefinition: {
        typical: 'executing'
      }
    },
  ],
};
