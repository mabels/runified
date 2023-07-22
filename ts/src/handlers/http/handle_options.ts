import { ApiHandler } from "../../types/app/api_handler";
import { HttpStatusCode } from "../../types/http_statuscodes";

export function HandleOPTIONS(api: ApiHandler): Promise<boolean> {
  const r = api.Request();
  if (r.Method === "OPTIONS") {
    const w = api.Response();
    // Send response to OPTIONS requests
    w.Header().Set("Access-Control-Allow-Methods", "POST,GET,PUT,PATCH,DELETE,OPTIONS");
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type");
    w.Header().Set("Access-Control-Max-Age", "3600");
    w.WriteHeader(HttpStatusCode.NO_CONTENT);
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}
