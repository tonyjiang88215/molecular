import type { IActivationEventDefinition, IContributionKeywordDefinition, IExpansionManifest } from './manifests';
import { IContributeDefinitions } from './manifests';
import { getJSONValuesByPath } from './util';
import { ExpansionManifestAssertionOptions } from './services';
export { ExpansionManifestAssertionOptions };

/**
 * 检查 manifests 是否正确，包含以下检查内容：
 *  - manifest 名称唯一性检查
 *  - manifest 依赖正确性检查
 *  - contributionKeywords 必须以插件名称作为开始

 * @param manifests
 * @param activationEventDefinitions
 * @param assertionOptions
 */
// export function assertManifestsIsValid(manifests: IExpansionManifest[], activationEventDefinitions: IActivationEventDefinition[], assertionOptions: ExpansionManifestAssertionOptions): true | void {
//   if (assertManifestNameUniqueIsValid(manifests) !== true) {
//     return;
//   }
//
//   if (assertContributionKeywordUniqueIsValid(manifests) !== true) {
//     return;
//   }
//
//   const contributionKeywords = manifests.reduce((keywords, manifest) => {
//     if (manifest.contributionKeywords) {
//       manifest.contributionKeywords.forEach(keywordDefinition => {
//         keywords[keywordDefinition.name] = {
//           contributor: manifest.name,
//           definition: keywordDefinition,
//         };
//       });
//     }
//
//     return keywords;
//   }, {});
//
//   manifests.forEach(manifest => {
//     assertManifestIsValid(manifest, manifests, { activationEventDefinitions, contributionKeywords, assertionOptions });
//   });
//
//
// }


