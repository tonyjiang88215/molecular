import { __test__createExpansionSystem, __test__createImpl } from '../../__test__/helper';
import { ExpansionFeatureNames } from '../constants';

describe('ContributionKeywords test', () => {
  const activationEventDefinitions = [
    { name: 'initialized' },
  ];

  describe('Production 模式下', () => {
    // @ts-ignore
    const NODE_ENV = process.env.NODE_ENV;

    beforeEach(() => {
      // @ts-ignore
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      // @ts-ignore
      process.env.NODE_ENV = NODE_ENV;
    });

    it('当 contributes 中访问的 contributionKeywords 不存在时，应该抛出异常', async () => {
      const manifests = [
        {
          'name': 'A',
          'contributes': {
            'B': [],
          },
          'activationEvents': ['initialized'],
          'impl': __test__createImpl(),
        },
      ];

      const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
      await expect(expansionSystem.activate('initialized')).resolves.not.toThrow();
    });


  });


  it('调用 registerContributionKeyword 的 name，必须在 manifest 中进行声明，否则抛出异常', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionKeywords': [
          {
            'name': 'sidebars',
          },
        ],
        'activationEvents': ['initialized'],
        'impl': __test__createImpl({
          activate: (ctx) => {
            expect(() => ctx.registerContributionKeyword('sidebars', {})).toBeDefined();
            // expect(() => ctx.registerContributionKeyword('sidebars.icons', {})).toBeDefined();
            // expect(() => ctx.registerContributionKeyword('sidebars1', {})).toBeUndefined();
          },
        }),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    await expansionSystem.activate('initialized');

  });

  it('sidebars 提供 contributionKeyword，approveView 贡献代码，sidebars 应该能够正确获取 approveView 贡献的参数', async () => {
    const requestContributionFn = jest.fn();
    const requestRevokeContributionFn = jest.fn();

    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionKeywords': [
          {
            'name': 'sidebars',
          },
        ],
        'activationEvents': ['initialized'],
        'impl': __test__createImpl({
          activate: (ctx) => {
            ctx.registerContributionKeyword('sidebars', {
              requestContributionPoint: requestContributionFn,
              requestRevokeContributionPoint: requestRevokeContributionFn,
            });
          },
        }),
      },
      // approveView
      {
        'name': 'approveView',
        'contributionPoints': {
          'sidebars': [
            {
              name: 'approveView.icon',
              title: '审批视图',
            },
          ],
        },
        'activationEvents': ['initialized'],
        'impl': __test__createImpl(),
      },
    ];

    const expansionSystem = __test__createExpansionSystem({ manifests, activationEventDefinitions });
    await expansionSystem.activate('initialized');

    const requestContributionCtx = expansionSystem['beanManager'].getBean(ExpansionFeatureNames.ContextManager).getRequestContributionContext('approveView', 'sidebars');

    expect(requestContributionFn).toBeCalledTimes(1);
    expect(requestContributionFn).toBeCalledWith(requestContributionCtx, [
      {
        name: 'approveView.icon',
        title: '审批视图',
      },
    ]);
  });

});


