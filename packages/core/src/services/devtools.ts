import { observable } from 'mobx';
import { Autowired, Bean, ExpansionSeedNames, PostConstruct, PreDestroy } from '../beans';
import { ExpansionFeatureNames } from './constants';
import {
  IContributeDefinitions,
  IContributionKeywordDefinition,
  IContributionPointDefinitions,
  IExpansionManifest,
} from '../manifests';
import { IExtensionManager } from './extension-manager';
import { ContributionKeywordDevtoolsOverview, IContributionManager } from './contribution-keyword-manager';
import { IExpansionSystem } from '../expansion-system';
import { createConnection, IMessageConnection } from '../../devtools/connections/connection';
import { IEventManager } from './event-manager';

export type IExpansionDevtoolsOptions = {
  displayText?: string
}

export interface IExpansionKeywordDevtools {
  // notifyContributionPointChange()
  isAlive(): boolean

  notifyContributeValueUpdated(contributes: string, newValue?: any): void

  notifyContributeExecuted(contributes: string, params: any, returned: any): void
}

export interface IExpansionDevtools {
  /**
   * 是否高亮，当用户在开发工具上鼠标 hover 对应插件时，
   * 需要在 dom 中高亮
   */
  isHighlight: boolean,

  /**
   * 根据关键字名称，获取对应的连接对象，在运行态的信息发生变化时，可以
   * 通过链接对象主动通知开发工具更新信息
   *
   * @param name
   */
  getKeywordDevtools(name: string): IExpansionKeywordDevtools

  /**
   * 【通知】增加新的关键字
   * @param contributor
   * @param definition
   */
  notifyContributionKeywordAdded(contributor: string, definition: IContributionKeywordDefinition): void

  /**
   * 【通知】增加新的贡献点
   * @param contributor
   * @param definitions
   */
  notifyContributionPointAdded(contributor: string, definitions: IContributionPointDefinitions): void

  /**
   * 【通知】增加新的贡献
   * @param contributor
   * @param definitions
   */
  notifyContributeAdded(contributor: string, definitions: IContributeDefinitions): void
}

@Bean(ExpansionFeatureNames.Devtools)
export class Devtools implements IExpansionDevtools {

  @Autowired(ExpansionSeedNames.ExpansionSystem) private es: IExpansionSystem;
  @Autowired(ExpansionSeedNames.Manifests) private manifests: IExpansionManifest[];
  @Autowired(ExpansionSeedNames.DevtoolsOptions) private devtoolsOptions: IExpansionDevtoolsOptions;
  @Autowired(ExpansionFeatureNames.ExtensionManager) private extensionManager: IExtensionManager;
  @Autowired(ExpansionFeatureNames.ContributionKeywordManager) private contributionKeywordManager: IContributionManager;
  @Autowired(ExpansionFeatureNames.EventManager) private eventManager: IEventManager;

  private isAlive = window.sessionStorage.getItem('__77_expansion_devtools');

  private connection: IMessageConnection;
  private messageCallbacks = [];

  private keywordConnections = new Map<string, IExpansionKeywordDevtools>();

  @observable.ref
  public isHighlight = false;

  @PostConstruct
  private postConstruct() {
    this.connection = createConnection({
      onMessage: callback => {
        this.messageCallbacks.push(callback);
      },
      postMessage: (message = {}) => {
        if (!this.isAlive) {
          return;
        }

        if (!message.params) {
          message.params = {};
        }
        message.params.id = this.es.id;

        try{
          window.postMessage({
            source: 'expansionSystem',
            body: clone(message),
          });
        }catch (e) {
          console.error(e);
        }

      },
      disconnect: () => {
      },
    });

    if (!this.isAlive) {
      return;
    }
    window.addEventListener('message', this.messageHandler);

    this.initListener();
  }

  private initListener() {
    this.connection.onNotification('devtoolsInstall', () => {
      // devtools 安装后，重新发生当前插件系统的信息
      this.connection.sendNotification('expansionSystemInit', {
        info: {
          id: this.es.id,
          parentId: this.es.parent?.id,
          displayText: this.devtoolsOptions?.displayText,
        },
        manifest: this.manifests.map(({ remoteImpl, localImpl, ...staticInfos }) => staticInfos),
      });
    });

    this.connection.onNotification('highlight', ({ isOn }) => {
      this.isHighlight = isOn;
    });

    this.connection.sendNotification('expansionSystemInit', {
      info: {
        id: this.es.id,
        parentId: this.es.parent?.id,
        displayText: this.devtoolsOptions?.displayText,
      },
      manifest: this.manifests.map(({ remoteImpl, localImpl, ...staticInfos }) => staticInfos),
    });

    // this.connection.sendRequest('checkDevtoolsAlive', {}).then(alive => {
    //   this.isAlive = alive;
    // });
  }

  @PreDestroy
  private preDestroy() {
    this.connection.sendNotification('expansionSystemDestroy');
    this.connection.destroy();
    window.removeEventListener('message', this.messageHandler);
  }

  private messageHandler = ev => {
    if (ev.data?.source != 'expansionSystemDevtools') {
      return;
    }

    // 消息payload中，通过 id 判断是否为当前插件系统的消息
    if (ev.data?.body?.params?.id != this.es.id && ev.data?.body?.result?.id != this.es.id) {
      return;
    }

    this.messageCallbacks.forEach(callback => callback(ev.data?.body));
  };

  getKeywordDevtools(keyword: string) {
    if (!this.keywordConnections.has(keyword)) {
      this.keywordConnections.set(keyword, this.createKeywordDevtools(keyword));
    }

    return this.keywordConnections.get(keyword);
  }

  private createKeywordDevtools(keyword: string): IExpansionKeywordDevtools {
    return {
      isAlive: () => this.isAlive,

      notifyContributeValueUpdated: (contributes, newValue) => {
        this.connection.sendNotification('contributeValueUpdated', {
          keyword, contributes, newValue,
        });
      },
      notifyContributeExecuted: (contributes: string, params: any, returned: any) => {
        this.connection.sendNotification('contributeExecuted', {
          keyword, contributes, params, returned,
        });
      },
    };
  }

  notifyContributionKeywordAdded(contributor, definition) {
    this.connection?.sendNotification('contributionKeywordAdded', { contributor, definition });
  }

  notifyContributionPointAdded(contributor, definitions) {
    this.connection?.sendNotification('contributionPointAdded', { contributor, definitions });
  }

  notifyContributeAdded(contributor, definitions) {
    this.connection?.sendNotification('contributeAdded', { contributor, definitions });
  }
}


function clone(message) {
  return Object.keys(message).reduce((newMessage, key) => {
    const value = message[key];
    switch (typeof value) {
      case 'function':
        newMessage[key] = 'Function';
        break;

      default:
        newMessage[key] = value;
    }

    return newMessage;
  }, {});
}
