import {IHookManager, IHookPayloads, IHooks} from "./hook.type";

export function createHookManager<T extends IHookPayloads = {}>(): IHookManager<T> {
  return new HookManager() as any;
}

export class HookManager implements IHookManager {
    protected hooks: { [name: string]: IHooks } = {};

    addHooks<T>(name: string, hooks: IHooks<T>) {
        if(this.hasHooks(name)) {
            throw new Error(`${name} 已经存在`);
        }
        this.hooks[name] = hooks;

        return () => this.removeHooks(name);
    }

    getHooks<T>(name: string): IHooks<T> {
        if (this.hasHooks(name)) {
            return this.hooks[name];
        }
    }

    hasHooks(name: string): boolean {
        return this.hooks.hasOwnProperty(name);
    }

    private removeHooks(name: string): boolean {
        if(this.hasHooks(name)) {
          delete this.hooks[name];
          return true;
        }
        return false;
    }
}
