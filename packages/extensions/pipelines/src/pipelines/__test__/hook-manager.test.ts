import {HookManager} from "../hook-manager";
import {WaterfallHook} from "../waterfall-hook";

describe("HookManager Test", () => {
    it("HookManager 实现了 IHookManager", () => {
        const manager = new HookManager();

        expect(manager).toHaveProperty('addHooks');
        expect(manager).toHaveProperty('getHooks');
    })

    it('addHooks getHooks 测试', () => {
        const manager = new HookManager();
        const hooks = new WaterfallHook();

        manager.addHooks('Test', hooks);

        expect(manager.getHooks('Test')).toEqual(hooks);
    })

    it('添加重名 hooks 应该抛出异常', () => {
        const manager = new HookManager();
        const hooks = new WaterfallHook();

        manager.addHooks('Test', hooks);

        expect(() => manager.addHooks('Test', hooks)).toThrow('已经存在')
    })
})
