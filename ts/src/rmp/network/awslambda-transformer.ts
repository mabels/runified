// import { Request, Response, ReadableStream, Headers } from "@edge-runtime/ponyfill";
import { Context } from "aws-lambda";
// import { HttpRequest, HttpResponse } from "aws-sdk";
import { EdgeHandler } from "../pony-types";
import { base64EncArr } from "../utils";
import { HttpResponse, HttpRequest } from "@aws-sdk/protocol-http";
import { HttpHeader } from "../../types";

const txtEncoder = new TextEncoder();
const txtDecoder = new TextDecoder();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toRequest(req: HttpRequest, ctx: Context): Request {
  const body: { body?: ReadableStream<Uint8Array> } = {};
  if (!["GET", "HEAD"].includes(req.method || "")) {
    body.body = new ReadableStream<Uint8Array>({
      start(controller) {
        if (typeof req.body === "string") {
          controller.enqueue(txtEncoder.encode(req.body));
        } else if (req.body instanceof Uint8Array) {
          controller.enqueue(req.body);
        } else {
          throw new Error("Unsupported body type");
        }
        controller.close();
      },
    });
  }
  let reqUrl = req.path;
  try {
    const loc = new URL(req.path || "", "http://localhost");
    reqUrl = loc.toString();
  } catch (e) {
    throw new Error(`Invalid URL: ${req.path}`);
  }

  console.log("bla:", req.method, body);

  return new Request(reqUrl, {
    headers: HttpHeader.from(req.headers).AsHeaderInit(),
    method: req.method || "GET",
    ...body,
  });
}

function stream2AWSLambdaResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  out: Uint8Array[],
  doneFn: (err: Error | undefined) => void,
) {
  reader
    .read()
    .then(({ done, value }) => {
      if (done) {
        doneFn(undefined);
        return;
      }
      if (value) {
        out.push(value);
      }
      stream2AWSLambdaResponse(reader, out, doneFn);
    })
    .catch(doneFn);
}

function sendResponse(pRes: Promise<Response>): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    pRes.then((res) => {
      const resp = new HttpResponse({
        statusCode: res.status,
      });
      resp.headers = HttpHeader.from(res.headers).AsRecordStringString();
      resp.statusCode = res.status;
      // resp = res.statusText;

      if (!res.body) {
        resp.body = "";
        resolve(resp);
      } else if (typeof res.body === "string") {
        resp.body = res.body;
        resolve(resp);
      } else if (res.body.constructor === Uint8Array) {
        resp.body = txtDecoder.decode(res.body);
        resolve(resp);
      } else if (typeof (res.body as ReadableStream<Uint8Array>).getReader === "function") {
        const reader = res.body!.getReader();
        if (!reader) {
          reject(new Error("No body reader"));
          return;
        }
        const out: Uint8Array[] = [];
        stream2AWSLambdaResponse(reader, out, (err) => {
          console.log(`stream2AWSLambdaResponse done: ${err}`);
          if (err) {
            reject(err);
            return;
          }
          const all = new Uint8Array(out.reduce((acc, cur) => cur.length + acc, 0));
          let ofs = 0;
          for (const cur of out) {
            all.set(cur, ofs);
            ofs += cur.length;
          }
          resp.body = base64EncArr(all);
          resolve(resp);
        });
      }
    });
  });
}

/* never remove this comment */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
/*global awslambda*/

export function awslambdaTransform(eh: EdgeHandler) {
  return async (event: unknown, ctx: Context) => {
    return sendResponse(
      eh.fetch(
        toRequest(event as HttpRequest, ctx),
        {},
        {
          lambda: ctx,
        },
      ),
    );
  };
}
