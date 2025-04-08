import fdk from "@fnproject/fdk";

import { setupTestServer } from "../test-server.js";
import {
  HttpRequest,
  DefaultHttpRequest,
  HttpURL,
  ActionHandler,
  AddrPort,
  HttpHeader,
  HttpResponseWriter,
  HttpServer,
  HttpStatusCode,
  toHttpMethods,
} from "../../types/index.js";

interface OciContext {
  _config: Record<string, string>;
  _body: OCIRequest;
  _headers: Record<string, string[]>;
  _method?: string;
  _responseHeaders: Record<string, string[]>;
}

interface OCIRequest {
  url: string;
  method: string;
  headers: HeadersInit;
  body: string;
}

interface OCIResponse {
  statusCode: number;
  headers: HeadersInit;
  body: string;
}

const textEncoder = new TextEncoder();

class OciResponseWriter implements HttpResponseWriter {
  readonly _header: HttpHeader = new HttpHeader();
  _statusCode: HttpStatusCode = HttpStatusCode.OK;
  _ended = false;
  readonly _decoder = new TextDecoder();
  _body = "";

  Header(): HttpHeader {
    return this._header;
  }
  async Write(b: Uint8Array): Promise<number> {
    if (!b || b.length === 0) {
      await this.End();
      return Promise.resolve(0);
    }
    this._body += this._decoder.decode(b, { stream: true });
    return Promise.resolve(b.length);
  }
  WriteHeader(statusCode: HttpStatusCode): void {
    this._statusCode = statusCode;
  }
  End(): Promise<void> {
    if (this._ended) {
      return Promise.resolve();
    }
    this._ended = true;
    // this._res.end();
    return Promise.resolve();
  }

  asResponse(): OCIResponse {
    return {
      statusCode: this._statusCode,
      headers: this._header.AsHeaderInit(),
      body: this._body,
    };
  }
}

export class OciHttpServer implements HttpServer {
  _handler?: ActionHandler;

  readonly OciHandler = async (body: unknown, event: OciContext): Promise<OCIResponse> => {
    if (!this._handler) {
      return Promise.resolve({
        statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
        headers: HttpHeader.from({}).AsHeaderInit(),
        body: JSON.stringify({ error: "No Handler" }),
      });
    }

    let headers: HeadersInit = {};
    let method = "GET";
    const ebody = event._body;
    headers = (ebody.headers as { host?: string }) ?? {};
    method = ebody.method ?? "GET";
    const host = headers.host ?? "localhost";
    let rurl = HttpURL.parse(`http://${host}${ebody.url ?? "/"}`);
    if (rurl.is_err()) {
      rurl = HttpURL.parse("http://localhost");
    }

    const req: HttpRequest = DefaultHttpRequest({
      Header: HttpHeader.from(headers),
      URL: HttpURL.parse(rurl).unwrap(),
      Method: toHttpMethods(method),
      Body: new ReadableStream<Uint8Array>({
        start(controller): void {
          controller.enqueue(textEncoder.encode(event._body.body));
          controller.close();
        },
      }),
    });

    const res = new OciResponseWriter();
    await this._handler.ServeHTTP(res, req);
    return res.asResponse();
  };

  GetListenAddr(): AddrPort | undefined {
    throw new Error("Method not implemented.");
  }

  SetHandler(h: ActionHandler): void {
    this._handler = h;
  }
  ListenAndServe(): Promise<void> {
    return Promise.resolve();
  }
  Shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

const ociHttpServer = new OciHttpServer();
setupTestServer(ociHttpServer);

fdk.handle(ociHttpServer.OciHandler);
