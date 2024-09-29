import { IEventManager as IBaseEventManager, EventManager as BaseEventManager } from '@q7/shared';
import { Bean } from '../beans';
import { ExpansionFeatureNames } from './constants';
import { IContributeDefinitions, IContributionPointDefinitions } from '../manifests/type';


export enum ExpansionLifecycleEventNames {
  // 扩展激活之前
  beforeExtensionActivate = 'beforeExtensionActivate',
  // 扩展激活之后
  onExtensionActivated = 'onExtensionActivated',
  // 扩展卸载之前
  beforeExtensionDeactivate = 'beforeExtensionDeactivate',
  // 扩展卸载之后
  onExtensionDeactivated = 'onExtensionDeactivated',

  onDynamicContributesAdded = 'onDynamicContributesAdded',

  onDynamicContributesRemoved = 'onRemoveContributesRemoved',

  onDynamicContributionPointsAdded = 'onDynamicContributionPointsAdded',

  onDynamicContributionPointsRemoved = 'onRemoveContributionPointsRemoved',

}

export enum ExpansionDevtoolsEventNames {
  // onDevtoolsListenStarted = 'onDevtoolsListenStarted',
  //
  // onDevtoolsListenStopped = 'onDevtoolsListenStopped'
}

export type ExpansionLifecycleEventParams = {
  [ExpansionLifecycleEventNames.beforeExtensionActivate]: string,
  [ExpansionLifecycleEventNames.onExtensionActivated]: string,
  [ExpansionLifecycleEventNames.beforeExtensionDeactivate]: string,
  [ExpansionLifecycleEventNames.onExtensionDeactivated]: string,
  [ExpansionLifecycleEventNames.onDynamicContributesAdded]: [string, IContributeDefinitions],
  [ExpansionLifecycleEventNames.onDynamicContributionPointsAdded]: [string, IContributionPointDefinitions],
  [ExpansionLifecycleEventNames.onDynamicContributesRemoved]: [string, IContributeDefinitions];
  [ExpansionLifecycleEventNames.onDynamicContributionPointsRemoved]: [string, IContributionPointDefinitions];
  // [ExpansionDevtoolsEventNames.onDevtoolsListenStarted]: void;
  // [ExpansionDevtoolsEventNames.onDevtoolsListenStopped]: void;
}

export interface IEventManager extends IBaseEventManager<ExpansionLifecycleEventParams> {

}

@Bean(ExpansionFeatureNames.EventManager)
export class EventManager extends BaseEventManager implements IEventManager {

}
