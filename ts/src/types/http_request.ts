import { HttpHeader } from "./http_header.js";
import { HttpURL } from "./http_url.js";

export type HttpMethods = "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE" | "HEAD";

export function toHttpMethods(m: string): HttpMethods {
  switch (m) {
    case "GET":
    case "POST":
    case "OPTIONS":
    case "PUT":
    case "DELETE":
    case "HEAD":
      return m;
    default:
      throw new Error(`Invalid method: ${m}`);
  }
}

export interface HttpRequestParamBase {
  readonly Method?: HttpMethods;
  readonly URL: HttpURL | string | URL;
  readonly Header?: HttpHeader;
  readonly Body?: ReadableStream<Uint8Array>;
}

export interface HttpGetRequestParam extends HttpRequestParamBase {
  readonly Method: "GET";
  readonly Redirect?: "follow" | "error" | "manual";
}

export type HttpRequestParam = HttpGetRequestParam | HttpRequestParamBase;

export interface HttpRequestBase {
  readonly URL: HttpURL;
  readonly Header: HttpHeader;
  readonly Method: HttpMethods;
  readonly Body?: ReadableStream<Uint8Array>;
  readonly Signal?: AbortSignal;
}

export interface HttpGetRequest extends HttpRequestBase {
  readonly Method: "GET";
  readonly Redirect?: "follow" | "error" | "manual";
}

export type HttpRequest = HttpGetRequest | HttpRequestBase;

export function DefaultHttpRequest(hp: HttpRequestParam): HttpRequest {
  return {
    ...hp,
    Header: hp.Header || new HttpHeader(),
    URL: HttpURL.parse(hp.URL).unwrap(),
    Method: toHttpMethods(hp.Method || "GET"),
  } as HttpRequest;
}
