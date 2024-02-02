import { HttpRequest } from "../types/http_request";
import { HttpClient } from "../types/http_client";
import { HttpResponse } from "../types/http_response";
import { HttpHeader } from "../types/http_header";
import { HttpURL } from "../types/http_url";

class httpClient implements HttpClient {
  readonly res: HttpResponse;
  req?: HttpRequest;

  constructor(res: HttpResponse) {
    this.res = res;
  }

  Do(req: HttpRequest): Promise<HttpResponse> {
    this.req = req;
    return Promise.resolve(this.res);
  }

  Get(url: string): Promise<HttpResponse> {
    return this.Do({
      Header: HttpHeader.from(),
      URL: HttpURL.parse(url).unwrap(),
      Method: "GET",
    });
  }

  Post(url: string, contentType: string, body: ReadableStream<Uint8Array>): Promise<HttpResponse> {
    return this.Do({
      Header: HttpHeader.from({
        "Content-Type": contentType,
      }),
      URL: HttpURL.parse(url).unwrap(),
      Method: "POST",
      Body: body,
    });
  }
  CloseIdleConnections() {
    // pass
  }
}

export function NewMockHttpClient(res: HttpResponse): HttpClient {
  return new httpClient(res);
}
