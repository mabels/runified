import { APIMsg, Api, ApiHandler as ApiHandlerIf, ApiHandlerTyped, ApiHandlerUnTyped, AppHandler } from "../types/app";
import { ErrorFactory, HttpHandlerFunc, HttpRequest, HttpResponseWriter, HttpStatusCode, Logger } from "../types";
import { stream2string } from "../utils";
import { MapBrowserMethod } from "./map-browser-method";
import { WuestenFactory } from "wueste/wueste";
import { BindAppToHandler } from "./app";

// wraps typed apihandler into untyped apihandler
export function WrapUntypedApi<Q, S>(apihandler: ApiHandlerTyped<Q, S>): ApiHandlerUnTyped {
  return (api: ApiHandlerIf): Promise<boolean> => {
    return apihandler(api as APIMsg<Q, S>);
  };
}

export function WrapApiHandler<
  Q extends WuestenFactory<unknown, unknown, unknown>,
  S extends WuestenFactory<unknown, unknown, unknown>,
>(api: Api, handlers: ApiHandlerUnTyped[], rtf: Q): HttpHandlerFunc {
  return BindAppToHandler(api.App(), async (reqApp: AppHandler) => {
    const r = MapBrowserMethod(reqApp.Request());
    const w = reqApp.Response();
    const log = reqApp
      .Log()
      .With()
      .Module("api-" + r.URL.Path)
      .Logger();
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
export interface ApiHandlerParams<
  Q extends WuestenFactory<unknown, unknown, unknown>,
  S extends WuestenFactory<unknown, unknown, unknown>,
> {
  readonly api: Api;
  readonly logRef: Logger;
  readonly requestTypeFactory: Q;
  readonly responseFactory?: S;
  readonly requestId: string;
  readonly httpRequest: HttpRequest;
  readonly httpResponse: HttpResponseWriter;
}
export class ApiHandler<Q extends WuestenFactory<unknown, unknown, unknown>, S extends WuestenFactory<unknown, unknown, unknown>>
  implements APIMsg<Q["T"], S["T"]>
{
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

  WriteMsg(data: S["T"]): Promise<number> {
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

  async RequestMsg(): Promise<Q["T"]> {
    const body = await stream2string(this.Request().Body);

    const reqBuilder = this._params.requestTypeFactory.Builder();
    this._params.logRef.Debug().Any("body", body).Msg("RequestMsg");
    const resReq = reqBuilder.Coerce(JSON.parse(body));
    if (resReq.is_err()) {
      throw resReq.unwrap_err();
    }
    return resReq.unwrap();
  }
}
