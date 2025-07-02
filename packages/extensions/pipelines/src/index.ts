import type { IContributionKeywordDefinition, IContributionKeywordImpl, IExpansionBaseContext, IExpansionImplement, IExpansionManifest } from '@tjmol/core';
import { PipelinesImplement } from './impl';
import { manifest } from './declare';


export class PipelinesExtension implements IExpansionImplement {

  activate(ctx: IExpansionBaseContext) {
  }

  getContributionKeyword(keyword: IContributionKeywordDefinition, ctx: IExpansionBaseContext): IContributionKeywordImpl {
    return new PipelinesImplement(ctx, keyword);
  }

  deactivate(): void {
  }
}

export function createPipelinesManifest(activationEvents: string[]): IExpansionManifest {
  const copyManifest: IExpansionManifest = JSON.parse(JSON.stringify(manifest));
  copyManifest.localImpl = () => new PipelinesExtension();
  copyManifest.activationEvents = activationEvents;

  return copyManifest;
}
