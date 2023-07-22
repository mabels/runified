import { HttpHeader } from "../types/http_header";
import { HttpRequest, HttpURL } from "../types/http_request";

class mapBrowserMethod implements HttpRequest {
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
  get Method(): string {
    const override = this._req.Header.Get("X-HTTP-Method-Override");
    if (!override) {
      return this._req.Method;
    }
    return override;
  }
}
export function MapBrowserMethod(req: HttpRequest): HttpRequest {
  return new mapBrowserMethod(req);
}
