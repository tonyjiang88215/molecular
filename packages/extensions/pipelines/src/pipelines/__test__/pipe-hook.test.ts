import {WaterfallHook} from "../waterfall-hook";

describe("PipeHook Test", () => {

    it('PipeHook 实现了 IPipeHook', () => {
        const hook = new WaterfallHook();

        expect(hook).toHaveProperty('append')
        expect(hook).toHaveProperty('intercept')
        expect(hook).toHaveProperty('execute')
    })

    it('append 正确性', () => {
        const hook = new WaterfallHook();
        const fn = jest.fn(n => n)

        hook.append(fn)
        hook.execute(1)


        expect(fn.mock.calls.length).toEqual(1);
        expect(fn.mock.calls[0][0]).toEqual(1);
    })

    it('append 顺序正确性', () => {
        const hook = new WaterfallHook();
        const add = jest.fn(n => n + 1)
        const multi = jest.fn(n => n * 2)

        hook.append(add)
        hook.append(multi)
        hook.execute(1)

        // 期望 add 函数被调用一次，参数 = 1， 返回结果 = 2
        expect(add.mock.calls.length).toEqual(1);
        expect(add.mock.calls[0][0]).toEqual(1);
        expect(add.mock.results[0].type).toEqual('return')
        expect(add.mock.results[0].value).toEqual(2)

        // 期望 multi 函数被调用一次，参数 = 2， 返回结果 = 4
        expect(multi.mock.calls.length).toEqual(1);
        expect(multi.mock.calls[0][0]).toEqual(2);
        expect(multi.mock.results[0].type).toEqual('return')
        expect(multi.mock.results[0].value).toEqual(4)
    })

    it('intercept 正确性', () => {
        const hook = new WaterfallHook();
        const fn = jest.fn(n => n)

        hook.intercept(fn)
        hook.execute(1)


        expect(fn.mock.calls.length).toEqual(1);
        expect(fn.mock.calls[0][0]).toEqual(1);
    })

    it('intercept 顺序正确性', () => {
        const hook = new WaterfallHook();
        const add = jest.fn(n => n + 1)
        const multi = jest.fn(n => n * 2)

        hook.intercept(add)
        hook.intercept(multi)
        hook.execute(1)

        // 期望 multi 函数被调用一次，参数 = 1， 返回结果 = 2
        expect(multi.mock.calls.length).toEqual(1);
        expect(multi.mock.calls[0][0]).toEqual(1);
        expect(multi.mock.results[0].type).toEqual('return')
        expect(multi.mock.results[0].value).toEqual(2)

        // 期望 add 函数被调用一次，参数 = 2， 返回结果 = 3
        expect(add.mock.calls.length).toEqual(1);
        expect(add.mock.calls[0][0]).toEqual(2);
        expect(add.mock.results[0].type).toEqual('return')
        expect(add.mock.results[0].value).toEqual(3)
    })
})
