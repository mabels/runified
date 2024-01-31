import { HttpRequest } from "../http_request";
import { HttpResponseWriter } from "../http_response_writer";
import { Logger } from "@adviser/cement";
import { App } from "./app";

export type AppHandlerFn = (app: AppHandler) => Promise<boolean>;

export interface AppHandlerParams {
  readonly App: App;
  readonly Log: Logger;
  readonly RequestId: string;
  readonly Req: HttpRequest;
  readonly Res: HttpResponseWriter;
}

export class AppHandler {
  readonly _App: App;
  readonly _Log: Logger;
  readonly _RequestId: string;
  readonly _Req: HttpRequest;
  readonly _Res: HttpResponseWriter;
  constructor(args: AppHandlerParams) {
    this._App = args.App;
    this._Log = args.Log;
    this._RequestId = args.RequestId;
    this._Req = args.Req;
    this._Res = args.Res;
  }

  App(): App {
    return this._App;
  }
  Log(): Logger {
    return this._Log;
  }
  RequestId(): string {
    return this._RequestId;
  }
  Response(): HttpResponseWriter {
    return this._Res;
  }
  Request(): HttpRequest {
    return this._Req;
  }
}