type ManifestCheckOptions = {
  activationEventDefinitions: IActivationEventDefinition[],
  contributionKeywords: Record<string, IContributionKeywordDefinition>,
  assertionOptions: ExpansionManifestAssertionOptions
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
 *
 * @param manifest
 * @param manifests
 * @param options
 */
// export function assertManifestIsValid(manifest: IExpansionManifest, manifests: IExpansionManifest[], options: ManifestCheckOptions): true | void {
//   const { activationEventDefinitions, contributionKeywords, assertionOptions } = options;
//
//   if (!manifest.name) {
//     fail(`扩展 name 属性必填，请检查`);
//     return;
//   }
//
//   // 检查 activationEvents 是否声明
//   if (!manifest.activationEvents || manifest.activationEvents.length === 0) {
//     fail(`扩展 ${manifest.name} 没有定义 activationEvents`);
//     return;
//   }
//
//   // 检查 activationEvents 是否声明
//   const undefinedEvents = manifest.activationEvents.filter(event => !activationEventDefinitions.some(def => def.name === event));
//   if (undefinedEvents.length > 0) {
//     fail(`扩展 ${manifest.name} 的 activationEvents 中，[${undefinedEvents.join((','))}] 没有被声明`);
//     return;
//   }
//
//   // 检查依赖是否正确
//   if (manifest.dependencies) {
//     const undefinedDependencies = Object.keys(manifest.dependencies).filter(dependent => !manifests.some(m => m.name === dependent));
//     if (undefinedDependencies.length > 0) {
//       fail(`扩展 ${manifest.name} 的 dependencies 中，[${undefinedDependencies.join((','))}] 不存在`);
//       return;
//     }
//
//     // 检查依赖的触发时机顺序是否正确
//     if (manifest.activationEvents) {
//       const earliestActivationEventIndex = getEarliestActivationEventIndex(activationEventDefinitions, manifest.activationEvents);
//       const wrongActivationDependencies = Object.keys(manifest.dependencies).filter(dependent => {
//         const dependentManifest = manifests.find(m => m.name === dependent);
//         if (!dependentManifest.activationEvents || dependentManifest.activationEvents.length === 0) {
//           return false;
//         } else {
//           return getEarliestActivationEventIndex(activationEventDefinitions, dependentManifest.activationEvents) > earliestActivationEventIndex;
//         }
//       });
//
//       if (wrongActivationDependencies.length > 0) {
//         fail(`扩展 ${manifest.name} 的 dependencies 中，[${wrongActivationDependencies.join((','))}] 的时机可能晚于 ${manifest.name}，请确认`);
//         return;
//       }
//     }
//
//   }
//
//   if (manifest.contributes) {
//     // 检查 contributes 是否有对应的 keyword
//     const undefinedKeywordContributes = Object.keys(manifest.contributes)
//       // .map(contribute => contribute.split(':')[0])
//       .filter(keyword => !contributionKeywords[keyword]);
//     if (undefinedKeywordContributes.length > 0) {
//       fail(`扩展 ${manifest.name} 的 contributes 中，contributionKeywords [${undefinedKeywordContributes.join((','))}] 没有提供者`);
//       return;
//     }
//
//     // 检查 contributes 是否都是数组
//     const invalidTypedContributes = Object.keys(manifest.contributes).filter(name => !(manifest.contributes[name] instanceof Array));
//
//     if (invalidTypedContributes.length > 0) {
//       fail(`扩展 ${manifest.name} 的 contributes 中，[${invalidTypedContributes.join(',')}] 不是数组`);
//       return;
//     }
//
//     // 检查 contributionPoints 中，name 必填
//     Object.keys(manifest.contributes).forEach(keyword => {
//       const keywordDefinition = findKeywordDefinitions(manifests, keyword);
//       // 检查 contributionPoints 中，name 必填
//       const unnamedIndex = manifest.contributes[keyword].reduce((errors, def, index) => {
//         if (!def.name) {
//           errors.push(index);
//         }
//         return errors;
//       }, []);
//
//       if (unnamedIndex.length > 0) {
//         fail(`扩展 ${manifest.name} 的 contributes.${keyword} 中，第 [${unnamedIndex.join(',')}] 项没有定义名称`);
//         return;
//       }
//
//       //
//       if (!keywordDefinition.disableNameObeyNamespaceRule && !assertionOptions?.ignoreNamespaceKeywords?.includes(keyword) && !assertionOptions?.ignoreNamespaceManifests?.includes(manifest.name)) {
//         // 检查 contributionPoints 中，name 是否遵循命名规范
//         const invalidNamespaces = manifest.contributes[keyword].filter(def => !def.name.startsWith(`${manifest.name}.`));
//
//         if (invalidNamespaces.length > 0) {
//           fail(`扩展 ${manifest.name} 的 contributes.${keyword} 中，[${invalidNamespaces.map(def => def.name).join(',')}] 不遵循命名空间规范，必须以 ${manifest.name}. 作为开头`);
//           return;
//         }
//       }
//
//
//       // 检查 contributes 是否都有 cp
//       if (contributionKeywords[keyword].supportContributionPoint) {
//         const cpUndefinedContributes = manifest.contributes[keyword].filter(def => !def.cp);
//
//         if (cpUndefinedContributes.length > 0) {
//           fail(`扩展 ${manifest.name} 的 contributes.${keyword} 中，[${cpUndefinedContributes.map(def => def.name).join(',')}] 中存在没有指定 cp 的声明`);
//           return;
//         }
//       }
//
//     });
//
//     // todo 检查 contributesTo 是否有对应的提供者
//     // const undefinedContributeTos = Object.keys(manifest.contributes)
//     //   .filter(contribute => {
//     //     const [ contributePoint, contributeTo ] = contribute.split(':');
//     //     if(!contributeTo) {
//     //       return false;
//     //     }
//     //
//     //     return !manifests.some(m => m.contributes?.[contributePoint]?.some(def => def.name === contributeTo))
//     //   });
//     //
//     // if(undefinedContributeTos.length > 0) {
//     //   fail(`扩展 ${manifest.name} 的 contributes 中, [${undefinedContributeTos.join(',')}] 没有提供者`);
//     //   return;
//     // }
//   }
//
//
//   if (manifest.contributionPoints) {
//     Object.keys(manifest.contributionPoints).forEach(keyword => {
//       const keywordDefinition = findKeywordDefinitions(manifests, keyword);
//       // 检查 contributionPoints 中，name 必填
//       const unnamedIndex = manifest.contributionPoints[keyword].reduce((errors, def, index) => {
//         if (!def.name) {
//           errors.push(index);
//         }
//         return errors;
//       }, []);
//
//       if (unnamedIndex.length > 0) {
//         fail(`扩展 ${manifest.name} 的 contributionPoints.${keyword} 中，第 [${unnamedIndex.join(',')}] 项没有定义名称`);
//         return;
//       }
//
//       if (!keywordDefinition.disableNameObeyNamespaceRule && !assertionOptions?.ignoreNamespaceKeywords?.includes(keyword) && !assertionOptions?.ignoreNamespaceManifests?.includes(manifest.name)) {
//         // 检查 contributionPoints 中，name 是否遵循命名规范
//         const invalidNamespaces = manifest.contributionPoints[keyword].filter(def => !def.name.startsWith(`${manifest.name}.`));
//
//         if (invalidNamespaces.length > 0) {
//           fail(`扩展 ${manifest.name} 的 contributionPoints.${keyword} 中，[${invalidNamespaces.map(def => def.name).join(',')}] 不遵循命名空间规范，必须以 ${manifest.name}. 作为开头`);
//           return;
//         }
//       }
//     });
//   }
//
//   // 检查 contributionKeywords 命名正确性
//   if (manifest.contributionKeywords) {
//     // if (manifest.contributionPoints.length > 1) {
//     //   fail(`扩展 ${manifest.name} 的 contributionPoint 定义有多个，只支持一个`);
//     //   return;
//     // }
//
//     manifest.contributionKeywords.forEach((contributionKeyword, index) => {
//       if (!contributionKeyword.name.startsWith(manifest.name)) {
//         fail(`扩展 ${manifest.name} 的 contributionKeywords[${index}].name: ${contributionKeyword.name} 不是以 ${manifest.name} 开始的`);
//         return;
//       }
//
//
//       // 检查贡献提供的内容 name 是否全局唯一
//       if (assertContributionNameIsDuplicated(manifests, manifest, contributionKeyword.name) !== true) {
//         return;
//       }
//
//       // if (!contributionPoint.definitionSchema) {
//       //   fail(`扩展 ${manifest.name} 的 contributionPoint 没有定义 definitionSchema`);
//       //   return;
//       // }
//
//       // // 检查贡献提供的内容 name 是否全局唯一
//       // if (assertContributionNameIsDuplicated(manifests, manifest.name, contributionKeyword.name, 'name') !== true) {
//       //   return;
//       // }
//
//       // if (contributionPoint.isIdentityPropertyObeyNamespaceRule) {
//       //   if (assertContributionIdentityPropertiesIsNamespaceValid(manifests, manifest.name, contributionPoint.name, contributionPoint.identityPropertyPath) !== true) {
//       //     return;
//       //   }
//       // }
//
//       // if (contributionPoint.autoReplenishContributes) {
//       //   assertAutoReplenishContributesValid(manifest.name, contributionPoint.name, contributionPoint.autoReplenishContributes);
//       // }
//
//       // if (contributionPoint.definitionSchema && contributionPoint.identityPropertyPath) {
//       //   // if (assertContributionIdentityIsValid(manifest.name, contributionPoint) !== true) {
//       //   //   return;
//       //   // }
//       //
//       //   if (assertContributionIdentityPropertiesIsDuplicated(manifests, manifest.name, contributionPoint.name, 'name') !== true) {
//       //     return;
//       //   }
//       //
//       //   if(contributionPoint.isIdentityPropertyObeyNamespaceRule) {
//       //     if(assertContributionIdentityPropertiesIsNamespaceValid(manifests, manifest.name, contributionPoint.name, contributionPoint.identityPropertyPath) !== true) {
//       //       return;
//       //     }
//       //   }
//       // }
//     });
//
//
//   }
//
//
//   return true;
// }

function assertManifestContributionPointsIsValid(manifest: IExpansionManifest, manifests: IExpansionManifest[], assertionOptions: ExpansionManifestAssertionOptions) {
  Object.keys(manifest.contributionPoints).forEach(keyword => {
    const keywordDefinition = findKeywordDefinitions(manifests, keyword);
    // 检查 contributionPoints 中，name 必填
    const unnamedIndex = manifest.contributionPoints[keyword].reduce((errors, def, index) => {
      if (!def.name) {
        errors.push(index);
      }
      return errors;
    }, []);

    if (unnamedIndex.length > 0) {
      fail(`扩展 ${manifest.name} 的 contributionPoints.${keyword} 中，第 [${unnamedIndex.join(',')}] 项没有定义名称`);
      return;
    }

    if (!keywordDefinition.disableNameObeyNamespaceRule && !assertionOptions?.ignoreNamespaceKeywords?.includes(keyword) && !assertionOptions?.ignoreNamespaceManifests?.includes(manifest.name)) {
      // 检查 contributionPoints 中，name 是否遵循命名规范
      const invalidNamespaces = manifest.contributionPoints[keyword].filter(def => !def.name.startsWith(`${manifest.name}.`));

      if (invalidNamespaces.length > 0) {
        fail(`扩展 ${manifest.name} 的 contributionPoints.${keyword} 中，[${invalidNamespaces.map(def => def.name).join(',')}] 不遵循命名空间规范，必须以 ${manifest.name}. 作为开头`);
        return;
      }
    }
  });
}

function findKeywordDefinitions(manifests: IExpansionManifest[], keyword: string): IContributionKeywordDefinition {
  for(let i = 0; i < manifests.length; i++) {
    if(manifests[i].contributionKeywords) {
      for(let j = 0; j < manifests[i].contributionKeywords.length; j ++ ) {
        if(manifests[i].contributionKeywords[j].name == keyword) {
          return manifests[i].contributionKeywords[j];
        }
      }
    }
  }
}


function assertManifestNameUniqueIsValid(manifests: IExpansionManifest[]): boolean {
  const names = getJSONValuesByPath(manifests, 'name');

  const duplicateNames = getDuplicateValues(names);

  if (duplicateNames.length > 0) {
    fail(`有多个扩展名称相同，请检查这些扩展：${duplicateNames.join(',')}`);
    return false;
  }
  return true;
}

function assertContributionKeywordUniqueIsValid(manifests: IExpansionManifest[]): boolean {
  const keywordNames = getJSONValuesByPath(manifests, 'contributionKeywords.name');

  const duplicateNames = getDuplicateValues(keywordNames);

  if (duplicateNames.length > 0) {
    fail(`有多个 contributionKeywords【${duplicateNames.join(',')}】 名称相同，请对应的扩展`);
    return false;
  }
  return true;
}

function assertAutoReplenishContributesValid(manifestName: string, contributionPointName: string, autoReplenishContributes: IContributeDefinitions) {
  Object.keys(autoReplenishContributes).forEach(name => {
    if (!(autoReplenishContributes[name] instanceof Array)) {
      fail(`扩展 ${manifestName} 提供的贡献点 ${contributionPointName} 中， autoReplenishContributes.${name} 不是数组`);
      return;
    }

    if (autoReplenishContributes[name].some(item => !item.name)) {
      fail(`扩展 ${manifestName} 提供的贡献点 ${contributionPointName} 中， autoReplenishContributes.${name} 中有没有提供 name 的声明`);
      return;
    }
  });
}

// function assertContributionIdentityIsValid(name: string, contribution: IContributionKeywordDefinition): true | void {
//   const { definitionSchema, disableNameUnique } = contribution;
//
//   const property = isNameUnique.split('.').reduce((definition, property) => {
//     if (!definition) {
//       return undefined;
//     }
//
//     if (definition.type === 'object') {
//       return definition.properties[property];
//     }
//
//     // @ts-ignore
//     if (definition.type === 'array' && definition.items.type === 'object') {
//       // @ts-ignore
//       return definition.items.properties[property];
//     }
//
//     return undefined;
//   }, definitionSchema);
//
//   if (property === undefined) {
//     fail(`扩展 ${name} 无法在 contributionPoints.definitionSchema 中，找到 ${property} 属性，请检查`);
//   }
//
//   return true;
// }

function assertContributionNameIsDuplicated(manifests: IExpansionManifest[], keywordManifest: IExpansionManifest, keyword: string): true | void {
  const keywordDefinition = keywordManifest.contributionKeywords.find(def => def.name === keyword);
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

function assertContributionIdentityPropertiesIsNamespaceValid(manifests: IExpansionManifest[], contributionProvider: string, contributionPointName: string, path: string): true | void {
  const invalidValues = manifests.reduce((invalidValues, m) => {
    if (m.contributes) {
      Object.keys(m.contributes)
        .filter(name => name === contributionPointName || name.startsWith(`${contributionPointName}:`))
        .forEach(name => {
          const values = getJSONValuesByPath(m.contributes[name], path);

          const invalids = values.filter(value => !isNamespaceValid(m.name, value));
          if (invalids.length > 0) {
            invalidValues.push({
              manifest: m.name,
              values: invalids,
            });
          }
        });
    }
    return invalidValues;
  }, []);

  if (invalidValues.length > 0) {
    const detailMessage = invalidValues.map(({
                                               manifest,
                                               values,
                                             }) => `扩展 ${manifest} 的 [${values.join(',')}] 不是以 ${manifest} 开头;`);
    fail(`扩展 ${contributionProvider} 的 ${contributionPointName} 不满足命名空间约束，其中:\n  ${detailMessage.join('\n  ')}`);

  }

  return true;
}

/**
 * 检查依赖项是否被声明
 * @param manifest
 * @param dependent
 */
export function assertIsDependentValid(manifest: IExpansionManifest, dependent: string): true | void {
  if (manifest.dependencies && manifest.dependencies.hasOwnProperty(dependent)) {
    return true;
  }

  fail(`扩展 ${manifest.name} 并没有定义 ${dependent} 的依赖，请检查`);
}

export function assertContributionKeywordNameIsValid(namespace: string, name: string, assertionOptions: ExpansionManifestAssertionOptions): true | void {
  if (namespace === name || name.startsWith(`${namespace}`)) {
    return true;
  }

  if (assertionOptions?.ignoreKeywordNamespaceCheckManifests?.includes(namespace)) {
    return true;
  }

  fail(`${name} 未遵循命名规范，并不是以 ${namespace} 作为起始`);
}

/**
 * 检查 name 是否以 namespace 作为起始
 * @param namespace
 * @param name
 */
export function assertNameIsValid(namespace: string, name: string): true | void {
  if (isNamespaceValid(namespace, name)) {
    return true;
  }

  fail(`${name} 未遵循命名规范，并不是以 ${namespace} 作为起始`);
}

function isNamespaceValid(namespace: string, name: string): boolean {
  return namespace === name || name.startsWith(`${namespace}.`);
}

/**
 * 检查 contributionPointName 是否被声明
 * @param manifest
 * @param contributionKeywordName
 */
export function assertContributionKeywordIsDefined(manifest: IExpansionManifest, contributionKeywordName: string): true | void {
  if (manifest.contributionKeywords?.some(cp => cp.name == contributionKeywordName || cp.contextName == contributionKeywordName)) {
    return true;
  }

  fail(`扩展 ${manifest.name} 中，找不到名为 ${contributionKeywordName} 的 keyword 声明，请检查 contributionKeywords 定义 `);
}

/**
 * 检查 activationEvent 是否被声明
 * @param activationEvents
 * @param event
 */
export function assertActivationEventIsDefined(activationEvents: IActivationEventDefinition[], event: string): true | void {
  if (activationEvents.some(def => def.name === event)) {
    return true;
  }

  fail(`激活事件 ${event} 不在 activationEventDefinitions 中，请检查！`);
}

/**
 * 检查 contributionPoints 是否存在
 * @param contributionPoints
 * @param name
 */
export function assertContributionPointExists(contributionPoints: Record<string, any>, name: string): true | void {
  if (contributionPoints.hasOwnProperty(name)) {
    return true;
  }

  fail(`contributionPoint ${name} 不存在，请检查贡献点的依赖顺序是否正确`);
}

/**
 * 检查 activationEventDefinitions 合法性
 * @param activationEventDefinitions
 */
// export function assertActivationEventDefinitionIsValid(activationEventDefinitions: IActivationEventDefinition[]): true | void {
//   if (activationEventDefinitions.length === 0) {
//     fail(`activationEventDefinitions 不能为空`);
//     return;
//   }
//
//   const rootEvents = activationEventDefinitions.filter(def => !def.preActivationEvents || def.preActivationEvents.length === 0);
//   if (rootEvents.length > 1) {
//     fail(`activationEventDefinitions 中，只能有一个入口事件，现在有 [${rootEvents.map(def => def.name).join(',')}] ${rootEvents.length} 个`);
//     return;
//   }
//
//   return true;
// }

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


function getEarliestActivationEventIndex(definitions: IActivationEventDefinition[], activationEvents: string[]): number {

  return activationEvents.reduce((min: number | undefined, event) => {
    const index = definitions.findIndex(def => def.name === event);
    if (min === undefined) {
      return index;
    } else {
      return Math.min(min, index);
    }

  }, undefined);
}

function getContributeIdentityPropertyValues(manifest: IExpansionManifest, contributionPointName: string, identityPropertyPath: string): string[] {
  if (!manifest.contributes[contributionPointName]) {
    return [];
  }

  return identityPropertyPath.split('.').reduce((elements, property) => {
    return elements.reduce((collections, element) => {
      if (element instanceof Array) {
        element.forEach(item => {
          collections.push(item[property]);
        });
      } else {
        collections.push(element[property]);
      }
      return collections;
    }, []);
  }, manifest.contributes[contributionPointName]);
}


function getDuplicateValues(values: string[]): string[] {
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
