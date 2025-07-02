import jsep, {
  ArrayExpression,
  BinaryExpression,
  CallExpression, ConditionalExpression,
  Expression,
  Identifier,
  Literal, LogicalExpression,
  MemberExpression,
  UnaryExpression
} from "jsep";
import {oc} from 'ts-optchain';
// import {get} from '../../utils';
import get from 'lodash/get';


type CodeLine = string;

type CodeLines = Array<CodeLine>;

interface ITransContext {
  getVariableName(): string

  isIdentifierDeclared(name: string): boolean
}


class TransContext implements ITransContext {
  private variableIndex = 0;

  private identifiers = {}

  getVariableName(): string {
    return `V${this.variableIndex++}`
  }

  isIdentifierDeclared(name: string): boolean {
    if (this.identifiers[name]) {
      return true
    }
    this.identifiers[name] = true;
  }
}

type TransFragment = {
  name: string,
  declareCode: CodeLine
  dependentCode?: CodeLines,
}

export type FunctionalizedOptions = {
  declarations?: Partial<{
    CallExpression: ICallDeclaration,
    MemberExpression: IMemberDeclaration,
    ArrayExpression: IArrayDeclaration,
    BinaryExpression: IBinaryDeclaration,
    ConditionalExpression: IConditionDeclaration,
    LogicalExpression: ILogicalDeclaration,
    Identifier: IIdentifierDeclaration,
    UnaryExpression: IUnaryDeclaration,
    Literal: ILiteralDeclaration
  }>
}


export type IExpressionDeclaration<T extends {}> = (params: T, defaultDeclaration: IDefaultExpressionDeclaration<T>) => string;

export type IDefaultExpressionDeclaration<T extends {}> = (params: T) => string;

export type ICallDeclaration = IExpressionDeclaration<{ callee: TransFragment, args: TransFragment[] }>;

export type IMemberDeclaration = IExpressionDeclaration<{ object: TransFragment, isLiteral: boolean, path: string }>;

export type IArrayDeclaration = IExpressionDeclaration<{ elements: TransFragment[] }>

export type IBinaryDeclaration = IExpressionDeclaration<{ left: TransFragment, right: TransFragment, node: BinaryExpression }>;

export type IConditionDeclaration = IExpressionDeclaration<{ test: TransFragment, consequent: TransFragment, alternate: TransFragment }>;

export type ILogicalDeclaration = IExpressionDeclaration<{ left: TransFragment, right: TransFragment, node: LogicalExpression }>;

export type IIdentifierDeclaration = IExpressionDeclaration<{ node: Identifier }>;

export type IUnaryDeclaration = IExpressionDeclaration<{ node: UnaryExpression, arg: TransFragment }>;

export type ILiteralDeclaration = IExpressionDeclaration<{ node: Literal }>;

const defaultDeclaration = {
  CallExpression: ({callee, args}) => `${callee.name}(${args.map(arg => arg.name).join(',')})`,
  MemberExpression: ({
                       object,
                       isLiteral,
                       path
                     }) => `context.oc(${object.name})${isLiteral ? '' : '.'}${path}(undefined)`,
  ArrayExpression: ({elements}) => `[${elements.map(item => item.name).join(',')}]`,
  BinaryExpression: ({left, right, node}) => `${left.name} ${node.operator} ${right.name}`,
  ConditionalExpression: ({test, consequent, alternate}) => `${test.name} ? ${consequent.name} : ${alternate.name}`,
  LogicalExpression: ({left, right, node}) => `${left.name} ${node.operator} ${right.name}`,
  Identifier: ({node}) => node.name === 'undefined' ? '' : `context.${node.name}`,
  UnaryExpression: ({node, arg}) => `${node.operator}${arg.name}`,
  Literal: ({node}) => `${node.raw}`,
}

/**
 * 考虑到实际执行性能，针对同一个表达式，我们期望只解析一次，然后转换为翻译后的可执行函数，示例如下：
 *
 *    原始表达式：
 *     const a = current.code === '77'
 *
 *    经过 functionalized 后，得到：
 *     function(context) {
 *        const V0 = context.current.code;
 *        const V1 = '77';
 *        const V2 = V0 == V1
 *
 *        return V2
 *     }
 *
 * @param expression
 * @param options
 */
export function functionalized(expression: string, options: FunctionalizedOptions = {}) {
  const lines = functionalizedCodeLines(expression, options);
  // return lines.join('\n');
  // console.log('functionalized', expression, lines.join('\n'));
  const fn = new Function('context', lines.join('\n'));

  return function (context) {
    context.oc = oc;
    if (!context.get) {
      context.get = get;
    }
    return fn(context);
  }
}

export function functionalizedCodeLines(expression: string, options: FunctionalizedOptions = {}) {
  options.declarations = Object.assign({}, defaultDeclaration, options.declarations);

  const node = jsep(expression);

  const context = new TransContext();

  const fragment = transHandler(node, context, options);

  return Array.from(new Set([
      'try{',
      ...fragmentToCode(fragment),
      `return ${fragment.name};`,
      '}catch(e){ console.warn(e); }',
      'return undefined'
    ]
  ))
}

function transHandler(node: Expression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  switch (node.type) {
    case 'CallExpression':
      return callHandler(node as CallExpression, context, options);

    case 'MemberExpression':
      return memberHandler(node as MemberExpression, context, options);

    case 'ArrayExpression':
      return arrayHandler(node as ArrayExpression, context, options);

    case 'BinaryExpression':
      return binaryHandler(node as BinaryExpression, context, options);

    case "ConditionalExpression":
      return conditionalHandler(node as ConditionalExpression, context, options);

    case "LogicalExpression":
      return logicalHandler(node as LogicalExpression, context, options);

    case 'Identifier':
      return identifierHandler(node as Identifier, context, options);

    case 'UnaryExpression':
      return unaryHandler(node as UnaryExpression, context, options);

    case 'Literal':
      return literalHandler(node as Literal, context, options);

    default:
      throw new Error(`tranHandler 中，没有当前类型{${node.type}}的处理函数，请补全逻辑`);

  }


}

