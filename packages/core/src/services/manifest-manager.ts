import type {
  IActivationEventDefinition,
  IContributeDefinitions,
  IContributionKeywordDefinition,
  IExpansionManifest,
  ActivationEvent,
  ActivationEventStruct
} from '../manifests';
import { Autowired, Bean, ExpansionSeedNames, PostConstruct } from '../beans';
import { ExpansionFeatureNames } from './constants';
import { getJSONValuesByPath } from '../util';
import { IContributionPointDefinitions } from '../manifests';

export type ExpansionManifestAssertionOptions = {
  // 忽略命名空间检查的 keywords 集合
  ignoreNamespaceKeywords?: string[],
  // 忽略命名空间检查的 manifest 集合
  ignoreNamespaceManifests?: string[],
  // 哪些插件提供的 keyword 可以不遵循命名空间
  ignoreKeywordNamespaceCheckManifests?: string[],
  // 忽略贡献检查的 manifest 集合
  ignoreContributesCheckManifests?: string[],
  // 忽略贡献点检查的 manifest 集合
  ignoreContributionPointCheckManifests?: string[]
}

export interface IManifestAssertion {
  /**
   * 检查 activationEventDefinitions 合法性
   *   - 不能为空
   *   - 只有一个入口事件
   *   - 不能有循环依赖（暂未实现）
   */
  assertActivationEventDefinitionIsValid(): true | void;

  /**
   * 检查 manifests 是否正确，包含以下检查内容：
   *  - manifest 名称唯一性检查
   *  - manifest 依赖正确性检查
   *
   *  - 每个 manifest 检查以下内容：
   *    - activationEvents 正确性检查
   *    - dependencies 依赖正确性检查
   *      - 依赖存在
   *      - 依赖时序正确性
   *    - contributes 正确性检查
   *      - keyword 有效性检查
   *      - 类型检查（确保是数组）
   *      - cp 必填检查
   *      - name 必填检查
   *      - name 命名空间检查
   *    - contributionPoints 正确性检查
   *      - name 必填检查
   *      - name 命名空间检查
   *    - contributionKeywords 必须以插件名称作为开始
   *      - contributionSchema 检查
   *      - contributionPointSchema 检查
   *      - contributes 定义的命名唯一
   *      - contributionPoints 定义的命名唯一
   */
  assertManifestsIsValid(): true | void;

  /**
   * 检查 dependent 是否是 name 的合法依赖
   * @param name
   * @param dependent
   */
  assertIsDependentValid(name: string, dependent: string): boolean;

  /**
   * 检查 name 的 contributes 正确性
   * @param manifest
   * @param contributes
   */
  assertManifestContributeIsValid(manifest: IExpansionManifest, contributes: IContributeDefinitions): boolean;

  /**
   * 检查 name 的 contributionPoints 正确性
   * @param manifest
   * @param contributionPoints
   */
  assertManifestContributionPointsIsValid(manifest: IExpansionManifest, contributionPoints: IContributionPointDefinitions): boolean;
}

export interface IManifestManager {
  /**
   * 根据 name，获取对应扩展的 manifest 信息
   * @param name
   */
  getManifest(name: string): IExpansionManifest

  /**
   * 根据 activationEventName 返回需要激活的扩展集合
   * @param activationEventName
   */
  getShouldActivates(activationEventName: string): [IExpansionManifest, ActivationEventStruct][]

  /**
   * 根据 activationEventName 返回需要卸载的扩展集合
   */
  getShouldDeactivates(activationEventName: string): IExpansionManifest[]

  /**
   * 获取断言操作类
   */
  getAssertion(): IManifestAssertion

  /**
   * 动态增加插件
   * @param manifests
   */
  dynamicAddManifest(manifests: IExpansionManifest[]): void

}


@Bean(ExpansionFeatureNames.ManifestManager)
export class ManifestManager implements IManifestManager {

