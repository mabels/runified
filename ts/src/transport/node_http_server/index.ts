import { AddrPort } from "../../types/app/config";
import { ActionHandler, HttpServer } from "../../types/http_server";
import { DefaultHttpRequest, HttpRequest, HttpURL } from "../../types/http_request";
import { HttpResponseWriter } from "../../types/http_response_writer";
import { HttpStatusCode } from "../../types/http_statuscodes";

import { createServer, IncomingMessage, ServerResponse } from "http";
import { HttpHeader } from "../../types/http_header";

class NodeResponseWriter implements HttpResponseWriter {
  readonly _header: HttpHeader = new HttpHeader();

  _ended = false;
  _setHeader = false;

  constructor(private readonly _res: ServerResponse) {}

  Header(): HttpHeader {
    return this._header;
  }
  setHeader() {
    if (this._setHeader) {
      return;
    }
    this._setHeader = true;
    for (const [k, vs] of this._header.Items()) {
      this._res.setHeader(k, vs);
    }
  }
  async Write(b: Uint8Array): Promise<number> {
    this.setHeader();
    if (!b || b.length === 0) {
      await this.End();
      return Promise.resolve(0);
    }
    this._res.write(b);
    return Promise.resolve(b.length);
  }
  WriteHeader(statusCode: HttpStatusCode) {
    this._res.statusCode = statusCode;
  }
  End(): Promise<void> {
    if (this._ended) {
      return Promise.resolve();
    }
    this.setHeader();
    this._ended = true;
    this._res.end();
    return Promise.resolve();
  }
}

export class NodeHttpServer implements HttpServer {
  _handler?: ActionHandler;

  _address?: AddrPort;

  readonly nodeHandler = (nodeReq: IncomingMessage, nodeRes: ServerResponse) => {
    if (!this._handler) {
      nodeRes.statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
      nodeRes.end("No Handler");
      return;
    }
    let url: URL;
    try {
      const host = nodeReq.headers.host ?? "localhost";
      url = new URL(`http://${host}${nodeReq.url!}`);
    } catch (e) {
      url = new URL("http://localhost");
    }

    const req: HttpRequest = DefaultHttpRequest({
      Header: HttpHeader.from(nodeReq.headers),
      URL: HttpURL.parse(url).unwrap(),
      Method: nodeReq.method ?? "GET",
      Body: new ReadableStream<Uint8Array>({
        start(controller) {
          nodeReq.on("error", (err: Error) => {
            controller.error(err);
          });
          nodeReq.on("data", (chunk: Buffer) => {
            controller.enqueue(chunk.valueOf());
          });
          nodeReq.on("end", () => {
            controller.close();
          });
        },
      }),
    });

    const res = new NodeResponseWriter(nodeRes);
    this._handler.ServeHTTP(res, req);
  };

  readonly _listenAddr: AddrPort;
  _srv?: ReturnType<typeof createServer>;

  constructor(listen: AddrPort) {
    this._listenAddr = listen;
  }

  GetListenAddr(): AddrPort | undefined {
    return this._address;
  }

  SetHandler(h: ActionHandler) {
    this._handler = h;
  }
  ListenAndServe(): Promise<void> {
    this._srv = createServer(this.nodeHandler);
    return new Promise((resolve, reject) => {
      this._srv?.listen;
      const ret = this._srv?.listen(this._listenAddr.Port, this._listenAddr.Addr, () => {
        const addr = this._srv?.address();
        if (typeof addr === "string") {
          this._address = {
            Addr: addr,
            Port: this._listenAddr.Port,
          };
        }
        if (addr && typeof addr === "object") {
          this._address = {
            Addr: addr.address,
            Port: addr.port,
          };
        }
        resolve();
      });
      if (ret instanceof Error) {
        reject(ret);
      }
    });
  }
  Shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._srv?.close((err?: Error) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
