import { DefaultHttpRequest, HttpClient, HttpGetRequest, HttpHeader, HttpRequest, HttpResponse } from "../types/index.js";
import { HttpURL } from "../types/http_url.js";
import { string2stream, uint8array2stream } from "@adviser/cement/utils";

const defaultHeader = HttpHeader.from({
  "User-Agent": "runified/1.0.0",
});
export class FetchHttpClient implements HttpClient {
  readonly _defaultHeader: HttpHeader;

  constructor(headers?: HttpHeader) {
    this._defaultHeader = defaultHeader.Merge(headers);
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
      signal: req.Signal,
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
  Post(url: string, contentType: string, ibody: ReadableStream<Uint8Array> | Uint8Array | string): Promise<HttpResponse> {
    let body: ReadableStream<Uint8Array>;
    if (typeof ibody === "string") {
      body = string2stream(ibody);
    } else {
      const rbody = ibody as ReadableStream<Uint8Array>;
      if (typeof rbody.getReader === "function") {
        body = rbody;
      } else {
        body = uint8array2stream(ibody as Uint8Array);
      }
    }
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
