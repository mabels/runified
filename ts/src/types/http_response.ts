import { HttpHeader } from "./http_header.js";

export interface HttpResponse {
  readonly Header?: HttpHeader;
  readonly Body?: ReadableStream;
  readonly StatusCode: number;
}
