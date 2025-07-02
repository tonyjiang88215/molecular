
import {
  IDestructible, IRequestContributionContext, ContributionKeywordBaseImpl, IExpansionKeywordDevtools, reportExecutedWrapper,
} from '@tjmol/core';
import { IDisposer, IEventContext, IEventContributionDefinition, IEventContributionPointDefinition } from './declare';
import { EventManager } from './event-manager';


export class EventsImplement extends ContributionKeywordBaseImpl<IEventContributionPointDefinition, IEventContributionDefinition> implements IDestructible {

  private eventManager = new EventManager();

  /**
   * 插件要管理的销毁函数，当插件卸载时，对应的事件监听需要进行卸载
   * {
   *   `${contributor}`: IDisposers[]
   * }
   * @private
   */
  private contributionDisposers: Record<string, IDisposer[]> = {};

  destructor(): void {
    this.eventManager.destructor();
  }

  /**
   * 插件卸载后，需要将插件声明的事件清除掉
   * @param ctx
   * @param definitions
   */
  afterRequestRevokeContributionPointSucceed(ctx: IRequestContributionContext, definitions: IEventContributionPointDefinition[]) {
    definitions.forEach(definition => {
      this.eventManager.clear(definition.name);
    })

  }

  /**
   * 插件卸载后，需要将插件监听的事件处理函数移除掉
   * @param ctx
   * @param definitions
   */
  afterRequestRevokeContributionSucceed(ctx: IRequestContributionContext, definitions: IEventContributionDefinition[]) {
    this.cleanContribution(ctx.contributor);
  }

  getContext(contributor: string): IEventContext {
    return {
      register: (name, handler) => {
        const contributeTo = this.resolveContributionPointName(contributor, name);
        if (!contributeTo) {
          // fail(`events: ${contributor} 尝试注册 ${name}, 但是没有找到对应的声明信息`);
          return () => {};
        }

        if(this.devtools.isAlive()) {
          handler = reportExecutedWrapper(this.devtools, name, handler);
        }

        const disposer = this.eventManager.on(contributeTo, handler);
        this.addContributeDisposer(contributor, disposer);

        return () => {
          disposer();
          this.removeContributeDisposer(contributor, disposer);
        };
      },

      dispatch: (eventName: string, ...args: Array<any>) => {
        if(!this.isContributionPointValid(contributor, eventName)) {
          return;
        }

        return this.eventManager.dispatch(eventName, ...args);
      },
    };
  }

  private addContributeDisposer(contributor: string, disposer) {
    if(!this.contributionDisposers[contributor]) {
      this.contributionDisposers[contributor] = [];
    }
    this.contributionDisposers[contributor].push(disposer);
  }

  private removeContributeDisposer(contributor: string, disposer) {
    this.contributionDisposers[contributor] = this.contributionDisposers[contributor]?.filter(x => x != disposer);

  }
  private cleanContribution(name: string) {
    this.contributionDisposers[name]?.forEach(disposer => disposer());
    this.contributionDisposers[name] = [];
  }
}
