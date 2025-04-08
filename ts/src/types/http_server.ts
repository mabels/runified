// package types

import { AddrPort } from "./app_port.js";
import { HttpRequest } from "./http_request.js";
import { HttpResponseWriter } from "./http_response_writer.js";

export interface ActionHandler {
  ServeHTTP(w: HttpResponseWriter, r: HttpRequest): Promise<void>;
}

export interface HttpServer {
  SetHandler(h: ActionHandler): void;
  ListenAndServe(): Promise<void>;
  Shutdown(): Promise<void>;
  GetListenAddr(): AddrPort | undefined;
}
