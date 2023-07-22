// import fdk from "@fnproject/fdk";

// import { HttpResponseWriter } from "../../types/http_response_writer";
// import { HttpHeader } from "../../types/http_header";
import { HttpStatusCode } from "../../types/http_statuscodes";
import { ActionHandler, HttpServer } from "../../types/http_server";
import { setupTestServer } from "../test-server";
// import { DefaultHttpRequest, HttpURL } from "../../types/http_request";

import fdk from "@fnproject/fdk";
import { HttpResponseWriter } from "../../types/http_response_writer";
import { HttpHeader } from "../../types/http_header";
import { HttpRequest, DefaultHttpRequest, HttpURL } from "../../types/http_request";
import { AddrPort } from "../../types/app/config";

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
  WriteHeader(statusCode: HttpStatusCode) {
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

    let url: URL;
    let headers: HeadersInit = {};
    let method = "GET";
    try {
      const req = event._body;
      headers = (req.headers as { host?: string }) ?? {};
      method = req.method ?? "GET";
      const host = headers.host ?? "localhost";
      url = new URL(`http://${host}${req.url! ?? "/"}`);
    } catch (e) {
      url = new URL("http://localhost");
    }

    const req: HttpRequest = DefaultHttpRequest({
      Header: HttpHeader.from(headers),
      URL: HttpURL.parse(url).unwrap(),
      Method: method,
      Body: new ReadableStream<Uint8Array>({
        start(controller) {
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

  SetHandler(h: ActionHandler) {
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
