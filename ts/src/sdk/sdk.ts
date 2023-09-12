import { HttpClientImpl, LoggerImpl, SystemAbstractionImpl } from "../utils";

import { HttpClient as HttpClientIf, HttpHeader, Logger, SysAbstraction } from "../types";

export interface SdkClientParams {
  readonly BaseUrl: string;
  readonly Client?: HttpClientIf;
  readonly Sys?: SysAbstraction;
  readonly Logger?: Logger;
  readonly DefaultRequestHeaders?: HttpHeader;
}

export class SDKClient {
  readonly BaseUrl: string;
  readonly Client: HttpClientIf;
  readonly Sys: SysAbstraction;
  readonly Logger: Logger;
  readonly DefaultRequestHeaders: HttpHeader = HttpHeader.from({ "User-Agent": "runified/1.0.0" });
  constructor(params: SdkClientParams) {
    this.BaseUrl = params.BaseUrl;
    if (!params.Sys) {
      this.Sys = new SystemAbstractionImpl();
    } else {
      this.Sys = params.Sys;
    }
    if (!params.Logger) {
      this.Logger = new LoggerImpl();
    } else {
      this.Logger = params.Logger;
    }
    this.Logger = this.Logger.With().Timestamp().Module("sdk").Logger();
    if (!params.Client) {
      this.Client = new HttpClientImpl();
    } else {
      this.Client = params.Client;
    }
    if (params.DefaultRequestHeaders) {
      for (const [k, v] of params.DefaultRequestHeaders.Items()) {
        this.DefaultRequestHeaders.Set(k, v);
      }
    }
  }
}
