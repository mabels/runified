import { DefaultHttpRequest, HttpClient, HttpGetRequest, HttpHeader, HttpRequest, HttpResponse, HttpURL } from "../types";

const defaultHeader = HttpHeader.from({
  "User-Agent": "runified/1.0.0",
});
export class FetchHttpClient implements HttpClient {
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
    const breq = req;
    if (breq.Body) {
      duplex.duplex = "half";
    }
    const fres = await fetch(req.URL.String(), {
      method: req.Method,
      body: breq.Body,
      headers: req.Header.Merge(this._defaultHeader).AsHeaderInit(),
      signal: this._abortController.signal,
      redirect: req.Method === "GET" ? (req as HttpGetRequest).Redirect : undefined,
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
      }),
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
