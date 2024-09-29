
export interface IDestructible {
    destructor(): void;
}

export interface BeanManagerOptions {
    seeds: { [beanName: string]: any };
    beans: Array<any>;
  }
  
  export type IBeanManager<BeanMap> = {
    init();
    destructor();
    getBean<T extends keyof BeanMap>(beanName: T): BeanMap[T];
    wireBean(beanInstance: any);
  };
  
  type BeanEntry = {
    beanName: string;
    beanClass: any;
    beanInstance: IDestructible;
  };
  
  export type BeanProperty = {
    beanName: string;
    attributes: Array<BeanPropertyAttribute>;
    postConstruct: string;
    preDestroy: string;
  };
  
  export type BeanPropertyAttribute = {
    attributeName: string | symbol;
    beanName: string;
  };
  
  export type BeanManagerCreateOptions = {
    propertyKey: string;
  };
  
  type IConstructor<T = any> = new (...args) => T
  
  type BeanDecorator<T> = (name: string) => (beanConstructor: IConstructor<T>) => IConstructor<T>;
  
  
  export type IBeanManagers<BeanMap = {}> = {
    BeanManager: IConstructor<IBeanManager<BeanMap>>,
    Bean: BeanDecorator<any>,
    Autowired: (name: string) => PropertyDecorator,
    PostConstruct: MethodDecorator,
    PreDestroy: MethodDecorator
  }
  
  // @ts-ignore
  export function BeanManagerCreator<BeanMapType = {}>(options: BeanManagerCreateOptions): IBeanManagers<BeanMapType> {
    const { propertyKey } = options;
  
    class BeanManager<BeanMapType> implements IDestructible, IBeanManager<BeanMapType> {
      public readonly beans: { [beanName: string]: BeanEntry } = {};
      private options: BeanManagerOptions;
  
      constructor(options: BeanManagerOptions) {
        this.options = options;
      }
  
      public destructor() {
        // Object.keys(this.beans).forEach(beanName => {
        //   if (this.beans[beanName].beanInstance.destructor) {
        //     this.beans[beanName].beanInstance.destructor();
        //   }
        // });
  
        try {
          this.preDestroy();
        } catch (e) {
          //debugger;
        } finally {
          // this.unwireBeans();
        }
      }
  
      public init() {
        this.createBeans();
        this.wireBeans();
      }
  
      public getBean<T extends keyof BeanMapType>(beanName: T): BeanMapType[T];
      public getBean<T extends string>(beanName: T): any;
      public getBean(beanName: string) {
        return this.beans[beanName as string].beanInstance as any;
      }
  
      public wireBean(beanInstance: any) {
        const beanProperty = getBeanProperty(beanInstance.constructor);
  
        if (beanProperty.attributes) {
          beanProperty.attributes.forEach(attr => {
            beanInstance[attr.attributeName] = this.lookupBeanInstance(attr.beanName);
          });
        }
  
        if (beanProperty.postConstruct) {
          beanInstance[beanProperty.postConstruct]();
        }
      }
  
      // 创建 Bean 实例
      private createBeans() {
        this.options.beans.forEach(beanClass => {
          const beanProperty = getBeanProperty(beanClass);
          this.beans[beanProperty.beanName] = {
            beanName: beanProperty.beanName,
            beanClass: beanClass,
            beanInstance: new beanClass(),
          };
        });
      }
  
      private wireBeans() {
        // 进行依赖注入
        this.autoWireBeans();
        // 执行 postConstruct
        this.postConstruct();
      }
  
      // 遍历 Bean 实例，对 Bean 实例进行依赖注入
      private autoWireBeans() {
        Object.keys(this.beans).forEach(beanName => {
          const { beanInstance, beanClass } = this.beans[beanName];
          const beanProperty = getBeanProperty(beanClass);
  
          if (beanProperty.attributes) {
            beanProperty.attributes.forEach(attr => {
              beanInstance[attr.attributeName] = this.lookupBeanInstance(attr.beanName);
            });
          }
        });
      }
  
      private postConstruct() {
        Object.keys(this.beans).forEach(beanName => {
          const { beanInstance, beanClass } = this.beans[beanName];
          const beanProperty = getBeanProperty(beanClass);
  
          if (beanProperty.postConstruct) {
            beanInstance[beanProperty.postConstruct] && beanInstance[beanProperty.postConstruct]();
          }
        });
      }
  
      private preDestroy() {
        Object.keys(this.beans).forEach(beanName => {
          const { beanInstance, beanClass } = this.beans[beanName];
          const beanProperty = getBeanProperty(beanClass);
  
          if (beanProperty.preDestroy) {
            try {
              beanInstance[beanProperty.preDestroy] && beanInstance[beanProperty.preDestroy]();
            } catch (e) {
              console.error(e);
             // debugger;
            }
          }
  
          try{
            if (beanInstance.destructor && beanInstance.destructor !== beanInstance[beanProperty.preDestroy]) {
              beanInstance.destructor();
            }
          } catch (e) {
            console.error(e);
            //debugger;
          }
  
  
        });
      }
  
      private unwireBeans() {
        Object.keys(this.beans).forEach(beanName => {
          const { beanInstance, beanClass } = this.beans[beanName];
          const beanProperty = getBeanProperty(beanClass);
  
          if (beanProperty.attributes) {
            beanProperty.attributes.forEach(attr => {
              beanInstance[attr.attributeName] = undefined;
            });
          }
        });
      }
  
      private lookupBeanInstance(beanName: string) {
        if (this.options.seeds && this.options.seeds.hasOwnProperty(beanName)) {
          return this.options.seeds[beanName];
        }
  
        if (this.beans[beanName]) {
          return this.beans[beanName].beanInstance;
        }
  
        console.error(`找不到 ${beanName} 的 Bean 实例`);
      }
    }
  
    // Bean 装饰器
    const Bean = (beanName: string) => beanConstructor => {
      getBeanProperty(beanConstructor).beanName = beanName;
      return beanConstructor;
    };
  
    // Autowired 装饰器，用来将 Bean 实例注入到当前 property 上
    const Autowired: (beanName: string) => PropertyDecorator = (beanName: string) => (
      target,
      propertyName,
    ) => {
      const beanProperty = getBeanProperty(target.constructor);
      if (!beanProperty.attributes) {
        beanProperty.attributes = [];
      }
  
      beanProperty.attributes.push({
        attributeName: propertyName,
        beanName: beanName,
      });
    };
  
    // PostConstruct 装饰器，当依赖注入完成后执行，用于带有依赖的初始化
    const PostConstruct = (target, methodName, descriptor) => {
      getBeanProperty(target.constructor).postConstruct = methodName;
    };
  
    // PreDestroy 装饰器，当Beans销毁时，用于销毁前的内部销毁函数
    const PreDestroy = (target, methodName, descriptor) => {
      getBeanProperty(target.constructor).preDestroy = methodName;
    };
  
    function getBeanProperty(beanConstructor): BeanProperty {
      if (!beanConstructor.prototype[propertyKey]) {
        beanConstructor.prototype[propertyKey] = {};
      }
  
      return beanConstructor.prototype[propertyKey];
    }
  
    return {
      BeanManager,
      Bean,
      Autowired,
      PostConstruct,
      PreDestroy,
    } as IBeanManagers<BeanMapType>;
  }
  