  @Autowired(ExpansionSeedNames.Manifests) private manifests: IExpansionManifest[];
  @Autowired(ExpansionSeedNames.ManifestAssertionOptions) private manifestAssertionOptions: ExpansionManifestAssertionOptions;
  @Autowired(ExpansionSeedNames.ActivationEventDefinitions) private activationEventDefinitions: IActivationEventDefinition[];

  private map: Record<string, IExpansionManifest> = {};
  private groupByActivationEvent: Record<string, [IExpansionManifest, ActivationEventStruct][]> = {};
  // private groupByDeactivationEvent: Record<string, IExpansionManifest[]> = {};
  private assertion: IManifestAssertion;

  @PostConstruct
  private postConstruct() {

    this.manifests = deepCloneManifest(this.manifests);

    this.assertion = new ManifestAssertion({
      activationEventDefinitions: this.activationEventDefinitions,
      manifests: this.manifests,
      assertOptions: this.manifestAssertionOptions,
    });

    // 补充 manifest.contributionPoints 的前缀
    // replenishContributionsName(this.manifests);
    // 检查 activationEventDefinitions 合法性
    this.assertion.assertActivationEventDefinitionIsValid();
    // 检查 manifests 合法性
    this.assertion.assertManifestsIsValid();

    replenishContributes(this.manifests);

    this.activationEventDefinitions.forEach(activationEvent => {
      this.groupByActivationEvent[activationEvent.name] = [];
    });

    this.manifests.forEach(manifest => {
      this.map[manifest.name] = manifest;

      manifest.activationEvents.forEach(activationEvent => {
        const event = ensureActivationEvent(activationEvent)
        this.groupByActivationEvent[event.name]?.push([manifest, event]);

      });
    });
  }

  async dynamicAddManifest(manifests: IExpansionManifest[]) {
    const manifestsCopy = deepCloneManifest(manifests)
    const assertion = new ManifestAssertion({
      activationEventDefinitions: this.activationEventDefinitions,
      manifests: this.manifests.concat(manifestsCopy),
      assertOptions: this.manifestAssertionOptions,
    });

    assertion.assertActivationEventDefinitionIsValid();
    // 检查 manifests 合法性
    assertion.assertManifestsIsValid(this.manifests.map(m=>m.name));

    replenishContributes(manifestsCopy);
    manifestsCopy.forEach(manifest => {
      this.map[manifest.name] = manifest;

      manifest.activationEvents.forEach(activationEvent => {
        const event = ensureActivationEvent(activationEvent)

        this.groupByActivationEvent[event.name]?.push([manifest, event]);
      });
    });

    this.manifests = this.manifests.concat(manifestsCopy)
  }

  getManifest(name: string): IExpansionManifest {
    return this.map[name];
  }

  /**
   * 根据 activationEventName 返回需要激活的扩展集合
   * @param activationEventName
   */
  getShouldActivates(activationEventName: string): [IExpansionManifest, ActivationEventStruct][] {
    return this.groupByActivationEvent[activationEventName];
  }

  /**
   * 根据 activationEventName 返回需要卸载的扩展集合
   * @param activationEventName
   */
  getShouldDeactivates(activationEventName: string): IExpansionManifest[] {
    return this.groupByActivationEvent[activationEventName].map(x => x[0]);
  }

  getAssertion() {
    return this.assertion;
  }
}

function ensureActivationEvent(activationEvent: ActivationEvent): ActivationEventStruct {
  if (typeof activationEvent === 'string') {
    return { name: activationEvent };
  }
  return activationEvent;
}

function ensuereActivationEventName(activationEvent: ActivationEvent): string {
  return typeof activationEvent === 'string' ? activationEvent : activationEvent.name;
}

function deepCloneManifest(manifests: IExpansionManifest[]): IExpansionManifest[] {
  return manifests.map(manifest => {
    const copyManifest = JSON.parse(JSON.stringify(manifest));
    copyManifest.localImpl = manifest.localImpl;
    copyManifest.remoteImpl = manifest.remoteImpl;

    return copyManifest;
  });
}

