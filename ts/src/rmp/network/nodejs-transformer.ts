import { IncomingMessage, ServerResponse } from "node:http";
import { fromNodeJS } from "./nodejs-headers";
import { EdgeHandler } from "../pony-types";
import { HttpHeader } from "../../types";

function toRequest(req: IncomingMessage): Request {
  let body: ReadableStream<Uint8Array> | undefined = undefined;
  if (!["GET", "HEAD"].includes(req.method || "")) {
    body = new ReadableStream<Uint8Array>({
      start(controller) {
        req.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        req.on("close", () => {
          controller.close();
        });
        req.on("error", (e) => {
          controller.error(e);
        });
      },
    });
  }
  let reqUrl = req.url;
  try {
    const loc = new URL(req.url || "", "http://localhost");
    reqUrl = loc.toString();
  } catch (e) {
    throw new Error(`Invalid URL: ${req.url}`);
  }

  const duplex: { duplex?: string } = {};

  if (body) {
    duplex.duplex = "half";
  }

  return new Request(reqUrl, {
    headers: fromNodeJS(req.headers),
    method: req.method || "GET",
    body: body,
    ...duplex,
  });
}

function stream2NodeResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  nodeRes: ServerResponse,
  doneFn: (err: Error | undefined) => void
) {
  reader
    .read()
    .then(({ done, value }) => {
      if (done) {
        doneFn(undefined);
        return;
      }
      if (value) {
        nodeRes.write(value);
      }
      stream2NodeResponse(reader, nodeRes, doneFn);
    })
    .catch(doneFn);
}

function sendResponse(nodeRes: ServerResponse, pRes: Promise<Response>) {
  pRes.then((res) => {
    nodeRes.statusCode = res.status || 200;
    nodeRes.statusMessage = res.statusText || "OK";
    if (res.headers) {
      for (const [key, value] of HttpHeader.from(res.headers).AsHeaders().entries()) {
        nodeRes.setHeader(key, value);
      }
    }
    if (!res.body) {
      nodeRes.end();
    } else if (typeof res.body === "string") {
      nodeRes.write(res.body);
      nodeRes.end();
    } else if (res.body.constructor === Uint8Array) {
      nodeRes.write(res.body);
      nodeRes.end();
    } else if (typeof (res.body as ReadableStream<Uint8Array>).getReader === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return new Promise<void>((_resolve, _reject) => {
        stream2NodeResponse((res.body as ReadableStream<Uint8Array>).getReader(), nodeRes, (err) => {
          if (err) {
            nodeRes.destroy(err);
          }
          nodeRes.end();
        });
      });
    }
  });
}

export function nodejsTransform(eh: EdgeHandler): (req: IncomingMessage, res: ServerResponse) => void {
  return (nodeReq: IncomingMessage, nodeRes: ServerResponse) => {
    sendResponse(
      nodeRes,
      eh.fetch(
        toRequest(nodeReq),
        {},
        {
          nodejs: {
            request: nodeReq,
            response: nodeRes,
          },
        }
      )
    );
  };
}
