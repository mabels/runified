import { Handler } from "aws-lambda";

import {
  ActionHandler,
  AddrPort,
  DefaultHttpRequest,
  HttpHeader,
  HttpRequest,
  HttpResponseWriter,
  HttpServer,
  HttpStatusCode,
  HttpURL,
} from "../../types";

import { setupTestServer } from "../test-server";

class AWSResponseWriter implements HttpResponseWriter {
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

  asResponse(): AWSResponse {
    return {
      statusCode: this._statusCode,
      headers: this._header.AsHeaderInit(),
      body: this._body,
    };
  }
}

interface AWSResponse {
  statusCode: number;
  headers: HeadersInit;
  body: string;
}

interface AWSRequest {
  url: string;
  method: string;
  headers: HeadersInit;
  body: string;
}

const textEncoder = new TextEncoder();
export class AWSHttpServer implements HttpServer {
  _handler?: ActionHandler;

  readonly awsHandler = async (event: AWSRequest, context: { succeed: (x: AWSResponse) => void }) => {
    if (!this._handler) {
      return Promise.resolve(
        JSON.stringify({
          statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
          body: JSON.stringify({ error: "No Handler" }),
        }),
      );
    }
    let headers: HeadersInit = {};
    let method = "GET";
    const reqHeaders = JSON.parse(event.body) as AWSRequest;
    headers = (reqHeaders.headers as { host?: string }) ?? {};
    method = reqHeaders.method ?? "GET";
    const host = headers.host ?? "localhost";
    let url = HttpURL.parse(`http://${host}${reqHeaders.url! ?? "/"}`);
    if (url.is_err()) {
      url = HttpURL.parse("http://localhost");
    }

    const req: HttpRequest = DefaultHttpRequest({
      Header: HttpHeader.from(headers),
      URL: url.unwrap(),
      Method: method,
      Body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(textEncoder.encode(event.body));
          controller.close();
        },
      }),
    });

    const res = new AWSResponseWriter();
    await this._handler.ServeHTTP(res, req);
    context.succeed(res.asResponse());
  };

  SetHandler(h: ActionHandler) {
    this._handler = h;
  }
  ListenAndServe(): Promise<void> {
    return Promise.resolve();
  }
  Shutdown(): Promise<void> {
    return Promise.resolve();
  }
  GetListenAddr(): AddrPort | undefined {
    throw new Error("Method not implemented.");
  }
}

const awsHttpServer = new AWSHttpServer();
setupTestServer(awsHttpServer);

export const handler: Handler = awsHttpServer.awsHandler;