/**
 * 对 manifest.contributionPoints 和 manifest.contributes 的声明，自动将 name 补充为前缀
 * @param manifests
 */
function replenishContributionsName(manifests: IExpansionManifest[]): IExpansionManifest[] {
  manifests.forEach(manifest => {
    if (manifest.contributes) {
      Object.values(manifest.contributes).forEach(definitions => {
        definitions.forEach(definition => {
          definition.name = `${manifest.name}.${definition.name}`;
        });
      });
    }

    if (manifest.contributionPoints) {
      Object.values(manifest.contributionPoints).forEach(definitions => {
        definitions.forEach(definition => {
          definition.name = `${manifest.name}.${definition.name}`;
        });
      });
    }
  });
  return manifests;
}


function replenishContributes(manifests: IExpansionManifest[]): IExpansionManifest[] {

  /**
   * 补充 manifest 的提供者
   * {`${贡献关键字}`: '${关键字提供者}'}
   */
  const contributionKeywordImplementNames: Record<string, IExpansionManifest> = {};

  const contributionKeywords: IContributionKeywordDefinition[] = manifests.reduce((cp, manifest) => {
    if (manifest.contributionKeywords) {
      manifest.contributionKeywords.forEach(keywordDefinition => {
        contributionKeywordImplementNames[keywordDefinition.name] = manifest;
        cp.push(keywordDefinition);
      });
    }

    return cp;
  }, []);


  contributionKeywords.forEach(({ name: keywordName, contributeAutoReplenish, contributionPointAutoReplenish }) => {
    const keywordManifest = contributionKeywordImplementNames[keywordName];
    if (contributeAutoReplenish) {
      manifests.forEach(manifest => {
        if (manifest.contributes?.[keywordName]) {
          const keys = manifest.contributes[keywordName].map(def => def.name);
          // const keys = getJSONValuesByPath(manifest.contributes[name], 'name');
          keys.forEach(key => {
            if (contributeAutoReplenish.contributes) {
              const replenishContributes = replaceReplenishContributesName(contributeAutoReplenish.contributes, manifest.name, 'name', key);
              keywordManifest.contributes = mergeReplenishContributes(keywordManifest.contributes, replenishContributes);
            }

            if (contributeAutoReplenish.contributionPoints) {
              const replenishContributionPoints = replaceReplenishContributesName(contributeAutoReplenish.contributionPoints, manifest.name, 'name', key);
              keywordManifest.contributionPoints = mergeReplenishContributes(keywordManifest.contributionPoints, replenishContributionPoints);
            }
          });

        }
      });
    }

    if (contributionPointAutoReplenish) {
      manifests.forEach(manifest => {
        if (manifest.contributionPoints?.[keywordName]) {
          const keys = manifest.contributionPoints[keywordName].map(def => def.name);
          // const keys = getJSONValuesByPath(manifest.contributes[name], 'name');
          keys.forEach(key => {
            if (contributionPointAutoReplenish.contributes) {
              const replenishContributes = replaceReplenishContributesName(contributionPointAutoReplenish.contributes, manifest.name, 'name', key);
              keywordManifest.contributes = mergeReplenishContributes(keywordManifest.contributes, replenishContributes);
            }

            if (contributionPointAutoReplenish.contributionPoints) {
              const replenishContributionPoints = replaceReplenishContributesName(contributionPointAutoReplenish.contributionPoints, manifest.name, 'name', key);
              keywordManifest.contributionPoints = mergeReplenishContributes(keywordManifest.contributionPoints, replenishContributionPoints);
            }

          });

        }
      });
    }
  });

  // contributionKeywords.filter(cp => cp.autoReplenishContributes).forEach(({ name, autoReplenishContributes }) => {
  //   manifests.forEach(manifest => {
  //     if (manifest.contributes?.[name]) {
  //       const keys = manifest.contributes[name].filter(def => !def.override).map(def => def.name);
  //       // const keys = getJSONValuesByPath(manifest.contributes[name], 'name');
  //       keys.forEach(key => {
  //         const replenishContributes = replaceReplenishContributesName(autoReplenishContributes, contributionKeywordImplementNames[name], 'name', key);
  //         manifest.contributes = mergeReplenishContributes(manifest.contributes, replenishContributes);
  //       });
  //
  //     }
  //   });
  // });

  return manifests;
}

