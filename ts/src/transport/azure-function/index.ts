import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

import {
  ActionHandler,
  AddrPort,
  DefaultHttpRequest,
  HttpHeader,
  HttpResponseWriter,
  HttpServer,
  HttpStatusCode,
  HttpURL,
} from "../../types";
import { setupTestServer } from "../test-server";

async function* streamAsyncIterable(stream: ReadableStream<Uint8Array>): AsyncIterable<Uint8Array> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

class AzureResponseWriter implements HttpResponseWriter {
  readonly _header: HttpHeader = new HttpHeader();
  _statusCode: HttpStatusCode = HttpStatusCode.OK;
  _ended = false;
  _contronller?: ReadableStreamDefaultController<Uint8Array>;
  readonly _body = new ReadableStream<Uint8Array>({
    start: (controller) => {
      this._contronller = controller;
    },
  });

  Header(): HttpHeader {
    return this._header;
  }
  async Write(b: Uint8Array): Promise<number> {
    if (!b || b.length === 0) {
      await this.End();
      return Promise.resolve(0);
    }
    console.log("Write", b.length);
    this._contronller?.enqueue(b);
    return Promise.resolve(b.length);
  }
  WriteHeader(statusCode: HttpStatusCode) {
    this._statusCode = statusCode;
  }
  End(): Promise<void> {
    if (this._ended) {
      return Promise.resolve();
    }
    console.log("End");
    this._contronller?.close();
    this._ended = true;
    return Promise.resolve();
  }

  asResponse(): HttpResponseInit {
    return {
      status: this._statusCode,
      headers: this._header.AsRecordStringStringArray(),
      body: streamAsyncIterable(this._body),
    };
  }
}

export class AzureHttpServer implements HttpServer {
  _handler?: ActionHandler;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readonly AzureHandler = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (!this._handler) {
      return Promise.resolve({
        status: HttpStatusCode.INTERNAL_SERVER_ERROR,
        body: JSON.stringify({ error: "No Handler" }),
      });
    }

    const headers = HttpHeader.from(Array.from(request.headers.entries()));
    const method = request.method ?? "GET";
    console.log("AzureHandler", request.params);
    let url = HttpURL.parse(request.url ?? "http://localhost");
    if (url.is_err()) {
      url = HttpURL.parse("http://localhost");
    }

    return new Promise((resolve) => {
      const req = DefaultHttpRequest({
        Header: headers,
        URL: url.unwrap(),
        Method: method,
        Body: request.body as ReadableStream<Uint8Array>,
      });
      const res = new AzureResponseWriter();
      resolve(res.asResponse());
      this._handler
        ?.ServeHTTP(res, req)
        .then(() => {
          console.log("ServeHTTP done");
        })
        .catch((e) => {
          console.log("ServeHTTP error", e);
        });
    });
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

const azureHttpServer = new AzureHttpServer();
setupTestServer(azureHttpServer);

// host.json
/*
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.15.0, 4.0.0)"
  },
  "extensions": {
    "http": {
      "routePrefix": ""
    }
  }
}
*/
app.http("runified", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "{*restOfPath}",
  handler: azureHttpServer.AzureHandler,
});
