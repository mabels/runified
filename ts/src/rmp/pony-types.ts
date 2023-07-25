import { IncomingMessage, ServerResponse } from "node:http";
import { Context as AWSContext } from "aws-lambda";
import ws from "ws";

export type Env = unknown;

export type UnregFn = () => void;

export type ExecutionContext<T = unknown> = {
  dummy?: T;
  nodejs?: {
    request: IncomingMessage;
    response: ServerResponse;
  };
  ws?: {
    // server: Server;
    // request: IncomingMessage;
    // head: Buffer
    wsock: ws.WebSocket;
  };
  lambda?: AWSContext;
};

export interface EdgeHandler<T = unknown> {
  fetch(request: Request, env: Env, ctx: ExecutionContext<T>): Promise<Response>;
}

//export type HandlerFetchHandler<Env = unknown> = (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>;
// export interface ReadableStreamController<R> {
//     readonly desiredSize: number | null;
//             close(): void;
//             enqueue(chunk?: R): void;
//             error(e?: Error): void;
// }
// export type PlainFetchHandler = (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>;
export interface FetchHandler extends EdgeHandler {
  // setFramer?(ctr: ConnectionFrameProcessor): void;
}

// export interface RequestInit {
//     body?: BodyInit | null;
//     headers?: HeadersInit;
//     method?: string;
// }

export type Context = never;

export interface AWSStream {
  write(o: string): void;
  end(): void;
  finished(): void;
}