function createRegExp(name: string) {
  return new RegExp(`{{${name}}}`, 'g');
}

function replaceReplenishContributesName(contributes: IContributeDefinitions, by: string, name: string, value: string): IContributeDefinitions {
  const reg = createRegExp('name');

  const copiedContributes: IContributeDefinitions = JSON.parse(JSON.stringify(contributes));

  Object.keys(copiedContributes).forEach(contributeName => {
    copiedContributes[contributeName].forEach(def => {
      def.name = def.name.replace(reg, value);
      if (def.cp) {
        def.cp = def.cp.replace(reg, value);
      }
      def.isReplenish = true;
      def.replenishBy = by;
    });
  });

  return copiedContributes;
}

function mergeReplenishContributes(contributes, replenishContributes: IContributeDefinitions): IContributeDefinitions {
  const copyContributes = JSON.parse(JSON.stringify(contributes || {}));
  Object.keys(replenishContributes).forEach(name => {
    if (!copyContributes[name]) {
      copyContributes[name] = [];
    }

    copyContributes[name].push(...replenishContributes[name]);
  });

  return copyContributes;
}


type ManifestAssertionOptions = {
  activationEventDefinitions: IActivationEventDefinition[],
  manifests: IExpansionManifest[],
  assertOptions: ExpansionManifestAssertionOptions
}

class ManifestAssertion implements IManifestAssertion {

  private keywordDefinitions: Record<string, {
    contributor: string,
    definition: IContributionKeywordDefinition
  }>;

  constructor(private options: ManifestAssertionOptions) {
    this.keywordDefinitions = options.manifests.reduce((keywords, manifest) => {
      if (manifest.contributionKeywords) {
        manifest.contributionKeywords.forEach(keywordDefinition => {
          keywords[keywordDefinition.name] = {
            contributor: manifest.name,
            definition: keywordDefinition,
          };
        });
      }

      return keywords;
    }, {});
  }

  assertActivationEventDefinitionIsValid(): true | void {
    const { activationEventDefinitions } = this.options;
    if (activationEventDefinitions.length === 0) {
      fail(`activationEventDefinitions 不能为空`);
      return;
    }

    const rootEvents = activationEventDefinitions.filter(def => !def.preActivationEvents || def.preActivationEvents.length === 0);
    if (rootEvents.length > 1) {
      fail(`activationEventDefinitions 中，只能有一个入口事件，现在有 [${rootEvents.map(def => def.name).join(',')}] ${rootEvents.length} 个`);
      return;
    }

    return true;
  }

  assertManifestsIsValid(valided: Array<string> = []) {
    const { manifests } = this.options;
    if (this.assertManifestNameUniqueIsValid(manifests) !== true) {
      return;
    }

    if (this.assertContributionKeywordUniqueIsValid(manifests) !== true) {
      return;
    }

    manifests.forEach(manifest => {
      if (!valided.includes(manifest.name)) {
        this.assertManifestIsValid(manifest.name);
      }
    });
  }

