import React, { useContext, useEffect, useRef } from 'react';
import ReactDOM, { findDOMNode } from 'react-dom';
import { IExpansionSystem } from '../expansion-system';
import { ExpansionDevtools } from '../../devtools';

const ExpansionContext = React.createContext<IExpansionSystem>();
ExpansionContext.displayName = 'ExpansionContext';

// export const ExpansionContextProvider = ExpansionContext.Provider;

export function ExpansionContextProvider(props: { value: IExpansionSystem, children: any }) {

  // const parentExpansions = useExpansions();
  //
  // useEffect(() => {
  //   if (parentExpansions && parentExpansions != props.value) {
  //     parentExpansions.addHierarchy(props.value);
  //
  //     return () => {
  //       parentExpansions.removeHierarchy(props.value);
  //     };
  //   }
  // }, [parentExpansions]);

  return (
    <ExpansionContext.Provider value={props.value}>
      <ExpansionDevtoolsConnector es={props.value}>
        {props.children}
      </ExpansionDevtoolsConnector>
    </ExpansionContext.Provider>
  );
}

function ExpansionDevtoolsConnector(props: { es: IExpansionSystem, children: any }) {

  const componentRef = useRef();

  useEffect(() => {
    // console.log('expansion devtools ref', componentRef.current, findDOMNode(componentRef.current));
    if (componentRef.current) {
      return appendExpansionDevtools(findDOMNode(componentRef.current), props.es);
    }
  }, [componentRef.current]);

  useEffect(() => {
    return () => {
      componentRef.current = undefined;
    }
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return props.children;
  } else {
    return (
      <ExpansionDevtoolsRefMaker ref={componentRef}>
        {props.children}
      </ExpansionDevtoolsRefMaker>
    );
  }
}

class ExpansionDevtoolsRefMaker extends React.Component {
  render() {
    return this.props.children;
  }
}

function appendExpansionDevtools(container: Element, es: IExpansionSystem) {
  if (!container) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.tabIndex = 0;
  wrapper.className = 'expansion_dev_tools_container';

  ReactDOM.render(<ExpansionDevtools container={container} wrapper={wrapper} es={es} />, wrapper);
  container.appendChild(wrapper);
}


export function useExpansions(): IExpansionSystem {
  return useContext(ExpansionContext);
}