function callHandler(node: CallExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const callee = transHandler(node.callee, context, options);
  const args = node.arguments.map(arg => transHandler(arg, context, options));

  const dependentCode = [
    ...fragmentToCode(callee),
    ...args.reduce((codeLines, arg) => [...codeLines, ...fragmentToCode(arg)], [])
  ];

  return {
    name: context.getVariableName(),
    dependentCode: dependentCode,
    declareCode: options.declarations.CallExpression({callee, args}, defaultDeclaration.CallExpression)
  }

}

function getMemberContinuousPath(node: MemberExpression): { path: string, isLiteral: boolean, node: MemberExpression } {
  const paths = [];
  let isLiteral = false;

  while (node && node.type === 'MemberExpression') {
    switch (node.property.type) {
      case 'Literal':
        // @ts-ignore
        paths.unshift(`[${(node.property as Literal).value}]`);
        isLiteral = true;
        break;

      case 'Identifier':
        // @ts-ignore
        paths.unshift(node.property.name);
        isLiteral = false;
        break;

      default:
        // @ts-ignore
        throw new Error(`getVariableExpression 中没有处理当前类型{${node.type}}节点，请补全代码逻辑`);
    }
    node = node.object as MemberExpression;
  }

  const path = paths.join(".").replace(/\.\[/g, '[');

  return {
    path: path,
    isLiteral: isLiteral,
    node: node
  }
}

function memberHandler(node: MemberExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const {path, isLiteral, node: restNode} = getMemberContinuousPath(node);
  const object = transHandler(restNode, context, options);

  return {
    name: context.getVariableName(),
    dependentCode: fragmentToCode(object),
    /**
     * businessTypes[0].a 这种表达式，由于最后的节点是 Identifier 类型，所以翻译完会变成
     * oc(businessTypes).[0].a，为了防止这种情况，要根据头部节点的type来决定是否要补 .
     */
    declareCode: options.declarations.MemberExpression({object, isLiteral, path}, defaultDeclaration.MemberExpression)
  }

  // const object = transHandler(node.object, context);
  //
  // return {
  //   name: context.getVariableName(),
  //   dependentCode: fragmentToCode(object),
  //   declareCode: `${object.name}.${node.property['name']}`
  // }
}

function arrayHandler(node: ArrayExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const elements = node.elements.map(item => transHandler(item, context, options));
  const dependentCode = elements.reduce((codeLines, item) => [...codeLines, ...fragmentToCode(item)], []);

  return {
    name: context.getVariableName(),
    dependentCode: dependentCode,
    declareCode: options.declarations.ArrayExpression({elements}, defaultDeclaration.ArrayExpression)
  }
}

function binaryHandler(node: BinaryExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const left = transHandler(node.left, context, options);
  const right = transHandler(node.right, context, options);


  const dependentCode = [
    ...fragmentToCode(left),
    ...fragmentToCode(right),
  ];

  return {
    name: context.getVariableName(),
    dependentCode: dependentCode,
    declareCode: options.declarations.BinaryExpression({left, right, node}, defaultDeclaration.BinaryExpression)
  }
}

function conditionalHandler(node: ConditionalExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {

  const test = transHandler(node.test, context, options);
  const consequent = transHandler(node.consequent, context, options);
  const alternate = transHandler(node.alternate, context, options)

  const dependentCode = [
    ...fragmentToCode(test),
    ...fragmentToCode(consequent),
    ...fragmentToCode(alternate),
  ]

  return {
    name: context.getVariableName(),
    dependentCode: dependentCode,
    declareCode: options.declarations.ConditionalExpression({
      test,
      consequent,
      alternate
    }, defaultDeclaration.ConditionalExpression)
  }

}

function logicalHandler(node: LogicalExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const left = transHandler(node.left, context, options);
  const right = transHandler(node.right, context, options);

  const dependentCode = [
    ...fragmentToCode(left),
    ...fragmentToCode(right)
  ]

  return {
    name: context.getVariableName(),
    dependentCode: dependentCode,
    declareCode: options.declarations.LogicalExpression({left, right, node}, defaultDeclaration.LogicalExpression)
  }

}


function identifierHandler(node: Identifier, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  return {
    name: node.name,
    declareCode: options.declarations.Identifier({node}, defaultDeclaration.Identifier)
  }

}

function unaryHandler(node: UnaryExpression, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const arg = transHandler(node.argument, context, options);

  const dependentCode = fragmentToCode(arg);

  return {
    name: context.getVariableName(),
    dependentCode: dependentCode,
    declareCode: options.declarations.UnaryExpression({node, arg}, defaultDeclaration.UnaryExpression)
  }
}

function literalHandler(node: Literal, context: ITransContext, options: FunctionalizedOptions): TransFragment {
  const varName = context.getVariableName();

  return {
    name: varName,
    declareCode: options.declarations.Literal({node}, defaultDeclaration.Literal)
  }
}


function fragmentToCode(fragment: TransFragment): CodeLines {
  const {name, declareCode, dependentCode = ''} = fragment;
  if (!declareCode) {
    return [...dependentCode];
  }
  return [
    ...dependentCode,
    `const ${name} = ${declareCode};`
  ]

}

