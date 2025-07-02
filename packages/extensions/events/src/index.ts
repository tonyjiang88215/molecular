import { IContributionKeywordDefinition, IContributionKeywordImpl, IExpansionBaseContext, IExpansionImplement, IExpansionManifest } from '@tjmol/core';
import { manifest } from './declare';
import { EventsImplement } from './impl';

export class EventsExtension implements IExpansionImplement {

  activate(ctx: IExpansionBaseContext) {
  }

  getContributionKeyword(keyword: IContributionKeywordDefinition, ctx: IExpansionBaseContext): IContributionKeywordImpl {
    return new EventsImplement(ctx, keyword);
  }

  deactivate() {
  }

}


export function createEventsManifest(activationEvents: string[]): IExpansionManifest {
  const copyManifest: IExpansionManifest = JSON.parse(JSON.stringify(manifest));
  copyManifest.localImpl = () => new EventsExtension();
  copyManifest.activationEvents = activationEvents;

  return copyManifest;
}
