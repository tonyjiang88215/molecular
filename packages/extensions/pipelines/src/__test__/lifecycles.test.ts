import Mock = jest.Mock;

import { CommonHook, ConcurrentHook, WaterfallHook } from '@q7/shared';

import {
  __test__createExpansionSystem,
  __test__createImpl, __test__getRequestContributionContext,
} from '../../../core';
import {
  __test__createAnonymousImpl,
  __test__createMockImpl as createMockImplBase,
  __test__createStubExpansionSystem,
} from '../../__test__/helper';

import { manifest } from '../declare';
import { LifecyclesImplement } from '../impl';
import { LifecyclesExtension } from '../index';
import { createEventsManifest } from '../../events';


const sidebarsManifest = {
  'name': 'sidebars',
  'dependencies': {
    'lifecycles': '*',
  },
  'contributes': {
    'lifecycles': [
      {
        cp: 'sidebars.beforeInitial',
        name: 'sidebars.beforeInitial.default',
      },
      {
        cp: 'sidebars.whileInitializing',
        name: 'sidebars.whileInitializing.concurrent1',
      },
      {
        cp: 'sidebars.whileInitializing',
        name: 'sidebars.whileInitializing.concurrent2',
      },
      {
        cp: 'sidebars.whileInitializing',
        name: 'sidebars.whileInitializing.concurrent3',
      },
    ]
  },
  'contributionPoints': {
    'lifecycles': [
      {
        'name': 'sidebars.beforeInitial',
        'type': 'waterfall',
      },
      {
        'name': 'sidebars.whileInitializing',
        'type': 'concurrent',
      },
      {
        'name': 'sidebars.onInitialized',
        'type': 'common',
      },
    ],
  },
  'activationEvents': ['initialized'],
};

