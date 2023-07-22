import { HttpHeader } from "./http_header";
import { result } from "wueste";

export class HttpURL {
  readonly _url: URL;

  private constructor(url: URL) {
    this._url = url;
  }

  static join(...parts: string[]): string {
    return parts.join("/").replace(/\/+/g, "/");
  }

  static parse(url: string | HttpURL | URL): result.Result<HttpURL> {
    try {
      if (url instanceof HttpURL) {
        return result.Result.Ok(url);
      }
      if (url instanceof URL) {
        return result.Result.Ok(new HttpURL(url));
      }
      const my = new URL(url);
      return result.Result.Ok(new HttpURL(my));
    } catch (e) {
      return result.Result.Err(e as Error);
    }
  }
  Query(): URLSearchParams {
    return this._url.searchParams;
  }
  get Scheme(): string {
    return this._url.protocol;
  }
  get Host(): string {
    return this._url.host;
  }
  get Path(): string {
    return this._url.pathname;
  }
  String(): string {
    return this._url.toString();
  }
}

export interface HttpRequestParam {
  readonly Header?: HttpHeader;
  readonly URL: HttpURL | string;
  readonly Body?: ReadableStream<Uint8Array>;
  readonly Method?: string;
}

export interface HttpRequest {
  readonly Header: HttpHeader;
  readonly URL: HttpURL;
  readonly Body?: ReadableStream<Uint8Array>;
  readonly Method: string;
}

export function DefaultHttpRequest(hp: HttpRequestParam): HttpRequest {
  return {
    Header: hp.Header || new HttpHeader(),
    URL: HttpURL.parse(hp.URL).unwrap(),
    Method: hp.Method || "GET",
    Body: hp.Body,
  };
}
