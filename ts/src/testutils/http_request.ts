import { HttpHeader } from "../types/http_header.js";
import { HttpMethods, HttpRequest, HttpRequestBase } from "../types/http_request.js";
import { HttpURL } from "../types/http_url.js";

type MockHttpRequestImplParams = Partial<HttpRequest>;

class MockHttpRequestImpl implements HttpRequestBase {
  readonly Header: HttpHeader;
  readonly URL: HttpURL;
  readonly Body: ReadableStream<Uint8Array>;
  readonly Method: HttpMethods;

  constructor(params: MockHttpRequestImplParams) {
    if (params.Header) {
      this.Header = params.Header;
    } else {
      this.Header = new HttpHeader();
    }
    if (params.URL) {
      this.URL = params.URL;
    } else {
      this.URL = HttpURL.parse("http://localhost/").unwrap();
    }
    if (params.Body) {
      this.Body = params.Body;
    } else {
      this.Body = new ReadableStream<Uint8Array>();
    }
    if (params.Method) {
      this.Method = params.Method;
    } else {
      this.Method = "GET";
    }
  }
}

export function MockHttpRequest(p?: MockHttpRequestImplParams): HttpRequest {
  return new MockHttpRequestImpl(p || {});
}
