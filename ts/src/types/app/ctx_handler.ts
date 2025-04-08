import { HttpRequest } from "../http_request.js";
import { HttpResponseWriter } from "../http_response_writer.js";
import { Logger } from "@adviser/cement";

export interface CtxHandler {
  Log(): Logger;
  RequestId(): string;
  Response(): HttpResponseWriter;
  Request(): HttpRequest;
}
