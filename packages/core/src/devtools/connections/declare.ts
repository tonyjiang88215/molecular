/**
 * 基于 json-rpc 协议的消息定义，用于完成页面和开发工具间的消息通信
 */

/**
 * 消息基类
 * 我们只是借鉴 json-rpc 的报文设计，所以暂时将 jsonrpc 属性设置为非必填
 */
export interface Message{
  jsonrpc?: string;
}

export type MessageType = 'request' | 'notification';

/**
 * 消息方向
 */
export enum MessageDirection {
  // 页面向开发工具发送
  pageToDevtools = 'pageToDevtools',

  // 开发工具向页面发送
  devtoolsToPage = 'devtoolsToPage',

  // 双向都可以发送
  both = 'both'
}

/**
 * 请求消息
 */
export interface RequestMessage<P = any> extends Message {
  /**
   * request id
   */
  requestId: string,

  /**
   * request type
   */
  type: MessageType,
  /**
   * method to be invoked
   */
  method: string,

  /**
   * method`s params
   */
  params?: P,
}


/**
 * 响应消息
 */
export interface ResponseMessage<R = any> extends Message {
  /**
   * request id
   */
  requestId: string,

  /**
   * invoked result
   */
  result?: R,

  /**
   * error message
   */
  error?: ResponseError
}

/**
 * 错误信息
 */
export interface ResponseError {
  code: number,
  message: string,
  data?: any
}
