import {MessageType, RequestMessage, ResponseMessage} from "./declare";
import Port = chrome.runtime.Port;

export type Disposable = () => void

export type MessageRequestHandler<P = any, R = any> = (params: P) => Promise<R> | undefined

export type MessageRequestEveryHandler<P = any, R = any> = (method: string, params: P) => Promise<R>

export type MessageNotificationHandler<P = any> = (params: P) => void

export type MessageNotificationEveryHandler<P = any> = (method: string, params: P) => void

type PendingPromise = { resolve: Function, reject: Function };

export interface IMessageConnection {
  destroy(): void

  /**
   * 发送请求，请求的处理结果会作为返回值
   * @param method
   * @param params
   */
  sendRequest<P, R>(method: string, params: P): Promise<R>

  /**
   * 接受请求的处理函数，处理完成后，返回的结果会作为 response 返回给请求方
   * @param method
   * @param handler
   */
  onRequest<P = any, R = any>(method: string, handler: MessageRequestHandler<P, R>): Disposable

  /**
   * 处理所有请求，使用 onRequestEvery 后，如果 onRequestEvery 没有返回值，则继续调用 onRequest 否则直接返回
   * @param handler
   */
  onRequestEvery<P, R>(handler: MessageRequestEveryHandler<P, R>): Disposable

  /**
   * 发送通知，没有返回值
   * @param method
   * @param params
   */
  sendNotification<P>(method: string, params?: P): Promise<void>

  /**
   * 使用 onNotification 来监听发出请求后的返回结果
   * @param method
   * @param handler
   */
  onNotification(method: string, handler: MessageNotificationHandler): Disposable

  /**
   * 处理所有通知，使用 onNotificationEvery 后会继续调用 onNotification
   * @param handler
   */
  onNotificationEvery<P>(handler: MessageNotificationEveryHandler<P>): Disposable

}


export type MessageConnectionOptions = {
  // port: chrome.runtime.Port
  onMessage: (callback: (message: any) => void) => void,
  postMessage: (message: any) => void,
  disconnect: () => void
}

export class MessageConnection implements IMessageConnection {
  private requestHandler: Record<string, MessageRequestHandler[]> = {};
  private requestEveryHandler?: MessageRequestEveryHandler;
  private notificationHandler: Record<string, MessageNotificationHandler[]> = {};
  private notificationEveryHandler?: MessageNotificationEveryHandler;

  private pendingPromise: Record<string, PendingPromise> = {};

  private requestId = 0;


  constructor(private options: MessageConnectionOptions) {
    this.options.onMessage(message => this.messageHandler(message));
  }

  destroy() {
    this.options.disconnect();
    Object.keys(this.pendingPromise).forEach(requestId => {
      delete this.pendingPromise[requestId];
    });
    Object.keys(this.requestHandler).forEach(name => {
      this.requestHandler[name].length = 0;
      delete this.requestHandler[name];
    });
    Object.keys(this.notificationHandler).forEach(name => {
      this.notificationHandler[name].length = 0;
      delete this.notificationHandler[name];
    });
    this.requestEveryHandler = undefined;
    this.notificationEveryHandler = undefined;
  }

  private sendMessage<P, R>(type: MessageType, method: string, params: P): Promise<R> {
    return new Promise((resolve, reject) => {
      const body = this.createRequestMessage(type, method, params);
      this.pendingPromise[body.requestId] = {resolve, reject};
      this.options.postMessage(body);
    });
  }

  private async messageHandler(message: RequestMessage | ResponseMessage) {
    if (!this.isResponseMessage(message)) {
      const responseMessage = await this.receiverMessageHandler(message);
      if(message.type == 'request') {
        this.options.postMessage(responseMessage);
      }
    } else {
      this.initiatorMessageHandler(message);
    }
  }

  private isResponseMessage(message: RequestMessage | ResponseMessage): message is ResponseMessage {
    return !(message as RequestMessage).method;
  }

  /**
   * 接收方收到发起方的消息，需要执行对应的 handler 函数
   * @param message
   * @private
   */
  private async receiverMessageHandler(message: RequestMessage): Promise<ResponseMessage> {
    const result = message.type == 'request' ? await this.receiverRequestMessageHandler(message) : this.receiverNotificationMessageHandler(message);

    return this.createResponseMessage(message, result);
  }

