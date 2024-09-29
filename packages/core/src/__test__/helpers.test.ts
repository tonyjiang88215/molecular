import { makeDependenciesDAG, makePrioritySequence } from '../helpers';

describe('helpers 测试', () => {
  describe('extensions 的依赖关系正确性', () => {
    it('无依赖测试', () => {
      const manifests = [
        {
          'name': 'a',
        },
        {
          'name': 'b',
        },
      ] as any;

      const dag = makeDependenciesDAG(manifests);
      expect(dag.names).toEqual(expect.arrayContaining(['a', 'b']));
      expect(dag.dependencies).toHaveLength(0);
    });

    it('a dependent b 测试', () => {
      const manifests: any = [
        {
          'name': 'a',
          'dependencies': {
            'b': '*',
          },
        },
        {
          'name': 'b',
        },
      ] as any;

      const dag = makeDependenciesDAG(manifests);
      expect(dag.names).toEqual(expect.arrayContaining(['a', 'b']));
      expect(dag.dependencies).toEqual(expect.arrayContaining([['a', 'b']]));
    });

    it('多级依赖测试', () => {
      const manifests: any = [
        {
          'name': 'a',
          'dependencies': {
            'b': '*',
            'c': '*',
          },
        },
        {
          'name': 'b',
        },
        {
          'name': 'c',
          'dependencies': {
            'd': '*',
          },
        },
        {
          'name': 'd',
        },
      ];

      const dag = makeDependenciesDAG(manifests);
      expect(dag.names).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
      expect(dag.dependencies).toEqual(expect.arrayContaining([['a', 'b'], ['a', 'c'], ['c', 'd']]));
    });

    it('循环依赖的测试', () => {
    });
  });


  describe('makePrioritySequence 正确性', () => {
    it('无依赖应该同步加载', () => {

      /**
       *   a   b   c
       */
      const priorities = makePrioritySequence([
        { 'name': 'a' },
        { 'name': 'b' },
        { 'name': 'c' },
      ] as any);

      expect(priorities).toEqual(expect.arrayContaining([
        ['a', 'b', 'c'],
      ]));

    });

    it('一级依赖测试', () => {
      /**
       *    b   c
       *     \ /
       *      a
       */
      const priorities = makePrioritySequence([
        { 'name': 'a', 'dependencies': { 'b': '*', 'c': '*' } },
        { 'name': 'b' },
        { 'name': 'c' },
      ] as any);

      expect(priorities).toEqual(expect.arrayContaining([
        ['b', 'c'],
        ['a'],
      ]));
    });

    it('多级依赖测试', () => {
      /**
       *  b       d
       *   \     /
       *    \   c
       *     \ /
       *      a
       */
      const priorities = makePrioritySequence([
        { 'name': 'a', 'dependencies': { 'b': '*', 'c': '*' } },
        { 'name': 'b' },
        { 'name': 'c', 'dependencies': { 'd': '*' } },
        { 'name': 'd' },
      ] as any);

      expect(priorities).toEqual(expect.arrayContaining([
        ['b', 'd'],
        ['c'],
        ['a']
      ]));
    });
  });
});



