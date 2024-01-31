import { APIMsg, Api, CLIConfig } from "../types/app";
import { HttpRequest, HttpResponseWriter, } from "../types";
import { MockApi } from "./api";
import { MockApp } from "./app";
import { MockResponseWriter } from "./response_writer";
import { Logger } from "@adviser/cement";

export class MockApiHandler<Q, S> implements APIMsg<Q, S> {
  readonly _log: Logger;
  readonly _api: Api;
  readonly _res: MockResponseWriter;
  readonly _req: HttpRequest;
  LastError?: Error;
  ResponseData?: S;
  RequestData?: Q;

  constructor(cfg: CLIConfig, req: HttpRequest) {
    const app = new MockApp({ CliConfig: cfg });
    this._api = new MockApi({ App: app });
    this._log = this._api.Log().With().Module("MockApiHandler").Str("requestId", this.RequestId()).Logger();
    this._res = new MockResponseWriter();
    this._req = req;
  }
  Log(): Logger {
    return this._log;
  }

  Api(): Api {
    return this._api;
  }
  RequestId(): string {
    return "test";
  }
  Response(): HttpResponseWriter {
    return this._res;
  }
  Request(): HttpRequest {
    return this._req;
  }
  ErrorMsg(err: Error): Promise<number> {
    this.LastError = err;
    return Promise.resolve(4711);
  }

  WriteMsg(res: S): Promise<number> {
    this.Response().WriteHeader(200);
    this.ResponseData = res;
    return Promise.resolve(42);
  }

  RequestMsg(): Promise<Q> {
    this._log.Debug().Any("msg", this.RequestData).Msg("RequestMsg");
    if (!this.RequestData) {
      return Promise.reject(new Error("RequestData not set"));
    }
    return Promise.resolve(this.RequestData);
  }
}
