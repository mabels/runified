import { HttpHeader, HttpMethods, HttpRequest, HttpRequestBase, HttpURL, toHttpMethods } from "../types";

class mapBrowserMethod implements HttpRequestBase {
  readonly _req: HttpRequest;

  constructor(req: HttpRequest) {
    this._req = req;
  }

  get Header(): HttpHeader {
    return this._req.Header;
  }
  get URL(): HttpURL {
    return this._req.URL;
  }
  get Body(): ReadableStream<Uint8Array> | undefined {
    return this._req.Body;
  }
  get Method(): HttpMethods {
    const override = this._req.Header.Get("X-HTTP-Method-Override");
    if (!override) {
      return this._req.Method;
    }
    return toHttpMethods(override);
  }
}
export function MapBrowserMethod(req: HttpRequest): HttpRequest {
  return new mapBrowserMethod(req);
}
