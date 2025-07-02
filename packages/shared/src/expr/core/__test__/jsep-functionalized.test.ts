import isEmpty from 'lodash/isEmpty';

import {functionalized, FunctionalizedOptions} from "../jsep-functionalized";

type IAssertItem = {
  expr: string,
  options?: FunctionalizedOptions
}

describe('jsep-functionalized v2', () => {

  it('2 > 1', () => {
    assertFunctionalizedCorrect({expr: '2 > 1'}, {}, true);
  })

  it('(-2 + 10) * 5', () => {
    assertFunctionalizedCorrect({expr: '(-2 + 10) * 5'}, {}, 40);
  })

  it('code > 10', () => {
    assertFunctionalizedCorrect({expr: 'code > 10'}, {code: 5}, false);
    assertFunctionalizedCorrect({expr: 'code > 10'}, {code: 10}, false);
    assertFunctionalizedCorrect({expr: 'code > 10'}, {code: 11}, true);
  })

  it('sum(1, 2)', () => {
    const sum = (a, b) => a + b
    assertFunctionalizedCorrect({expr: 'sum(1, 2)'}, {sum}, 3)
  })

  it('current.department.code === "77"', () => {
    assertFunctionalizedCorrect(
      {expr: 'current.department.code === "77"'},
      {
        current: {
          department: {
            code: "77"
          }
        }
      },
      true
    );

    assertFunctionalizedCorrect(
      {expr: 'current.department.code === "77"'},
      {
        current: {}
      },
      false
    );

  })

  it(`(current.department.id === '007' && current.user.id === '001') || root.businessType.id === 'HAHA'`, () => {
    assertFunctionalizedCorrect(
      {expr: '(current.department.id === \'007\' && current.user.id === \'001\') || root.businessType.id === \'HAHA\''},
      {
        current: {},
        root: {}
      },
      false
    );
  })

  it(`count > 5 ? 'hasMobile' : 'withoutMobile'`, () => {
    assertFunctionalizedCorrect(
      {expr: `count > 5 ? 'hasMobile' : 'withoutMobile'`},
      {
        count: 6
      },
      'hasMobile'
    );

    assertFunctionalizedCorrect(
      {expr: `count > 5 ? 'hasMobile' : 'withoutMobile'`},
      {
        count: 4
      },
      'withoutMobile'
    );

  })

  it(`10 < now()`, () => {
    assertFunctionalizedCorrect(
      {expr: `10 < now()`},
      {
        now: () => 11
      },
      true
    );
  })

  it(`a / b`, () => {
    assertFunctionalizedCorrect(
      {expr: `a / b`},
      {
        a: 1,
        b: 1
      },
      1
    );
  })

  it(`a / b, 重写除法`, () => {
    const fn = jest.fn((a, b) => a / b);
    assertFunctionalizedCorrect(
      {
        expr: `a / b`,
        options: {
          declarations: {
            BinaryExpression: ({ left, right, node }) => `context.divide(${left.name}, ${right.name})`
          }
        }
      },
      {
        a: 1,
        b: 1,
        divide: fn
      },
      1
    );

    expect(fn.mock.calls).toHaveLength(1);
    expect(fn.mock.calls[0]).toEqual([1, 1]);

  })

  it(`!current.revenue`, () => {
    assertFunctionalizedCorrect(
      {expr: `!current.revenue`},
      {
        current: {revenue: {}}
      },
      false
    );

    assertFunctionalizedCorrect(
      {expr: `!current.revenue`},
      {
        current: {}
      },
      true
    );
  })

  it(`businessTypes[0].businessType`, () => {
    assertFunctionalizedCorrect(
      {expr: `businessTypes[0].businessType`},
      {
        businessTypes: []
      },
      undefined
    );

    assertFunctionalizedCorrect(
      {expr: `businessTypes[0].businessType`},
      {
        businessTypes: [{businessType: 'hit'}]
      },
      'hit'
    );
  })

  it(`data.businessTypes[0].businessType`, () => {
    assertFunctionalizedCorrect(
      {expr: `data.businessTypes[0].businessType`},
      {
        data: {
          businessTypes: []
        }
      },
      undefined
    );

    assertFunctionalizedCorrect(
      {expr: `data.businessTypes[0].businessType`},
      {
        data: {
          businessTypes: [{businessType: 'hit'}]
        }
      },
      'hit'
    );
  })

  it('[root.code]', () => {

    assertFunctionalizedCorrect(
      {expr: `[root.code]`},
      {
        root: {
          code: '1'
        }
      },
      ['1']
    );

    assertFunctionalizedCorrect(
      {expr: `[root.code]`},
      {},
      [undefined]
    );

  });

  it(`filter(mapKey($root.paymentItems, 'srcItemObjectId'), isNotEmpty).length`, () => {

    const mapKey = (items, key) => items.map(item => item[key]);
    const filter = (items, handler) => items.filter(handler)
    const isNotEmpty = (item) => !isEmpty(item)

    assertFunctionalizedCorrect(
      {expr: `fn.filter(fn.mapKey(data.paymentItems, 'srcItemObjectId'), fn.isNotEmpty).length`},
      {
        fn: {
          mapKey, filter, isNotEmpty
        },

        data: {
          paymentItems: [
            {},
            {srcItemObjectId: '1'},
            {srcItemObjectId: '2'},
          ]
        }

      },
      2
    );
  });

  it(`'physicalCountItems'.length === 0 && 'Sensitive'=='Visible'`, () => {
    assertFunctionalizedCorrect(
      {expr: `'physicalCountItems'.length === 0 && 'Sensitive'=='Visible'`},
      {},
      false
    );
  })

})


function assertFunctionalizedCorrect(item: IAssertItem, context: Record<string, any>, result: any) {
  const fn = functionalized(item.expr, item.options);
  expect(fn(context)).toEqual(result)
}
