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

  static parse(url: string | HttpURL | URL | result.Result<HttpURL>, base?: string): result.Result<HttpURL> {
    if (result.IsResult(url)) {
      url = url.unwrap();
    }
    try {
      if (url instanceof HttpURL) {
        return result.Result.Ok(new HttpURL(new URL(url._url)));
      }
      return result.Result.Ok(new HttpURL(new URL(url, base)));
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
  get Hostname(): string {
    return this._url.hostname;
  }
  get Path(): string {
    return this._url.pathname;
  }
  get Port(): string {
    return this._url.port;
  }
  get SearchParams(): URLSearchParams {
    return this._url.searchParams;
  }
  get Search(): string {
    return this._url.search;
  }

  SetPath(...parts: string[]) {
    for (let i = 1; i < parts.length; i++) {
      if (parts[i - 1].endsWith("/")) {
        parts[i - 1] = parts[i - 1].slice(0, -1);
      }
      if (parts[i].startsWith("/")) {
        parts[i] = parts[i].slice(1);
      }
    }
    this._url.pathname = parts.join("/");
    return this._url.pathname;
  }

  AsJsURL(): URL {
    return new URL(this._url);
  }

  String(): string {
    return this._url.toString();
  }
  toString(): string {
    return this.String();
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