describe('lifecycles Test', () => {

  it('lifecycle 扩展可以正确被安装', async () => {
    const mockedImpl = createMockImpl();
    const expansionSystem = createExpansionSystem(mockedImpl);

    await expect(expansionSystem.activate('initialized')).resolves.not.toThrow();
  });

  it('对不存在的生命周期进行扩展，应该会抛出错误', async () => {
    const manifests = [
      getLifecycleManifest(),
      {
        name: 'base',
        dependencies: {
          'lifecycles': '*'
        },
        contributes: {
          lifecycles: [
            {
              name: 'base.handler',
              cp: 'unknown'
            }
          ]
        },
        activationEvents: ['initialized'],
        localImpl: __test__createAnonymousImpl(),
      }
    ];

    const activationEventDefinitions = [
      { name: 'initialized' },
    ];

    await expect(async () => {
      const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
      await expansionSystem.activate('initialized');
    }).rejects.toThrow('贡献点 unknown 不再依赖的插件中');
  });

  it('增加新的生命周期时，requestContribution 应该传递正确的参数', async () => {
    const mockedImpl = createMockImpl();
    const expansionSystem = createExpansionSystem(mockedImpl);
    await expansionSystem.activate('initialized');


    expect(mockedImpl.requestContribution as Mock).toHaveBeenCalledTimes(1);
    expect(mockedImpl.requestContribution).toHaveBeenCalledWith(
      __test__getRequestContributionContext(expansionSystem, 'sidebars', 'lifecycles'),
      sidebarsManifest.contributes.lifecycles,
    );

    expect(mockedImpl.requestContributionPoint).toHaveBeenCalledTimes(1);
    expect(mockedImpl.requestContributionPoint).toHaveBeenCalledWith(
      __test__getRequestContributionContext(expansionSystem, 'sidebars', 'lifecycles'),
      sidebarsManifest.contributionPoints.lifecycles,
    );
  });

  it('impl 应该正确创建对应的生命周期实例', async () => {
    const mockedImpl = createMockImpl();
    const expansionSystem = createExpansionSystem(mockedImpl);
    await expansionSystem.activate('initialized');

    const hookManager = mockedImpl['hookManager'];

    expect(hookManager.hasHooks('sidebars.beforeInitial')).toBeTruthy();
    expect(hookManager.hasHooks('sidebars.whileInitializing')).toBeTruthy();
    expect(hookManager.hasHooks('sidebars.onInitialized')).toBeTruthy();

    expect(hookManager.getHooks('sidebars.beforeInitial')).toBeInstanceOf(WaterfallHook);
    expect(hookManager.getHooks('sidebars.whileInitializing')).toBeInstanceOf(ConcurrentHook);
    expect(hookManager.getHooks('sidebars.onInitialized')).toBeInstanceOf(CommonHook);
  });

  it('sidebars 应该可以获取到 lifecycles 的 context', async () => {
    const mockedImpl = createMockImpl();
    const sidebarsImpl = __test__createImpl({
      activate: ctx => {
        expect(ctx).toHaveProperty('lifecycles');
      },
    });
    const expansionSystem = createExpansionSystem(mockedImpl, sidebarsImpl);
    await expansionSystem.activate('initialized');
  });

  it('执行不匹配的生命周期时，应该抛出错误', async () => {
    const mockedImpl = createMockImpl();
    const sidebarsImpl = __test__createImpl({
      activate: ctx => {
        expect(() => ctx.lifecycles.execute('sidebars.notExists', () => {})).toThrow();
      },
    });
    const expansionSystem = createExpansionSystem(mockedImpl, sidebarsImpl);
    await expansionSystem.activate('initialized');
  });

  it('注册不匹配的生命周期时，应该抛出错误', async () => {
    const mockedImpl = createMockImpl();
    const sidebarsImpl = __test__createImpl({
      activate: ctx => {
        expect(() => ctx.lifecycles.register('sidebars.beforeInitial.default1', () => {})).toThrow();
      },
    });
    const expansionSystem = createExpansionSystem(mockedImpl, sidebarsImpl);
    await expansionSystem.activate('initialized');
  });

  it('sidebars.beforeInitial 添加的 handler，可以正确被处理', async () => {
    const mockedImpl = createMockImpl();
    const sidebarsImpl = __test__createImpl({
      activate: ctx => {
        const handler = jest.fn();
        ctx.lifecycles.register('sidebars.beforeInitial.default', handler);
        ctx.lifecycles.execute('sidebars.beforeInitial', 'params-hit');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('params-hit');
      },
    });
    const expansionSystem = createExpansionSystem(mockedImpl, sidebarsImpl);
    await expansionSystem.activate('initialized');
  });

  it('sidebars.whileInitializing 添加的 handler, 应该并行处理', async () => {
    const finished = {
      handler1: false,
      handler2: false,
      handler3: false,
    };

    const mockedImpl = createMockImpl();
    const sidebarsImpl = __test__createImpl({
      activate: async ctx => {
        const handler1 = jest.fn(() => new Promise(resolve => {
          setTimeout(() => {
            finished.handler1 = true;
            resolve(undefined);
          }, 500);
        }));

        const handler2 = jest.fn(() => new Promise(resolve => {
          setTimeout(() => {
            finished.handler2 = true;
            resolve(undefined);
          }, 500);
        }));

        const handler3 = jest.fn(() => new Promise(resolve => {
          finished.handler3 = true;
          resolve(undefined);
        }));

        ctx.lifecycles.register('sidebars.whileInitializing.concurrent1', handler1);
        ctx.lifecycles.register('sidebars.whileInitializing.concurrent2', handler2);
        ctx.lifecycles.register('sidebars.whileInitializing.concurrent3', handler3);

        const startTime = Date.now();

        await ctx.lifecycles.execute('sidebars.whileInitializing');

        const endTime = Date.now();

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
        expect(handler3).toHaveBeenCalledTimes(1);

        expect(finished.handler1).toBeTruthy();
        expect(finished.handler2).toBeTruthy();
        expect(finished.handler3).toBeTruthy();

        expect((endTime - startTime) < 600).toBeTruthy();
      },
    });
    const expansionSystem = createExpansionSystem(mockedImpl, sidebarsImpl);
    await expansionSystem.activate('initialized');
  });

  it('通过 lifecycles:sidebars.beforeInitial 可以对 sidebars.beforeInitial 进行扩展', async () => {
    const mockedImpl = createMockImpl();
    const sidebarsImpl = __test__createImpl({
      activate: async ctx => {
      },
    });

    const extraManifests = [
      {
        name: 'approveView',
        dependencies: {
          'lifecycles': '*',
          'sidebars': '*',
        },
        contributes: {
          'lifecycles': [
            {
              cp: 'sidebars.beforeInitial',
              name: 'approveView.queryApproveData',
            },
          ],
        },
        activationEvents: ['initialized'],
      },
    ];

    const expansionSystem = createExpansionSystem(mockedImpl, sidebarsImpl, extraManifests);
  });


});

function getLifecycleManifest(lifecycles: LifecyclesExtension = new LifecyclesExtension()) {
  return {
    ...manifest,
    'activationEvents': ['initialized'],
    impl: {
      default: lifecycles,
    },
  };
}

function getSidebarManifest(sidebarImpl = __test__createImpl()) {
  return {
    ...sidebarsManifest,
    impl: sidebarImpl,
  };
}

function createMockImpl() {
  return createMockImplBase(LifecyclesImplement, manifest);
}

function createExpansionSystem(lifecycleImpl, sidebarImpl = __test__createImpl(), extraManifests = []) {
  const activationEventDefinitions = [
    { name: 'initialized' },
  ];

  const manifests = [
    getSidebarManifest(sidebarImpl),
    getLifecycleManifest(),
    createEventsManifest(['initialized']),
    ...extraManifests,
  ];

  return __test__createStubExpansionSystem({ manifests, activationEventDefinitions }, { 'lifecycles': lifecycleImpl });
}
