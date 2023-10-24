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
} from "../types";

class FetchResponseWriter implements HttpResponseWriter {
  readonly _header: HttpHeader = new HttpHeader();
  readonly _resInit: ResponseInit = {};
  readonly _rstream: ReadableStream<Uint8Array>;
  _rstreamController?: ReadableStreamDefaultController<Uint8Array>;

  _ended = false;
  _first = true;

  readonly response: Promise<Response>;
  _responseResolve: (value: Response) => void = () => {
    /*void */
  };

  constructor() {
    this.response = new Promise((resolve) => {
      this._responseResolve = resolve;
    });
    this._rstream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this._rstreamController = controller;
      },
    });
  }

  Header(): HttpHeader {
    return this._header;
  }
  async Write(b: Uint8Array): Promise<number> {
    if (!(b instanceof Uint8Array)) {
      throw new Error("FetchResponseWriter.Write: b is not Uint8Array");
    }
    if (this._first) {
      this._first = false;
      this._resInit.headers = this._header.AsHeaderInit();
      this._responseResolve(new Response(this._rstream, this._resInit));
    }

    if (!b || b.length === 0) {
      await this.End();
      return Promise.resolve(0);
    }
    this._rstreamController?.enqueue(b);
    return Promise.resolve(b.length);
  }
  WriteHeader(statusCode: HttpStatusCode) {
    this._resInit.status = statusCode;
  }
  async End(): Promise<void> {
    if (this._first) {
      this._first = false;
      this._resInit.headers = this._header.AsHeaderInit();
      this._responseResolve(new Response(this._rstream, this._resInit));
    }
    if (this._ended) {
      return Promise.resolve();
    }
    this._ended = true;
    await this._rstreamController?.close();
    return Promise.resolve();
  }
}

export class FetchHttpServer implements HttpServer {
  _handler?: ActionHandler;

  SetHandler(h: ActionHandler) {
    this._handler = h;
  }

  readonly fetchHandler = (fetchReq: Request): Promise<Response> => {
    const fetchResInit: ResponseInit = {};
    if (!this._handler) {
      fetchResInit.status = HttpStatusCode.INTERNAL_SERVER_ERROR;
      return Promise.resolve(new Response("No Handler", fetchResInit));
    }
    let  url = HttpURL.parse(fetchReq.url);
    if (url.is_err()) {
      url = HttpURL.parse("http://localhost");
    }
    const req: HttpRequest = DefaultHttpRequest({
      Header: HttpHeader.from(fetchReq.headers),
      URL: url.unwrap(),
      Method: fetchReq.method ?? "GET",
      Body: fetchReq.body ?? undefined,
    });
    const res = new FetchResponseWriter();
    this._handler?.ServeHTTP(res, req);
    return res.response;
  };

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
