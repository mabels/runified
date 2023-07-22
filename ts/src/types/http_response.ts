import { HttpHeader } from "./http_header";

export interface HttpResponse {
  readonly Header?: HttpHeader;
  readonly Body?: ReadableStream;
  readonly StatusCode: number;
}
