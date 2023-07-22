import { HttpHandlerFunc } from "./http_handler_func";
import { HttpRequest } from "./http_request";
import { HttpResponseWriter } from "./http_response_writer";
import { HttpServer } from "./http_server";
import { result } from "wueste";

export interface HTTPHandlerParam {
  readonly HttpServer: HttpServer;
}

const textEncoder = new TextEncoder();
export class HTTPHandler {
  readonly _params: HTTPHandlerParam;
  readonly _handlerMap: Map<string, HttpHandlerFunc> = new Map();

  constructor(hp: HTTPHandlerParam) {
    this._params = hp;
    this._params.HttpServer.SetHandler({
      ServeHTTP: async (w: HttpResponseWriter, r: HttpRequest): Promise<void> => {
        try {
          const fn = this._handlerMap.get(r.URL.Path);
          if (fn) {
            await fn(w, r);
            await w.End();
            return Promise.resolve();
          }
          w.WriteHeader(404);
          await w.Write(textEncoder.encode("Not found: " + r.URL.Path));
          await w.End();
          return Promise.resolve();
        } catch (err) {
          return Promise.reject(err);
        }
      },
    });
  }

  HttpServer(): HttpServer {
    return this._params.HttpServer;
  }

  Start(): Promise<void> {
    return this._params.HttpServer.ListenAndServe();
  }

  Stop(): Promise<void> {
    return this._params.HttpServer.Shutdown();
  }

  RegisterHandler(path: string, fn: HttpHandlerFunc): result.Result<() => void, Error> {
    if (this._handlerMap.has(path)) {
      return result.Result.Err(new Error(`Handler already registered, path: ${path}`));
    }
    this._handlerMap.set(path, fn);
    return result.Result.Ok(() => {
      this._handlerMap.delete(path);
    });
  }
}
