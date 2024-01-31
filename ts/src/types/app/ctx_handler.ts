import { HttpRequest } from "../http_request";
import { HttpResponseWriter } from "../http_response_writer";
import { Logger } from "@adviser/cement";

export interface CtxHandler {
  Log(): Logger;
  RequestId(): string;
  Response(): HttpResponseWriter;
  Request(): HttpRequest;
}
