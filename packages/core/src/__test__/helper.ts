import { ExpansionSystem } from '../expansion-system';
import { ExpansionFeatureNames } from '../services/constants';
import { IActivationEventDefinition } from '../manifests';
import { IExpansionBaseContext, IRequestContributionContext } from '../services';

const noop = () => undefined;

export function __test__createImpl(options: {
  activate?: (ctx) => void,
  deactivate?: () => void,
  delay?: number
} = {}) {
  const { activate = noop, deactivate = noop, delay } = options;
  return {
    default: {
      activate, deactivate,
    },
    delay: delay,
  };
}

export function __test__createExpansionSystem(configure: { manifests: any[], activationEventDefinitions: IActivationEventDefinition[] }) {
  configure.manifests.forEach(m => m.remoteEntry = m.name);

  const expansionSystem = new ExpansionSystem(configure);

  const dynamicImport = jest.fn(name => {
    return new Promise((resolve) => {
      const impl = configure.manifests.find(m => m.name === name)?.impl;
      if (impl?.delay) {
        setTimeout(() => {
          resolve(impl);
        }, impl.delay);
      } else {
        resolve(impl);
      }
    });

  });

  // 重写 dynamicImports，从定义的 impl 属性上获取
  expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ExtensionManager)['dynamicImport'] = dynamicImport;

  return expansionSystem;
}


export function __test__getActivationContext(expansionSystem: ExpansionSystem, name: string): IExpansionBaseContext {
  return expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ContextManager).getActivateContext(name)
}

export function __test__getRequestContributionContext(expansionSystem: ExpansionSystem, name: string, cpName: string, contributeTo?: string): IRequestContributionContext{
  return expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ContextManager).getRequestContributionContext(name, cpName, contributeTo)
}

/**
 * 对 extension 注册的 contributionPointImpl 进行 stub
 * @param expansionSystem
 * @param name
 * @param impl
 */
export function __test__stubContributionPointsImpl(expansionSystem: ExpansionSystem, name: string, impl: any): ExpansionSystem {
  const ctx = __test__getActivationContext(expansionSystem, name);
  const originRegisterContributionPoints = ctx.registerContributionKeyword;

  ctx.registerContributionKeyword =  (name) => {
    return Reflect.apply(originRegisterContributionPoints, ctx, [name, impl]);
  }

  return expansionSystem;
}
