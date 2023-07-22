import { APIMsg, ApiHandler as ApiHandlerIf, ApiHandlerTyped, ApiHandlerUnTyped } from "../types/app/api_handler";
import { AppHandler } from "../types/app/app_handler";
import { HttpHandlerFunc } from "../types/http_handler_func";
import { HttpRequest } from "../types/http_request";
import { HttpResponseWriter } from "../types/http_response_writer";
import { HttpStatusCode } from "../types/http_statuscodes";
import { Logger } from "../types/logger";
import { stream2string } from "../utils/stream2string";
import { MapBrowserMethod } from "./map-browser-method";
import { Api } from "../types/app/api";
import { WuestenFactory } from "wueste/wueste";
import { BindAppToHandler } from "./app";
import { ErrorFactory } from "../generated/error";

// wraps typed apihandler into untyped apihandler
export function WrapUntypedApi<Q, S>(apihandler: ApiHandlerTyped<Q, S>): ApiHandlerUnTyped {
  return (api: ApiHandlerIf): Promise<boolean> => {
    return apihandler(api as APIMsg<Q, S>);
  };
}

export function WrapApiHandler<Q, S>(api: Api, handlers: ApiHandlerUnTyped[], rtf: WuestenFactory<Q>): HttpHandlerFunc {
  return BindAppToHandler(api.App(), async (reqApp: AppHandler) => {
    const r = MapBrowserMethod(reqApp.Request());
    const w = reqApp.Response();
    const log = reqApp.Log().With().Str("api", r.URL.Path).Logger();
    const hdl = new ApiHandler<Q, S>({
      api: api,
      logRef: log,
      requestTypeFactory: rtf,
      requestId: r.Header.Get("X-Request-ID") || "kaputt",
      httpRequest: r,
      httpResponse: w,
    });
    try {
      for (const handler of handlers) {
        const ret = await handler(hdl);
        if (!ret) {
          break;
        }
      }
    } catch (err) {
      w.WriteHeader(HttpStatusCode.INTERNAL_SERVER_ERROR);
      const errBuilder = ErrorFactory.Builder();
      errBuilder.requestId(hdl.RequestId());
      errBuilder.message((err as Error).message);
      errBuilder.status(HttpStatusCode.INTERNAL_SERVER_ERROR);
      const errObj = errBuilder.Get();
      if (errObj.is_err()) {
        throw errObj.unwrap_err();
      }
      await w.Write(JSON.stringify(ErrorFactory.ToObject(errObj.unwrap())));
    }
    await w.End();
    return Promise.resolve(true);
  });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApiHandlerParams<Q, S> {
  readonly api: Api;
  readonly logRef: Logger;
  readonly requestTypeFactory: WuestenFactory<Q>;
  readonly requestId: string;
  readonly httpRequest: HttpRequest;
  readonly httpResponse: HttpResponseWriter;
}
export class ApiHandler<Q, S> implements APIMsg<Q, S> {
  readonly _params: ApiHandlerParams<Q, S>;
  constructor(params: ApiHandlerParams<Q, S>) {
    this._params = params;
  }

  Log(): Logger {
    return this._params.logRef;
  }

  Api(): Api {
    return this._params.api;
  }

  RequestId(): string {
    return this._params.requestId;
  }

  Request(): HttpRequest {
    return this._params.httpRequest;
  }

  Response(): HttpResponseWriter {
    return this._params.httpResponse;
  }

  ErrorMsg(err: unknown | Error): Promise<number> {
    let realErr = err as Error;
    if (!(err instanceof Error)) {
      realErr = new Error("ErrorMsg called with non-Error");
    }

    this.Log().Error().Err(realErr).Msg("API error");
    const res = this.Response();
    res.WriteHeader(HttpStatusCode.INTERNAL_SERVER_ERROR);

    const errMsg = {
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
      requestId: this.RequestId(),
      message: realErr.message,
    };
    const errRes = ErrorFactory.Builder().Coerce(errMsg);
    let bytesErrMsg = "";
    if (errRes.is_err()) {
      bytesErrMsg = JSON.stringify(errMsg);
    } else {
      bytesErrMsg = JSON.stringify(ErrorFactory.ToObject(errRes.unwrap()));
    }
    return res.Write(bytesErrMsg);
  }

  WriteMsg(data: S): Promise<number> {
    const responseJsonPayload = JSON.stringify(data);
    const w = this._params.httpResponse;

    w.Header().Set("Content-Type", "application/json");
    w.Header().Set("X-Request-ID", this.RequestId());
    w.WriteHeader(HttpStatusCode.OK);

    try {
      return w.Write(responseJsonPayload);
    } catch (err) {
      return this.ErrorMsg(err);
    }
  }

  async RequestMsg(): Promise<Q> {
    const body = await stream2string(this.Request().Body);

    const reqBuilder = this._params.requestTypeFactory.Builder();
    const resReq = reqBuilder.Coerce(JSON.parse(body));
    if (resReq.is_err()) {
      throw resReq.unwrap_err();
    }
    return resReq.unwrap();
  }
}
