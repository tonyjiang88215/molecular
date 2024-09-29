import Mock = jest.Mock;

import { ExpansionFeatureNames } from '../constants';
import { __test__createExpansionSystem, __test__createImpl } from '../../__test__/helper';
import { IActivateContext } from '../../../helper';

describe('ExtensionManager 测试', () => {

  const activationEventDefinitions = [
    {
      name: 'initialized',
    },
    {
      name: 'requestClose',
      preActivationEvents: ['initialized'],
    },
  ];

  it('activate 时，插件加载顺序正确', async () => {

    const manifests = [
      {
        'name': 'a',
        'dependencies': {
          'b': '*',
        },
        'activationEvents': ['initialized'],
        'impl': __test__createImpl(),
      },
      {
        'name': 'b',
        'activationEvents': ['initialized'],
        'impl': __test__createImpl({ delay: 500 }),
      },
      {
        name: 'c',
        'activationEvents': ['initialized'],
        'impl': __test__createImpl({ delay: 200 }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    const dynamicImport = expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ExtensionManager)['dynamicImport'] as Mock;

    await expansionSystem.activate('initialized');

    expect(dynamicImport.mock.calls).toHaveLength(3);
    expect(dynamicImport.mock.calls[0]).toEqual(['b']);
    expect(dynamicImport.mock.calls[1]).toEqual(['c']);
    expect(dynamicImport.mock.calls[2]).toEqual(['a']);


  });

  it('同一个扩展，在没有被销毁的情况下，不会被 activate 两遍', async () => {
    const activateHandler = jest.fn();

    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'impl': __test__createImpl({
          activate: activateHandler,
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });

    await expansionSystem.activate('initialized');
    await expansionSystem.activate('initialized');

    expect(activateHandler).toBeCalledTimes(1);
  });

  it('扩展没有被加载的情况下，直接执行 deactivate 的事件，不会触发 deactivate 函数', async () => {
    const activateHandler = jest.fn();
    const deactivateHandler = jest.fn();

    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: activateHandler,
          deactivate: deactivateHandler,
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });

    await expansionSystem.deactivate('requestClose');

    expect(activateHandler).toBeCalledTimes(0);
    expect(deactivateHandler).toBeCalledTimes(0);
  });

  it('deactivate 时，扩展的 deactivate 应该被调用', async () => {
    const activateHandler = jest.fn();
    const deactivateHandler = jest.fn();

    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: activateHandler,
          deactivate: deactivateHandler,
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });

    await expansionSystem.activate('initialized');
    await expansionSystem.deactivate('requestClose');
    await expansionSystem.deactivate('requestClose');

    expect(deactivateHandler).toBeCalledTimes(1);
  });

  it('deactivate 时，通过 ctx.addDisposer 添加的函数应该被执行', async () => {
    const disposer = jest.fn();

    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: (ctx: IActivateContext) => {
            ctx.addDisposer(disposer);
          }
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    await expansionSystem.activate('initialized');
    await expansionSystem.deactivate('requestClose');

    expect(disposer).toHaveBeenCalledTimes(1);
  });

  it('扩展通过 activate 返回的 api 对象，应该在加载后，可以通过 extensionManager.getApi 获取到', async () => {
    const api = {};
    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: () => api,
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    const extensionManager = expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ExtensionManager);

    await expansionSystem.activate('initialized');
    expect(extensionManager.getApi('sidebars')).toBe(api);

  });

  it('扩展提供的 api 对象，在销毁后，应该被移除', async () => {
    const api = {};
    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: () => api,
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    const extensionManager = expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ExtensionManager);

    await expansionSystem.activate('initialized');
    expect(extensionManager.getApi('sidebars')).toBe(api);

    await expansionSystem.deactivate('requestClose');
    expect(extensionManager.getApi('sidebars')).toBeUndefined();
  });

  it('调用 context.getExtensions 时，如果获取的 extension 没有在 manifest 中声明，则应该抛出异常', async () => {
    const api = {};
    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: (ctx) => {
            return api;
          },
        }),
      },
      {
        'name': 'ApproveView',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: (ctx: IActivateContext) => {
            expect(() => ctx.getExtension('sidebars')).toThrow();
          },
        }),
      }
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    await expansionSystem.activate('initialized');
  });

  it('正确定义 dependencies 后，可以获取到依赖扩展的 api 对象', async () => {
    const api = {};
    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'impl': __test__createImpl({
          activate: (ctx) => {
            return api;
          },
        }),
      },
      {
        'name': 'ApproveView',
        'activationEvents': ['initialized'],
        'dependencies': {
          'sidebars': '*'
        },
        'impl': __test__createImpl({
          activate: (ctx: IActivateContext) => {
            const sidebarsApi = ctx.getExtension('sidebars');
            expect(sidebarsApi).toBe(api);
          },
        }),
      }
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    await expansionSystem.activate('initialized');
  });

  it('扩展被卸载后，如果再次执行激活生命周期，那么应该重新被加载', async () => {
    const activateHandler = jest.fn();
    const deactivateHandler = jest.fn();

    const manifests = [
      {
        'name': 'sidebars',
        'activationEvents': ['initialized'],
        'deactivationEvents': ['requestClose'],
        'impl': __test__createImpl({
          activate: activateHandler,
          deactivate: deactivateHandler,
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });

    await expansionSystem.activate('initialized');
    await expansionSystem.deactivate('requestClose');
    await expansionSystem.activate('initialized');

    expect(activateHandler).toBeCalledTimes(2);
    expect(deactivateHandler).toBeCalledTimes(1);

  })

});
