"use strict";
(() => {
  // ../../types/http_header.ts
  var HttpHeader = class _HttpHeader {
    constructor() {
      this._headers = /* @__PURE__ */ new Map();
    }
    static from(headers) {
      const h = new _HttpHeader();
      if (headers) {
        for (const k in headers) {
          const v = headers[k];
          if (v) {
            h.Add(k, v);
          }
        }
      }
      return h;
    }
    static fromHeaders(header) {
      const h = new _HttpHeader();
      header.forEach((v, k) => {
        h.Add(k, v);
      });
      return h;
    }
    _key(key) {
      return key.toLowerCase();
    }
    Values(key) {
      const values = this._headers.get(this._key(key));
      return values || [];
    }
    Get(key) {
      const values = this._headers.get(this._key(key));
      if (values === void 0 || values.length === 0) {
        return void 0;
      }
      return values[0];
    }
    Set(key, value) {
      this._headers.set(this._key(key), [value]);
    }
    Add(key, value) {
      const vs = Array.isArray(value) ? value : [value];
      const values = this._headers.get(this._key(key));
      if (values === void 0) {
        this._headers.set(this._key(key), vs);
      } else {
        values.push(...vs);
      }
    }
    Del(ey) {
      this._headers.delete(this._key(ey));
    }
    Items() {
      return Array.from(this._headers).filter(([_, vs]) => vs.length > 0);
    }
    Clone() {
      const clone = new _HttpHeader();
      for (const [key, values] of this._headers.entries()) {
        clone._headers.set(key, values.slice());
      }
      return clone;
    }
    AsObject() {
      const obj = {};
      for (const [key, values] of this._headers.entries()) {
        obj[key] = [...values];
      }
      return obj;
    }
    AsHeaderInit() {
      const obj = {};
      for (const [key, values] of this._headers.entries()) {
        obj[key] = values[0];
      }
      return obj;
    }
    Merge(other) {
      const ret = this.Clone();
      if (other) {
        for (const [key, values] of other.Items()) {
          ret.Add(key, values);
        }
      }
      return ret;
    }
  };

  // ../../types/result.ts
  var ResultOK = class {
    constructor(t) {
      this.t = t;
    }
    is_ok() {
      return true;
    }
    is_err() {
      return false;
    }
    unwrap_err() {
      throw new Error("Result is Ok");
    }
    unwrap() {
      return this.t;
    }
  };
  var ResultError = class {
    constructor(t) {
      this.t = t;
    }
    is_ok() {
      return false;
    }
    is_err() {
      return true;
    }
    unwrap() {
      throw new Error("Result is Err");
    }
    unwrap_err() {
      return this.t;
    }
  };
  var Result = class {
    static Ok(t) {
      return new ResultOK(t);
    }
    static Err(t) {
      return new ResultError(t);
    }
  };

  // ../../types/http_request.ts
  var HttpURL = class _HttpURL {
    constructor(url) {
      this._url = url;
    }
    static join(...parts) {
      return parts.join("/").replace(/\/+/g, "/");
    }
    static parse(url) {
      try {
        if (url instanceof _HttpURL) {
          return Result.Ok(url);
        }
        if (url instanceof URL) {
          return Result.Ok(new _HttpURL(url));
        }
        const my = new URL(url);
        return Result.Ok(new _HttpURL(my));
      } catch (e) {
        return Result.Err(e);
      }
    }
    Query() {
      return this._url.searchParams;
    }
    get Scheme() {
      return this._url.protocol;
    }
    get Host() {
      return this._url.host;
    }
    get Path() {
      return this._url.pathname;
    }
    String() {
      return this._url.toString();
    }
  };
  function DefaultHttpRequest(hp) {
    return {
      Header: hp.Header || new HttpHeader(),
      URL: HttpURL.parse(hp.URL).unwrap(),
      Method: "GET",
      Body: hp.Body,
    };
  }

  // ../fetch.ts
  var FetchResponseWriter = class {
    constructor() {
      this._header = new HttpHeader();
      this._resInit = {};
      this._ended = false;
      this._first = true;
      this._responseResolve = () => {};
      this.response = new Promise((resolve) => {
        this._responseResolve = resolve;
      });
      this._rstream = new ReadableStream({
        start: (controller) => {
          this._rstreamController = controller;
        },
      });
    }
    Header() {
      return this._header;
    }
    async Write(b) {
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
    WriteHeader(statusCode) {
      this._resInit.status = statusCode;
    }
    async End() {
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
  };
  var FetchHttpServer = class {
    constructor() {
      this.fetchHandler = (fetchReq) => {
        const fetchResInit = {};
        if (!this._handler) {
          fetchResInit.status = 500 /* INTERNAL_SERVER_ERROR */;
          return Promise.resolve(new Response("No Handler", fetchResInit));
        }
        let url;
        try {
          url = new URL(fetchReq.url);
        } catch (e) {
          url = new URL("http://localhost");
        }
        const req = DefaultHttpRequest({
          Header: HttpHeader.fromHeaders(fetchReq.headers),
          URL: HttpURL.parse(url).unwrap(),
          Method: fetchReq.method ?? "GET",
          Body: fetchReq.body ?? void 0,
        });
        const res = new FetchResponseWriter();
        this._handler?.ServeHTTP(res, req);
        return res.response;
      };
    }
    SetHandler(h) {
      this._handler = h;
    }
    ListenAndServe() {
      return Promise.resolve();
    }
    Shutdown() {
      return Promise.resolve();
    }
  };

  // ../../types/http_handler.ts
  var textEncoder = new TextEncoder();
  var HTTPHandler = class {
    constructor(hp) {
      this._handlerMap = /* @__PURE__ */ new Map();
      this._params = hp;
      this._params.HttpServer.SetHandler({
        ServeHTTP: async (w, r) => {
          try {
            const fn = this._handlerMap.get(r.URL.Path);
            if (fn) {
              await fn(w, r);
              await w.End();
              return Promise.resolve();
            }
            w.WriteHeader(404);
            await w.Write(textEncoder.encode("Not found"));
            return Promise.resolve();
          } catch (err) {
            return Promise.reject(err);
          }
        },
      });
    }
    Start() {
      return this._params.HttpServer.ListenAndServe();
    }
    Stop() {
      return this._params.HttpServer.Shutdown();
    }
    RegisterHandler(path, fn) {
      if (this._handlerMap.has(path)) {
        return Result.Err(new Error(`Handler already registered, path: ${path}`));
      }
      this._handlerMap.set(path, fn);
      return Result.Ok(() => {
        this._handlerMap.delete(path);
      });
    }
  };

  // ../../utils/stream2string.ts
  var decoder = new TextDecoder();
  async function stream2string(stream) {
    if (!stream) {
      return Promise.resolve("");
    }
    const reader = stream.getReader();
    let res = "";
    while (1) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const block = decoder.decode(value, { stream: true });
        res += block;
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.resolve(res);
  }

  // ../test-server.ts
  function setupTestServer(hs) {
    const hp = new HTTPHandler({
      HttpServer: hs,
    });
    hp.RegisterHandler("/", async (w, r) => {
      w.WriteHeader(200);
      w.Header().Set("X-Test", "close");
      const query = {};
      for (const [key, value] of r.URL.Query().entries()) {
        const vs = [value];
        if (!query[key]) {
          query[key] = [];
        }
        query[key].push(...vs);
      }
      const out = new TextEncoder().encode(
        JSON.stringify({
          url: r.URL.String(),
          query,
          header: r.Header.AsObject(),
          body: await stream2string(r.Body),
        })
      );
      for (let i = 0; i < 1; i++) {
        await w.Write(out);
      }
      return Promise.resolve();
    });
    return hp;
  }

  // esbuild_serve:http-import:https://deno.land/std@0.184.0/async/delay.ts
  function delay(ms, options = {}) {
    const { signal, persistent } = options;
    if (signal?.aborted) {
      return Promise.reject(new DOMException("Delay was aborted.", "AbortError"));
    }
    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(i);
        reject(new DOMException("Delay was aborted.", "AbortError"));
      };
      const done = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const i = setTimeout(done, ms);
      signal?.addEventListener("abort", abort, { once: true });
      if (persistent === false) {
        try {
          Deno.unrefTimer(i);
        } catch (error) {
          if (!(error instanceof ReferenceError)) {
            throw error;
          }
          console.error("`persistent` option is only available in Deno");
        }
      }
    });
  }

  // esbuild_serve:http-import:https://deno.land/std@0.184.0/http/server.ts
  var ERROR_SERVER_CLOSED = "Server closed";
  var HTTP_PORT = 80;
  var HTTPS_PORT = 443;
  var INITIAL_ACCEPT_BACKOFF_DELAY = 5;
  var MAX_ACCEPT_BACKOFF_DELAY = 1e3;
  var Server = class {
    #port;
    #host;
    #handler;
    #closed = false;
    #listeners = /* @__PURE__ */ new Set();
    #acceptBackoffDelayAbortController = new AbortController();
    #httpConnections = /* @__PURE__ */ new Set();
    #onError;
    /**
     * Constructs a new HTTP Server instance.
     *
     * ```ts
     * import { Server } from "https://deno.land/std@$STD_VERSION/http/server.ts";
     *
     * const port = 4505;
     * const handler = (request: Request) => {
     *   const body = `Your user-agent is:\n\n${request.headers.get(
     *    "user-agent",
     *   ) ?? "Unknown"}`;
     *
     *   return new Response(body, { status: 200 });
     * };
     *
     * const server = new Server({ port, handler });
     * ```
     *
     * @param serverInit Options for running an HTTP server.
     */
    constructor(serverInit) {
      this.#port = serverInit.port;
      this.#host = serverInit.hostname;
      this.#handler = serverInit.handler;
      this.#onError =
        serverInit.onError ??
        function (error) {
          console.error(error);
          return new Response("Internal Server Error", { status: 500 });
        };
    }
    /**
     * Accept incoming connections on the given listener, and handle requests on
     * these connections with the given handler.
     *
     * HTTP/2 support is only enabled if the provided Deno.Listener returns TLS
     * connections and was configured with "h2" in the ALPN protocols.
     *
     * Throws a server closed error if called after the server has been closed.
     *
     * Will always close the created listener.
     *
     * ```ts
     * import { Server } from "https://deno.land/std@$STD_VERSION/http/server.ts";
     *
     * const handler = (request: Request) => {
     *   const body = `Your user-agent is:\n\n${request.headers.get(
     *    "user-agent",
     *   ) ?? "Unknown"}`;
     *
     *   return new Response(body, { status: 200 });
     * };
     *
     * const server = new Server({ handler });
     * const listener = Deno.listen({ port: 4505 });
     *
     * console.log("server listening on http://localhost:4505");
     *
     * await server.serve(listener);
     * ```
     *
     * @param listener The listener to accept connections from.
     */
    async serve(listener) {
      if (this.#closed) {
        throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
      }
      this.#trackListener(listener);
      try {
        return await this.#accept(listener);
      } finally {
        this.#untrackListener(listener);
        try {
          listener.close();
        } catch {}
      }
    }
    /**
     * Create a listener on the server, accept incoming connections, and handle
     * requests on these connections with the given handler.
     *
     * If the server was constructed without a specified port, 80 is used.
     *
     * If the server was constructed with the hostname omitted from the options, the
     * non-routable meta-address `0.0.0.0` is used.
     *
     * Throws a server closed error if the server has been closed.
     *
     * ```ts
     * import { Server } from "https://deno.land/std@$STD_VERSION/http/server.ts";
     *
     * const port = 4505;
     * const handler = (request: Request) => {
     *   const body = `Your user-agent is:\n\n${request.headers.get(
     *    "user-agent",
     *   ) ?? "Unknown"}`;
     *
     *   return new Response(body, { status: 200 });
     * };
     *
     * const server = new Server({ port, handler });
     *
     * console.log("server listening on http://localhost:4505");
     *
     * await server.listenAndServe();
     * ```
     */
    async listenAndServe() {
      if (this.#closed) {
        throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
      }
      const listener = Deno.listen({
        port: this.#port ?? HTTP_PORT,
        hostname: this.#host ?? "0.0.0.0",
        transport: "tcp",
      });
      return await this.serve(listener);
    }
    /**
     * Create a listener on the server, accept incoming connections, upgrade them
     * to TLS, and handle requests on these connections with the given handler.
     *
     * If the server was constructed without a specified port, 443 is used.
     *
     * If the server was constructed with the hostname omitted from the options, the
     * non-routable meta-address `0.0.0.0` is used.
     *
     * Throws a server closed error if the server has been closed.
     *
     * ```ts
     * import { Server } from "https://deno.land/std@$STD_VERSION/http/server.ts";
     *
     * const port = 4505;
     * const handler = (request: Request) => {
     *   const body = `Your user-agent is:\n\n${request.headers.get(
     *    "user-agent",
     *   ) ?? "Unknown"}`;
     *
     *   return new Response(body, { status: 200 });
     * };
     *
     * const server = new Server({ port, handler });
     *
     * const certFile = "/path/to/certFile.crt";
     * const keyFile = "/path/to/keyFile.key";
     *
     * console.log("server listening on https://localhost:4505");
     *
     * await server.listenAndServeTls(certFile, keyFile);
     * ```
     *
     * @param certFile The path to the file containing the TLS certificate.
     * @param keyFile The path to the file containing the TLS private key.
     */
    async listenAndServeTls(certFile, keyFile) {
      if (this.#closed) {
        throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
      }
      const listener = Deno.listenTls({
        port: this.#port ?? HTTPS_PORT,
        hostname: this.#host ?? "0.0.0.0",
        certFile,
        keyFile,
        transport: "tcp",
        // ALPN protocol support not yet stable.
        // alpnProtocols: ["h2", "http/1.1"],
      });
      return await this.serve(listener);
    }
    /**
     * Immediately close the server listeners and associated HTTP connections.
     *
     * Throws a server closed error if called after the server has been closed.
     */
    close() {
      if (this.#closed) {
        throw new Deno.errors.Http(ERROR_SERVER_CLOSED);
      }
      this.#closed = true;
      for (const listener of this.#listeners) {
        try {
          listener.close();
        } catch {}
      }
      this.#listeners.clear();
      this.#acceptBackoffDelayAbortController.abort();
      for (const httpConn of this.#httpConnections) {
        this.#closeHttpConn(httpConn);
      }
      this.#httpConnections.clear();
    }
    /** Get whether the server is closed. */
    get closed() {
      return this.#closed;
    }
    /** Get the list of network addresses the server is listening on. */
    get addrs() {
      return Array.from(this.#listeners).map((listener) => listener.addr);
    }
    /**
     * Responds to an HTTP request.
     *
     * @param requestEvent The HTTP request to respond to.
     * @param connInfo Information about the underlying connection.
     */
    async #respond(requestEvent, connInfo) {
      let response;
      try {
        response = await this.#handler(requestEvent.request, connInfo);
        if (response.bodyUsed && response.body !== null) {
          throw new TypeError("Response body already consumed.");
        }
      } catch (error) {
        response = await this.#onError(error);
      }
      try {
        await requestEvent.respondWith(response);
      } catch {}
    }
    /**
     * Serves all HTTP requests on a single connection.
     *
     * @param httpConn The HTTP connection to yield requests from.
     * @param connInfo Information about the underlying connection.
     */
    async #serveHttp(httpConn, connInfo) {
      while (!this.#closed) {
        let requestEvent;
        try {
          requestEvent = await httpConn.nextRequest();
        } catch {
          break;
        }
        if (requestEvent === null) {
          break;
        }
        this.#respond(requestEvent, connInfo);
      }
      this.#closeHttpConn(httpConn);
    }
    /**
     * Accepts all connections on a single network listener.
     *
     * @param listener The listener to accept connections from.
     */
    async #accept(listener) {
      let acceptBackoffDelay;
      while (!this.#closed) {
        let conn;
        try {
          conn = await listener.accept();
        } catch (error) {
          if (
            // The listener is closed.
            error instanceof Deno.errors.BadResource || // TLS handshake errors.
            error instanceof Deno.errors.InvalidData ||
            error instanceof Deno.errors.UnexpectedEof ||
            error instanceof Deno.errors.ConnectionReset ||
            error instanceof Deno.errors.NotConnected
          ) {
            if (!acceptBackoffDelay) {
              acceptBackoffDelay = INITIAL_ACCEPT_BACKOFF_DELAY;
            } else {
              acceptBackoffDelay *= 2;
            }
            if (acceptBackoffDelay >= MAX_ACCEPT_BACKOFF_DELAY) {
              acceptBackoffDelay = MAX_ACCEPT_BACKOFF_DELAY;
            }
            try {
              await delay(acceptBackoffDelay, {
                signal: this.#acceptBackoffDelayAbortController.signal,
              });
            } catch (err) {
              if (!(err instanceof DOMException && err.name === "AbortError")) {
                throw err;
              }
            }
            continue;
          }
          throw error;
        }
        acceptBackoffDelay = void 0;
        let httpConn;
        try {
          httpConn = Deno.serveHttp(conn);
        } catch {
          continue;
        }
        this.#trackHttpConnection(httpConn);
        const connInfo = {
          localAddr: conn.localAddr,
          remoteAddr: conn.remoteAddr,
        };
        this.#serveHttp(httpConn, connInfo);
      }
    }
    /**
     * Untracks and closes an HTTP connection.
     *
     * @param httpConn The HTTP connection to close.
     */
    #closeHttpConn(httpConn) {
      this.#untrackHttpConnection(httpConn);
      try {
        httpConn.close();
      } catch {}
    }
    /**
     * Adds the listener to the internal tracking list.
     *
     * @param listener Listener to track.
     */
    #trackListener(listener) {
      this.#listeners.add(listener);
    }
    /**
     * Removes the listener from the internal tracking list.
     *
     * @param listener Listener to untrack.
     */
    #untrackListener(listener) {
      this.#listeners.delete(listener);
    }
    /**
     * Adds the HTTP connection to the internal tracking list.
     *
     * @param httpConn HTTP connection to track.
     */
    #trackHttpConnection(httpConn) {
      this.#httpConnections.add(httpConn);
    }
    /**
     * Removes the HTTP connection from the internal tracking list.
     *
     * @param httpConn HTTP connection to untrack.
     */
    #untrackHttpConnection(httpConn) {
      this.#httpConnections.delete(httpConn);
    }
  };
  function hostnameForDisplay(hostname) {
    return hostname === "0.0.0.0" ? "localhost" : hostname;
  }
  async function serve(handler, options = {}) {
    let port = options.port ?? 8e3;
    const hostname = options.hostname ?? "0.0.0.0";
    const server = new Server({
      port,
      hostname,
      handler,
      onError: options.onError,
    });
    options?.signal?.addEventListener("abort", () => server.close(), {
      once: true,
    });
    const s = server.listenAndServe();
    port = server.addrs[0].port;
    if ("onListen" in options) {
      options.onListen?.({ port, hostname });
    } else {
      console.log(`Listening on http://${hostnameForDisplay(hostname)}:${port}/`);
    }
    return await s;
  }

  // main.ts
  (async () => {
    const httpServer = new FetchHttpServer();
    setupTestServer(httpServer);
    serve(httpServer.fetchHandler, { port: 8087 });
  })();
})();
