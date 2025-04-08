import { HttpHandlerFunc } from "./http_handler_func.js";
import { HttpRequest } from "./http_request.js";
import { HttpResponseWriter } from "./http_response_writer.js";
import { HttpServer } from "./http_server.js";
import { Result } from "@adviser/cement";

export interface HTTPHandlerParam {
  readonly HttpServer: HttpServer;
}

const textEncoder = new TextEncoder();
export class HTTPHandler {
  readonly _params: HTTPHandlerParam;
  readonly _handlerMap = new Map<string, HttpHandlerFunc>();

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

  RegisterHandler(path: string, fn: HttpHandlerFunc): Result<() => void, Error> {
    if (this._handlerMap.has(path)) {
      return Result.Err(new Error(`Handler already registered, path: ${path}`));
    }
    this._handlerMap.set(path, fn);
    return Result.Ok(() => {
      this._handlerMap.delete(path);
    });
  }
}
