import { HttpClient } from "../types/http_client";
import { HttpHeader } from "../types/http_header";
import { DefaultHttpRequest, HttpRequest, HttpURL } from "../types/http_request";
import { HttpResponse } from "../types/http_response";

const defaultHeader = HttpHeader.from({
  "User-Agent": "runified/1.0.0",
});
export class HttpClientImpl implements HttpClient {
  readonly _defaultHeader: HttpHeader;
  readonly _abortController = new AbortController();

  constructor(headers?: HttpHeader) {
    this._defaultHeader = defaultHeader.Merge(headers);
  }

  Abort() {
    this._abortController.abort();
  }

  async Do(req: HttpRequest): Promise<HttpResponse> {
    const duplex: { duplex?: string } = {};
    if (req.Body) {
      duplex.duplex = "half";
    }
    const fres = await fetch(req.URL.String(), {
      method: req.Method,
      body: req.Body,
      headers: req.Header.Merge(this._defaultHeader).AsHeaderInit(),
      signal: this._abortController.signal,
      ...duplex,
    });
    return Promise.resolve({
      Header: HttpHeader.from(fres.headers),
      Body: fres.body ? fres.body : undefined,
      StatusCode: fres.status,
    });
  }
  Get(url: string): Promise<HttpResponse> {
    return this.Do(
      DefaultHttpRequest({
        Method: "GET",
        URL: HttpURL.parse(url).unwrap(),
      })
    );
  }
  Post(url: string, contentType: string, body: ReadableStream<Uint8Array>): Promise<HttpResponse> {
    return this.Do({
      Method: "POST",
      URL: HttpURL.parse(url).unwrap(),
      Header: HttpHeader.from({
        "Content-Type": contentType,
      }),
      Body: body,
    });
  }
}
