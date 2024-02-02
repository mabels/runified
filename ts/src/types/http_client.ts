import { HttpRequest } from "./http_request";
import { HttpResponse } from "./http_response";

export interface HttpClient {
  // CloseIdleConnections()
  Do(req: HttpRequest): Promise<HttpResponse>;
  Get(url: string): Promise<HttpResponse>;
  // Head(url string) (resp *http.Response, err error)
  Post(url: string, contentType: string, body: ReadableStream<Uint8Array> | Uint8Array | string): Promise<HttpResponse>;
  // PostForm(url string, data url.Values) (resp *http.Response, err error)
}
