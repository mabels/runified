// package types

import { AddrPort } from "./app_port";
import { HttpRequest } from "./http_request";
import { HttpResponseWriter } from "./http_response_writer";

export interface ActionHandler {
  ServeHTTP(w: HttpResponseWriter, r: HttpRequest): Promise<void>;
}

export interface HttpServer {
  SetHandler(h: ActionHandler): void;
  ListenAndServe(): Promise<void>;
  Shutdown(): Promise<void>;
  GetListenAddr(): AddrPort | undefined;
}