  private async receiverRequestMessageHandler(message: RequestMessage) {
    let result = await this.requestHandler[message.method]?.reduce<any>((result, handler) => {
      if(result !== undefined) {
        return result;
      }
      return handler(message.params);
    }, undefined);
    if (!result) {
      result = await this.requestEveryHandler?.(message.method, message.params);
    }
    return result;
  }

  private receiverNotificationMessageHandler(message: RequestMessage) {
    this.notificationHandler[message.method]?.forEach(handler => handler(message.params));
    this.notificationEveryHandler?.(message.method, message.params);
  }

  /**
   * 发起方收到请求返回的结果，需要执行对应的 Promise 的后续逻辑
   * @param message
   * @private
   */
  private initiatorMessageHandler(message: ResponseMessage) {
    const pendingPromise = this.pendingPromise[message.requestId];
    if (message.error) {
      pendingPromise?.reject(message.error);
    } else {
      pendingPromise?.resolve(message.result);
    }
    delete pendingPromise[message.requestId];
  }


  private createRequestMessage(type: MessageType, method: string, params: any): RequestMessage {
    const requestId = `${this.requestId++}`;
    return {
      requestId, type, method, params
    }
  }


  private createResponseMessage(message: RequestMessage, result: any): ResponseMessage {
    return {
      requestId: message.requestId,
      result
    }
  }

  sendRequest<P, R>(method: string, params: P): Promise<R> {
    return this.sendMessage('request', method, params);
  }

  onRequest<T1, T2>(method: string, handler: MessageRequestHandler<T1, T2>) {
    if (!this.requestHandler[method]) {
      // throw new Error(`${method} 已经存在处理函数`);
      this.requestHandler[method] = [];
    }

    this.requestHandler[method].push(handler);

    return () => {
      this.requestHandler[method] = this.requestHandler[method].filter(fn => fn != handler);
      // delete this.requestHandler[method];
    }
  }

  onRequestEvery<P, R>(handler: MessageRequestEveryHandler<P, R>): Disposable {
    this.requestEveryHandler = handler;
    return () => {
      this.requestEveryHandler = undefined;
    }
  }

  sendNotification<P>(method: string, params: P): Promise<void> {
    return this.sendMessage('notification', method, params);
  }

  onNotification(method: string, handler: MessageNotificationHandler): Disposable {
    if (!this.notificationHandler[method]) {
      // throw new Error(`${method} 已经存在处理函数`);
      this.notificationHandler[method] = [];
    }
    this.notificationHandler[method].push(handler);
    return () => {
      this.notificationHandler[method] = this.notificationHandler[method].filter(fn => fn != handler);
      // delete this.notificationHandler[method];
    }
  }

  onNotificationEvery<P>(handler: MessageNotificationEveryHandler<P>): Disposable {
    this.notificationEveryHandler = handler;
    return () => {
      this.notificationEveryHandler = undefined;
    }
  }
}

export function createConnection(options: MessageConnectionOptions): IMessageConnection {
  return new MessageConnection(options);
}

export function createPortOptions(port: Port): MessageConnectionOptions & {updatePort: (port: Port) => void } {
  return new PortAdaptor(port);
}

interface PortConnection extends MessageConnectionOptions {
  updatePort: (port: Port) => void
}

class PortAdaptor implements PortConnection  {
  // @ts-ignore
  private port: Port;
  private messageHandler!: (message: any, port: Port) => void;
  private isAlive = true;

  constructor(port: Port) {
    this.updatePort(port);
  }

  disconnect(): void {
    this.port.disconnect();
  }

  onMessage(callback: (message: any) => void): void {
    this.messageHandler = callback;
    this.port.onMessage.addListener(callback);
  }

  postMessage(message: any): void {
    if(!this.isAlive) {
      return;
    }

    return this.port.postMessage(message);
  }

  updatePort(port: chrome.runtime.Port): void {
    this.port = port;
    this.isAlive = true;

    this.port.onDisconnect.addListener(() => {
      this.isAlive = false;
    });

    if(this.messageHandler) {
      this.port.onMessage.addListener(this.messageHandler);
    }
  }

}
