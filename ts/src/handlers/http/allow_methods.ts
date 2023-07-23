import { ApiHandler, ApiHandlerUnTyped } from "../../types/app";
import { HttpStatusCode } from "../../types";

export function AllowMethods(...methods: string[]): ApiHandlerUnTyped {
  return function (api: ApiHandler): Promise<boolean> {
    if (methods.length === 0) {
      return Promise.resolve(true);
    }
    const r = api.Request();
    for (const method of methods) {
      if (r.Method === method) {
        return Promise.resolve(true);
      }
    }
    const w = api.Response();
    w.WriteHeader(HttpStatusCode.METHOD_NOT_ALLOWED);
    return Promise.resolve(false);
  };
}
