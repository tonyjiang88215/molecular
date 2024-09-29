import { BeanManagerCreator } from './creator';
import { IExpansionBeans } from './declare';

const BEAN_PROPERTY_KEY = '__expansionBeans';

const {
  BeanManager,
  Autowired,
  PostConstruct,
  PreDestroy,
  Bean,
} = BeanManagerCreator<IExpansionBeans>({ propertyKey: BEAN_PROPERTY_KEY });

export {
  BeanManager, Autowired, PostConstruct, PreDestroy, Bean,
};
