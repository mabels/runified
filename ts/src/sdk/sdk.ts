import { HttpClientImpl } from "../utils/http_client";
import { SystemAbstractionImpl } from "../utils/system_abstraction";

import { HttpClient as HttpClientIf } from "../types/http_client";
import { SysAbstraction as SysAbstractionIf } from "../types/sys_abstraction";
import { HttpHeader } from "../types/http_header";

export interface SdkClientParams {
  readonly BaseUrl: string;
  readonly Client?: HttpClientIf;
  readonly Sys?: SysAbstractionIf;
  readonly DefaultRequestHeaders?: HttpHeader;
}

export class SDKClient {
  readonly BaseUrl: string;
  readonly Client: HttpClientIf;
  readonly Sys: SysAbstractionIf;
  readonly DefaultRequestHeaders: HttpHeader = HttpHeader.from({ "User-Agent": "runified/1.0.0" });
  constructor(params: SdkClientParams) {
    this.BaseUrl = params.BaseUrl;
    if (!params.Sys) {
      this.Sys = new SystemAbstractionImpl();
    } else {
      this.Sys = params.Sys;
    }
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