  /**
   * 检查 manifest 正确性
   *  - activationEvents 正确性检查
   *  - dependencies 依赖正确性检查
   *    - 依赖存在
   *    - 依赖时序正确性
   *  - contributes 正确性检查
   *    - keyword 有效性检查
   *    - 类型检查（确保是数组）
   *    - cp 必填检查
   *    - name 必填检查
   *    - name 命名空间检查
   *
   *  - contributionPoints 正确性检查
   *    - name 必填检查
   *    - name 命名空间检查
   *  - contributionKeywords 必须以插件名称作为开始
   *    - contributionSchema 检查
   *    - contributionPointSchema 检查
   *    - contributes 定义的命名唯一
   *    - contributionPoints 定义的命名唯一
   */
  assertManifestIsValid(name: string) {
    const { manifests, activationEventDefinitions, assertOptions } = this.options;
    const contributionKeywords = this.keywordDefinitions;
    const manifest = manifests.find(m => m.name == name);

    if (!manifest) {
      fail(`【检查失败】未找到名称为 ${name} 的插件 manifest`);
      return;
    }

    if (!manifest.name) {
      fail(`扩展 name 属性必填，请检查`);
      return;
    }

    // 检查 activationEvents 是否声明
    if (!manifest.activationEvents || manifest.activationEvents.length === 0) {
      fail(`扩展 ${manifest.name} 没有定义 activationEvents`);
      return;
    }

    // 检查 activationEvents 是否声明
    const undefinedEvents = manifest.activationEvents.filter(event => !activationEventDefinitions.some(def => def.name === ensuereActivationEventName(def)));
    if (undefinedEvents.length > 0) {
      fail(`扩展 ${manifest.name} 的 activationEvents 中，[${undefinedEvents.join((','))}] 没有被声明`);
      return;
    }

    // 检查依赖是否正确
    if (manifest.dependencies) {
      const undefinedDependencies = Object.keys(manifest.dependencies).filter(dependent => !manifests.some(m => m.name === dependent));
      if (undefinedDependencies.length > 0) {
        fail(`扩展 ${manifest.name} 的 dependencies 中，[${undefinedDependencies.join((','))}] 不存在`);
        return;
      }

      // 检查依赖的触发时机顺序是否正确
      if (manifest.activationEvents) {
        const activationEventNames = manifest.activationEvents.map(ensuereActivationEventName);
        const earliestActivationEventIndex = this.getEarliestActivationEventIndex(activationEventNames);
        const wrongActivationDependencies = Object.keys(manifest.dependencies).filter(dependent => {
          const dependentManifest = manifests.find(m => m.name === dependent);
          if (!dependentManifest.activationEvents || dependentManifest.activationEvents.length === 0) {
            return false;
          } else {
            return this.getEarliestActivationEventIndex(activationEventNames) > earliestActivationEventIndex;
          }
        });

        if (wrongActivationDependencies.length > 0) {
          fail(`扩展 ${manifest.name} 的 dependencies 中，[${wrongActivationDependencies.join((','))}] 的时机可能晚于 ${manifest.name}，请确认`);
          return;
        }
      }

    }

    if (manifest.contributes && !this.assertManifestContributeIsValid(manifest, manifest.contributes)) {
      return;
    }

    if (manifest.contributionPoints && !this.assertManifestContributionPointsIsValid(manifest, manifest.contributionPoints)) {
      return;
    }

    // 检查 contributionKeywords 命名正确性
    if (manifest.contributionKeywords && assertOptions?.ignoreKeywordNamespaceCheckManifests?.every(name => name !== manifest.name)) {
      // if (manifest.contributionPoints.length > 1) {
      //   fail(`扩展 ${manifest.name} 的 contributionPoint 定义有多个，只支持一个`);
      //   return;
      // }

      manifest.contributionKeywords.forEach((contributionKeyword, index) => {
        if (!contributionKeyword.name.startsWith(manifest.name)) {
          fail(`扩展 ${manifest.name} 的 contributionKeywords[${index}].name: ${contributionKeyword.name} 不是以 ${manifest.name} 开始的`);
          return;
        }


        // 检查贡献提供的内容 name 是否全局唯一
        if (this.assertContributionNameIsDuplicated(contributionKeyword.name) !== true) {
          return;
        }

        // if (!contributionPoint.definitionSchema) {
        //   fail(`扩展 ${manifest.name} 的 contributionPoint 没有定义 definitionSchema`);
        //   return;
        // }

        // // 检查贡献提供的内容 name 是否全局唯一
        // if (assertContributionNameIsDuplicated(manifests, manifest.name, contributionKeyword.name, 'name') !== true) {
        //   return;
        // }

        // if (contributionPoint.isIdentityPropertyObeyNamespaceRule) {
        //   if (assertContributionIdentityPropertiesIsNamespaceValid(manifests, manifest.name, contributionPoint.name, contributionPoint.identityPropertyPath) !== true) {
        //     return;
        //   }
        // }

        // if (contributionPoint.autoReplenishContributes) {
        //   assertAutoReplenishContributesValid(manifest.name, contributionPoint.name, contributionPoint.autoReplenishContributes);
        // }

        // if (contributionPoint.definitionSchema && contributionPoint.identityPropertyPath) {
        //   // if (assertContributionIdentityIsValid(manifest.name, contributionPoint) !== true) {
        //   //   return;
        //   // }
        //
        //   if (assertContributionIdentityPropertiesIsDuplicated(manifests, manifest.name, contributionPoint.name, 'name') !== true) {
        //     return;
        //   }
        //
        //   if(contributionPoint.isIdentityPropertyObeyNamespaceRule) {
        //     if(assertContributionIdentityPropertiesIsNamespaceValid(manifests, manifest.name, contributionPoint.name, contributionPoint.identityPropertyPath) !== true) {
        //       return;
        //     }
        //   }
        // }
      });


    }


    return true;


  }

