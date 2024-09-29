import type { IExpansionManifest } from '../manifests';
import type { IExtensionManager } from '../services/extension-manager';
import type { IContextManager } from '../services/context-manager';
import type { IEventManager } from '../services/event-manager';
import type { ExpansionManifestAssertionOptions, IManifestManager } from '../services/manifest-manager';
import type { IHierarchyManager } from '../services/hierarchy-manager';
import type { IExpansionDevtools, IExpansionDevtoolsOptions } from '../services/devtools';

import { ExpansionFeatureNames } from '../services/constants';


export enum ExpansionSeedNames {
  Manifests = 'Manifests',
  ManifestAssertionOptions = 'ManifestAssertionOptions',
  DevtoolsOptions = 'DevtoolsOptions',
  ActivationEventDefinitions = 'ActivationEventDefinitions',
  ParentExpansionSystem = 'ParentExpansionSystem',
  ExpansionSystem = 'ExpansionSystem'
}

export type IExpansionSeeds = {
  [ExpansionSeedNames.Manifests]: IExpansionManifest[],
  [ExpansionSeedNames.ManifestAssertionOptions]: ExpansionManifestAssertionOptions,
  [ExpansionSeedNames.DevtoolsOptions]: IExpansionDevtoolsOptions
}


export type IExpansionFeatures = {
  [ExpansionFeatureNames.ManifestManager]: IManifestManager,
  [ExpansionFeatureNames.ExtensionManager]: IExtensionManager,
  [ExpansionFeatureNames.ContextManager]: IContextManager,
  [ExpansionFeatureNames.EventManager]: IEventManager,
  [ExpansionFeatureNames.HierarchyManager]: IHierarchyManager,
  [ExpansionFeatureNames.Devtools]: IExpansionDevtools
}

export type IExpansionBeans = IExpansionSeeds & IExpansionFeatures;
