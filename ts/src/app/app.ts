import { v4 } from "uuid";
import { AllowMethods } from "../handlers/http/allow_methods";
import { HandleOPTIONS } from "../handlers/http/handle_options";
import { SetConnectionClose } from "../handlers/http/set_connection_close";
import { ApiHandlerTyped, ApiHandlerUnTyped } from "../types/app/api_handler";
import { App } from "../types/app/app";
import { AppHandlerFn, AppHandler } from "../types/app/app_handler";
import { HttpHandlerFunc } from "../types/http_handler_func";
import { HttpRequest } from "../types/http_request";
import { HttpResponseWriter } from "../types/http_response_writer";
import { CountingResponseWriter, CountingReadableStream, FilterHeaders, CalculateHeaderByteLength } from "../utils/counter";
import { WrapUntypedApi } from "./api_handler";
import { SetCorsHeader } from "../handlers/http/set_cors";

export function BindAppToHandler(app: App, appHandlerfn: AppHandlerFn): HttpHandlerFunc {
  return async (s: HttpResponseWriter, q: HttpRequest) => {
    let rid = q.Header.Get("X-Request-ID");
    if (rid === undefined) {
      rid = v4();
      q.Header.Set("X-Request-ID", rid);
      s.Header().Set("X-Request-ID", rid);
    }

    const log = app.Log().With().Str("rid", rid).Str("path", q.URL.Path).Logger();
    const start = app.Sys().Time().Now();

    const nw = new CountingResponseWriter(s);
    const crr = q.Body && new CountingReadableStream(q.Body);
    const newReq: HttpRequest = { ...q, Body: crr };

    nw.Header().Set("X-Request-ID", rid);

    const ctx = new AppHandler({
      App: app,
      Log: log,
      RequestId: rid,
      Req: newReq,
      Res: nw,
    });

    await appHandlerfn(ctx);

    const headers = FilterHeaders(q.Header);
    const requestLength = CalculateHeaderByteLength(q.Header) + (crr ? crr.ReadBytes : 0);
    return log
      .Info()
      .Any("headers", headers)
      .Dur("duration", app.Sys().Time().TimeSince(start))
      .Uint64("requestLength", requestLength)
      .Uint64("responseLength", nw.WrittenBytes + CalculateHeaderByteLength(nw.Header()))
      .Msg("Request completed");
  };
}

export function ApiHandlers<Q, S>(hdl: ApiHandlerTyped<Q, S>): ApiHandlerUnTyped[] {
  return [HandleOPTIONS, AllowMethods("POST", "PUT"), SetCorsHeader, SetConnectionClose, WrapUntypedApi<Q, S>(hdl)];
}