  assertManifestContributeIsValid(manifest: IExpansionManifest, contributes: IContributeDefinitions) {
    let isValid = true;
    const { assertOptions } = this.options;
    if (!manifest) {
      fail(`【检查失败】找不到 ${name} 的插件定义`);
      return false;
    }
    // 检查 contributes 是否有对应的 keyword
    const undefinedKeywordContributes = Object.keys(contributes)
      // .map(contribute => contribute.split(':')[0])
      .filter(keyword => !this.keywordDefinitions[keyword]);
    if (undefinedKeywordContributes.length > 0) {
      fail(`扩展 ${manifest.name} 的 contributes 中，contributionKeywords [${undefinedKeywordContributes.join((','))}] 没有提供者`);
      isValid = false;
      return;
    }

    // 检查 contributes 是否都是数组
    const invalidTypedContributes = Object.keys(contributes).filter(name => !(contributes[name] instanceof Array));

    if (invalidTypedContributes.length > 0) {
      fail(`扩展 ${manifest.name} 的 contributes 中，[${invalidTypedContributes.join(',')}] 不是数组`);
      isValid = false;
      return;
    }

    // 检查 contributionPoints 中，name 必填
    Object.keys(contributes).forEach(keyword => {
      // const keywordDefinition = findKeywordDefinitions(manifests, keyword);
      const keywordDefinition = this.keywordDefinitions[keyword].definition;
      // 检查 contributionPoints 中，name 必填
      const unnamedIndex = contributes[keyword].reduce((errors, def, index) => {
        if (!def.name) {
          errors.push(index);
        }
        return errors;
      }, []);

      if (unnamedIndex.length > 0) {
        fail(`扩展 ${manifest.name} 的 contributes.${keyword} 中，第 [${unnamedIndex.join(',')}] 项没有定义名称`);
        isValid = false;
        return;
      }

      //
      if (!keywordDefinition.disableNameObeyNamespaceRule && !assertOptions?.ignoreNamespaceKeywords?.includes(keyword) && !assertOptions?.ignoreNamespaceManifests?.includes(manifest.name)) {
        // 检查 contributionPoints 中，name 是否遵循命名规范
        const invalidNamespaces = contributes[keyword].filter(def => !def.name.startsWith(`${manifest.name}.`));

        if (invalidNamespaces.length > 0) {
          fail(`扩展 ${manifest.name} 的 contributes.${keyword} 中，[${invalidNamespaces.map(def => def.name).join(',')}] 不遵循命名空间规范，必须以 ${manifest.name}. 作为开头`);
          isValid = false;
          return;
        }
      }


      // 检查 contributes 是否都有 cp
      if (keywordDefinition.supportContributionPoint) {
        const cpUndefinedContributes = contributes[keyword].filter(def => !def.cp);

        if (cpUndefinedContributes.length > 0) {
          fail(`扩展 ${manifest.name} 的 contributes.${keyword} 中，[${cpUndefinedContributes.map(def => def.name).join(',')}] 中存在没有指定 cp 的声明`);
          isValid = false;
          return;
        }
      }

    });

    // todo 检查 contributesTo 是否有对应的提供者
    // const undefinedContributeTos = Object.keys(manifest.contributes)
    //   .filter(contribute => {
    //     const [ contributePoint, contributeTo ] = contribute.split(':');
    //     if(!contributeTo) {
    //       return false;
    //     }
    //
    //     return !manifests.some(m => m.contributes?.[contributePoint]?.some(def => def.name === contributeTo))
    //   });
    //
    // if(undefinedContributeTos.length > 0) {
    //   fail(`扩展 ${manifest.name} 的 contributes 中, [${undefinedContributeTos.join(',')}] 没有提供者`);
    //   return;
    // }

    return isValid;
  }

