import { createEventsManifest } from '../index';
import { __test__createExpansionSystem, IExpansionManifest } from '@tjmol/core';
import { __test__createAnonymousImpl } from '../../__test__/helper';

describe('events Test', () => {

  describe('manifest 验证', () => {
    it('对不存在的 events 添加事件，会抛出异常', async () => {

      const manifests = [
        {
          name: 'a',
          dependencies: {
            events: '*',
          },
          activationEvents: ['initialized'],
          contributes: {
            events: [
              {
                cp: 'undefinedEvents',
                name: 'a.customizedHandler',
              },
            ]
          },
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {

            },
          }),
        },
      ];

      // todo
      expect(() => createExpansionSystem(manifests)).not.toThrow();
    });
  });

  describe('impl 验证', () => {

    it('dispatch 不是自己声明的事件，会抛出异常', async () => {
      const manifests = [
        {
          name: 'a',
          dependencies: {
            events: '*',
          },
          activationEvents: ['initialized'],
          contributionPoints: {
            events: [
              {
                name: 'a.onLoaded',
              },
            ],
          },
          localImpl: __test__createAnonymousImpl(),
        },
        {
          name: 'b',
          dependencies: {
            events: '*',
          },
          activationEvents: ['initialized'],
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {
              expect(() => ctx.events.dispatch('onLoaded')).toThrow('尝试 dispatch 一个不是自己声明的事件');
            },
          }),
        },
      ];

      const expansion = createExpansionSystem(manifests);
      await expansion.activate('initialized');

    });

    it('注册的事件回调函数应该能正确执行', async (done) => {

      const handler = jest.fn();

      const manifests = [
        {
          name: 'a',
          dependencies: {
            events: '*',
          },
          activationEvents: ['initialized'],
          contributionPoints: {
            events: [
              {
                name: 'a.onLoaded',
              },
            ],
          },
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {
              setTimeout(() => {
                ctx.events.dispatch('a.onLoaded', 'this is params');
              }, 0);
            },
          }),
        },
        {
          name: 'b',
          dependencies: {
            events: '*',
            a: '*',
          },
          activationEvents: ['initialized'],
          contributes: {
            events: [
              {
                cp: 'a.onLoaded',
                name: 'b.Handler',
              },
            ],
          },
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {
              ctx.events.register('b.Handler', handler);
            },
          }),
        },
      ];

      const expansion = createExpansionSystem(manifests);
      await expansion.activate('initialized');

      setTimeout(() => {
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('this is params');
        done();
      }, 100);


    });

    it('注册事件的顺序，和插件安装的顺序应该一致', async (done) => {

      const bHandler = jest.fn(params => params.value += 5);
      const cHandler = jest.fn(params => params.value *= 2);

      const result = { value: 1 };

      const manifests = [
        {
          name: 'a',
          dependencies: {
            events: '*',
          },
          activationEvents: ['initialized'],
          contributionPoints: {
            events: [
              {
                name: 'a.onLoaded',
              },
            ],
          },
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {
              setTimeout(() => {
                ctx.events.dispatch('a.onLoaded', result);
              }, 0);
            },
          }),
        },
        {
          name: 'b',
          dependencies: {
            events: '*',
            a: '*',
            c: '*',
          },
          activationEvents: ['initialized'],
          contributes: {
            events: [
              {
                cp: 'a.onLoaded',
                name: 'b.bHandler',
              },
            ],
          },
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {
              ctx.events.register('b.bHandler', bHandler);
            },
          }),
        },

        {
          name: 'c',
          dependencies: {
            events: '*',
            a: '*',
          },
          activationEvents: ['initialized'],
          contributes: {
            events: [
              {
                cp: 'a.onLoaded',
                name: 'c.handler',
              },
            ],
          },
          localImpl: __test__createAnonymousImpl({
            activate: ctx => {
              ctx.events.register('c.handler', cHandler);
            },
          }),
        },
      ];

      const expansion = createExpansionSystem(manifests);
      await expansion.activate('initialized');

      setTimeout(() => {
        expect(cHandler).toHaveBeenCalledTimes(1);
        expect(bHandler).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ value: 7 });
        console.log('result', result);
        done();
      }, 100);
    });

  });

});


function createExpansionSystem(manifests) {
  const activationEventDefinitions = [
    { name: 'initialized' },
  ];


  const mergedManifest = [
    createEventsManifest(['initialized']),
    ...manifests,
  ];

  return __test__createExpansionSystem({
    activationEventDefinitions,
    manifests: mergedManifest,
  });
}
