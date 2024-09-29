import { __test__createExpansionSystem, __test__createImpl } from '../../__test__/helper';

describe('ManifestManager Test', () => {
  const activationEventDefinitions = [
    {
      name: 'initialized',
    },
    {
      name: 'onLoaded',
      preActivationEvents: ['initialized'],
    },
  ];

  it('当存在多个同名 manifest 时，应该抛出异常', () => {
    const manifests = [
      {
        'name': 'sidebars',
        'impl': __test__createImpl(),
      },
      {
        'name': 'sidebars',
        'impl': __test__createImpl(),
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('当 contributes 中访问的 contributionPoint 不存在时，应该抛出异常', () => {


    const manifests = [
      {
        'name': 'A',
        'contributes': {
          'B': [],
        },
        'impl': __test__createImpl(),
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('定义 contributionPoints 的 name，必须保持和 name 一致', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionPoints': [
          {
            'name': 'sidebars2',
            'definitionSchema': {},
          },
        ],
        'impl': __test__createImpl(),
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('定义 contributionPoints 暂时支持一个', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionPoints': [
          {
            'name': 'sidebars',
            'definitionSchema': {},
          },
          {
            'name': 'sidebars.icon',
            'definitionSchema': {},
          },
        ],
        'impl': __test__createImpl(),
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('当 contributionPoints.identityPropertyPath 在 definitionSchema 中不存在时，应该抛出异常', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionPoints': [
          {
            'name': 'sidebars',
            'definitionSchema': {
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'name': {
                    'type': 'string',
                  },
                },
              },
            },
            'identityPropertyPath': 'name1',
          },
        ],
        'impl': __test__createImpl(),
      }
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('当 contributionPoints 定义了 identityPropertyPath 时，贡献者不遵循命名空间约定，应该抛出异常', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionPoints': [
          {
            'name': 'sidebars',
            'definitionSchema': {
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'name': {
                    'type': 'string',
                  },
                },
              },
            },
            'identityPropertyPath': 'name',
          },
        ],
        'impl': __test__createImpl(),
      },
      {
        'name': 'approveView',
        'dependencies': 'sidebars',
        'contributes': {
          'sidebars': [
            { 'name': 'icon' },
          ],
        },
      },
      {
        'name': 'approveViewV2',
        'dependencies': 'sidebars',
        'contributes': {
          'sidebars': [
            { 'name': 'approveView' },
          ],
        },
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  })

  it('当 contributionPoints 定义的全局唯一的属性重复时，应该抛出异常', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'contributionPoints': [
          {
            'name': 'sidebars',
            'definitionSchema': {
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'name': {
                    'type': 'string',
                  },
                },
              },
            },
            'identityPropertyPath': 'name',
          },
        ],
        'impl': __test__createImpl(),
      },
      {
        'name': 'approveView',
        'dependencies': 'sidebars',
        'contributes': {
          'sidebars': [
            { 'name': 'approveView' },
          ],
        },
      },
      {
        'name': 'approveViewV2',
        'dependencies': 'sidebars',
        'contributes': {
          'sidebars': [
            { 'name': 'approveView' },
          ],
        },
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('当 dependencies 不存在时，应该抛出异常', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'dependencies': {
          'event': '*',
        },
        'impl': __test__createImpl(),
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

  it('当 dependencies 的扩展执行时机晚于当前扩展时，应该抛出异常', async () => {
    const manifests = [
      // sidebars
      {
        'name': 'sidebars',
        'dependencies': {
          'event': '*',
        },
        'activationEvents': [
          'initialized',
        ],
      },

      {
        'name': 'event',
        'activationEvents': [
          'onLoaded',
        ],
      },
    ];

    expect(() => __test__createExpansionSystem({ manifests, activationEventDefinitions })).toThrow();
  });

});