  assertManifestContributionPointsIsValid(manifest: IExpansionManifest, contributionPoints: IContributionPointDefinitions) {
    let isValid = true;
    const { assertOptions } = this.options;

    Object.keys(contributionPoints).forEach(keyword => {
      const keywordDefinition = this.keywordDefinitions[keyword].definition;
      // 检查 contributionPoints 中，name 必填
      const unnamedIndex = contributionPoints[keyword].reduce((errors, def, index) => {
        if (!def.name) {
          errors.push(index);
        }
        return errors;
      }, []);

      if (unnamedIndex.length > 0) {
        fail(`扩展 ${manifest.name} 的 contributionPoints.${keyword} 中，第 [${unnamedIndex.join(',')}] 项没有定义名称`);
        isValid = false;
        return;
      }

      if (!keywordDefinition.disableNameObeyNamespaceRule && !assertOptions?.ignoreNamespaceKeywords?.includes(keyword) && !assertOptions?.ignoreNamespaceManifests?.includes(manifest.name)) {
        // 检查 contributionPoints 中，name 是否遵循命名规范
        const invalidNamespaces = contributionPoints[keyword].filter(def => !def.name.startsWith(`${manifest.name}.`));

        if (invalidNamespaces.length > 0) {
          fail(`扩展 ${manifest.name} 的 contributionPoints.${keyword} 中，[${invalidNamespaces.map(def => def.name).join(',')}] 不遵循命名空间规范，必须以 ${manifest.name}. 作为开头`);
          isValid = false;
          return;
        }
      }
    });
    return isValid;
  }

  assertIsDependentValid(name: string, dependent: string) {
    const manifest = this.options.manifests.find(m => m.name == name);

    if (manifest?.dependencies?.hasOwnProperty(dependent)) {
      return true;
    }

    fail(`扩展 ${manifest.name} 并没有定义 ${dependent} 的依赖，请检查`);
  }

  /**
   * manifests 同名检查
   * @param manifests
   * @private
   */
  private assertManifestNameUniqueIsValid(manifests: IExpansionManifest[]): boolean {
    const names = getJSONValuesByPath(manifests, 'name');

    const duplicateNames = this.getDuplicateValues(names);

    if (duplicateNames.length > 0) {
      fail(`有多个扩展名称相同，请检查这些扩展：${duplicateNames.join(',')}`);
      return false;
    }
    return true;
  }

