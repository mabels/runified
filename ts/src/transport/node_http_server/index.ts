import {
  ActionHandler,
  AddrPort,
  DefaultHttpRequest,
  HttpHeader,
  HttpRequest,
  HttpResponseWriter,
  HttpServer,
  HttpStatusCode,
  toHttpMethods,
} from "../../types/index.js";

import { createServer, IncomingMessage, ServerResponse } from "http";

import enableDestroy from "server-destroy";
import { HttpURL } from "../../types/http_url.js";

class NodeResponseWriter implements HttpResponseWriter {
  readonly _header: HttpHeader = new HttpHeader();

  _ended = false;
  _setHeader = false;

  constructor(private readonly _res: ServerResponse) {}

  Header(): HttpHeader {
    return this._header;
  }
  setHeader(): void {
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
  WriteHeader(statusCode: HttpStatusCode): void {
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

  readonly nodeHandler = (nodeReq: IncomingMessage, nodeRes: ServerResponse): void => {
    if (!this._handler) {
      nodeRes.statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
      nodeRes.end("No Handler");
      return;
    }
    const host = nodeReq.headers.host ?? "localhost";
    let url = HttpURL.parse(`http://${host}${nodeReq.url}`);
    if (url.is_err()) {
      url = HttpURL.parse("http://localhost");
    }

    const req: HttpRequest = DefaultHttpRequest({
      Header: HttpHeader.from(nodeReq.headers),
      URL: url.unwrap(),
      Method: toHttpMethods(nodeReq.method ?? "GET"),
      Body: new ReadableStream<Uint8Array>({
        start(controller): void {
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
    void this._handler.ServeHTTP(res, req);
  };

  readonly _listenAddr: AddrPort;
  _srv?: ReturnType<typeof createServer>;

  constructor(listen: AddrPort) {
    this._listenAddr = listen;
  }

  GetListenAddr(): AddrPort | undefined {
    return this._address;
  }

  SetHandler(h: ActionHandler): void {
    this._handler = h;
  }
  ListenAndServe(): Promise<void> {
    this._srv = createServer(this.nodeHandler);
    enableDestroy(this._srv);
    return new Promise(this._findPort());
  }

  _getPort(): number {
    if (this._listenAddr.Port <= 0) {
      return ~~(Math.random() * (65535 - 1024)) + 1024;
    }
    return this._listenAddr.Port;
  }
  _listen(resolve: () => void): void {
    this._srv?.listen(this._getPort(), this._listenAddr.Addr, () => {
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
  }

  _findPort() {
    return (resolve: () => void, reject: (e: unknown) => void): void => {
      this._srv?.on("error", (err: Error) => {
        if (this._listenAddr.Port <= 0 && err.message.includes("EADDRINUSE")) {
          // eslint-disable-next-line no-console
          console.warn("retry find listen");
          this._listen(resolve);
        } else {
          reject(err);
        }
        reject(err);
      });
      this._listen(resolve);
    };
  }
  Shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._srv?.destroy((err?: Error) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