  /**
   * contributionKeywords 同名检查
   * @param manifests
   * @private
   */
  private assertContributionKeywordUniqueIsValid(manifests: IExpansionManifest[]): boolean {
    const keywordNames = getJSONValuesByPath(manifests, 'contributionKeywords.name');

    const duplicateNames = this.getDuplicateValues(keywordNames);

    if (duplicateNames.length > 0) {
      fail(`有多个 contributionKeywords【${duplicateNames.join(',')}】 名称相同，请对应的扩展`);
      return false;
    }
    return true;
  }


  /**
   * 检查关键字的贡献点名称是否重复
   * @param keyword
   * @private
   */
  private assertContributionNameIsDuplicated(keyword: string): true | void {
    const { manifests } = this.options;
    const keywordDefinition = this.keywordDefinitions[keyword].definition;
    const contributesNameMaps: Record<string, string[]> = {};
    const contributionPointNameMaps: Record<string, string[]> = {};

    manifests.forEach(m => {
      if (m.contributes && m.contributes[keyword]) {
        const names = m.contributes[keyword].map(def => def.name);
        names.forEach(value => {
          if (!contributesNameMaps[value]) {
            contributesNameMaps[value] = [];
          }

          contributesNameMaps[value].push(m.name);
        });
      }

      if (keywordDefinition.supportContributionPoint && m.contributionPoints && m.contributionPoints[keyword]) {
        const names = m.contributionPoints[keyword].map(def => def.name);
        names.forEach(value => {
          if (!contributionPointNameMaps[value]) {
            contributionPointNameMaps[value] = [];
          }

          contributionPointNameMaps[value].push(m.name);
        });
      }

    });

    const duplicatedContributeNames = Object.keys(contributesNameMaps).filter(key => contributesNameMaps[key].length > 1);

    if (duplicatedContributeNames.length > 0) {
      const detailMessage = duplicatedContributeNames.map(value => `${value} 被 [${contributesNameMaps[value].join(',')}] 重复定义;`);
      fail(`contributes.${keyword} 不满足全局唯一的要求，其中:\n  ${detailMessage.join('\n  ')}`);
      return;
    }

    const duplicatedContributionPointNames = Object.keys(contributionPointNameMaps).filter(key => contributionPointNameMaps[key].length > 1);
    if (duplicatedContributionPointNames.length > 0) {
      const detailMessage = duplicatedContributionPointNames.map(value => `${value} 被 [${contributionPointNameMaps[value].join(',')}] 重复定义;`);
      fail(`contributionPoints.${keyword} 不满足全局唯一的要求，其中:\n  ${detailMessage.join('\n  ')}`);
      return;
    }

    return true;
  }


  /**
   * 根据 activationEvents 中定义的事件，结合 IActivationEventDefinition 找到最早执行的激活时间，并返回再 activationEvents 中的所以
   * @param activationEvents
   * @private
   */
  private getEarliestActivationEventIndex(activationEvents: string[]): number {
    const { activationEventDefinitions } = this.options;
    return activationEvents.reduce((min: number | undefined, event) => {
      const index = activationEventDefinitions.findIndex(def => def.name === event);
      if (min === undefined) {
        return index;
      } else {
        return Math.min(min, index);
      }

    }, undefined);
  }

  private getDuplicateValues(values: string[]): string[] {
    const cache = values.reduce((cache, value) => {
      if (cache[value] === undefined) {
        cache[value] = 0;
      } else {
        cache[value] += 1;
      }
      return cache;
    }, {});

    return Object.keys(cache).filter(value => cache[value] > 0);
  }
}

/**
 * production 环境中，通过 console.error 输出错误
 * development 环境中，直接 throw error
 * @param message
 */
export function fail(message: string) {
  console.error(message);
  // @ts-ignore
  if (process.env.NODE_ENV !== 'production') {
    // throw new Error(message);
  }
}
