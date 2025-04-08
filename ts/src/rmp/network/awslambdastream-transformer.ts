import { EdgeHandler } from "../pony-types.js";
import { Context } from "aws-lambda";
import { base64DecToArr } from "../utils.js";
import { HttpHeader, HttpURL } from "../../types/index.js";

interface AWSStreamReadable {
  write(o: string | Uint8Array | null): void;
  end(): void;
  finished(): Promise<void>;
  headers: Headers;
  url: string;
  method: string;
  path: string;
  body: string;
  Payload?: string;
  // on(m: 'data', (chunk: Uint8Array) => void): void;
  // on(m: 'end', () => void): void;
}

interface AWSStreamWriteable {
  write(o: string | Uint8Array | null): void;
  end(): void;
  finished(): Promise<void>;
  path: string;
  body: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  headers: Headers;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
declare class awslambda {
  static streamifyResponse(fn: (reqS: AWSStreamReadable, resS: AWSStreamWriteable, ctx: Context) => unknown): unknown;
}

// class LambdaStreamController implements ReadableStreamController<Uint8Array> {
//     readonly desiredSize = null;
//     readonly decoder = new TextDecoder();
//     constructor(private responseStream: AWSStreamReadable) {}
//     close(): void {
//       this.responseStream.end();
//     }
//     enqueue(chunk?: Uint8Array | undefined): void {
//       if (chunk) {
//         this.responseStream.write(this.decoder.decode(chunk));
//       }
//     }
//     error(e?: any): void {
//       // risk of stack overflow
//       console.error(e);
//     }
//   }

const txtDecoder = new TextDecoder();
const txtEncoder = new TextEncoder();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toRequest(req: AWSStreamReadable, ctx: Context): Request {
  const body: { body?: ReadableStream<Uint8Array> | undefined } = {};
  if (req.Payload) {
    req = JSON.parse(txtDecoder.decode(base64DecToArr(req.Payload))) as AWSStreamReadable;
    // console.log("toRequest-payload2req", req, Object.keys(req));
  }
  if (!["GET", "HEAD"].includes(req.method || "")) {
    body.body = new ReadableStream<Uint8Array>({
      start(controller): void {
        // eslint-disable-next-line no-console
        console.log("toRequest-start", req, Object.keys(req));
        controller.enqueue(txtEncoder.encode(req.body));
        controller.close();
        // req.on("data", (chunk) => {
        //   controller.enqueue(chunk);
        // });
        // req.on("close", () => {
        //   controller.close();
        // });
      },
    });
  }
  let reqUrl = req.path;
  const loc = HttpURL.parse(req.url || "", "http://localhost");
  if (loc.is_err()) {
    throw new Error(`Invalid URL: ${req.url}`);
  }
  reqUrl = loc.unwrap().String();
  req.headers = HttpHeader.from({}).AsHeaders();

  return new Request(reqUrl, {
    headers: HttpHeader.from(req.headers).AsHeaders(),
    method: req.method || "GET",
    ...body,
  });
}

function stream2AWSLambdaStreamResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  awslRes: AWSStreamReadable,
  doneFn: (err: Error | undefined) => void,
): void {
  // console.log("stream2AWSLambdaStreamResponse-enter");
  reader
    .read()
    .then(({ done, value }) => {
      // console.log("stream2AWSLambdaStreamResponse", done, value);
      if (done) {
        doneFn(undefined);
        return;
      }
      if (value) {
        // console.log("stream2AWSLambdaStreamResponse-1", value.length);
        awslRes.write(value);
        // console.log("stream2AWSLambdaStreamResponse-2", value.length);
      }
      stream2AWSLambdaStreamResponse(reader, awslRes, doneFn);
    })
    .catch((err) => {
      // console.log("stream2AWSLambdaStreamResponse-error", err);
      doneFn(err as Error);
    });
}

function sendResponse(awslRes: AWSStreamReadable, pRes: Promise<Response>): Promise<void> {
  return new Promise((resolve, reject) => {
    void pRes.then((res) => {
      // const out = {
      //   statusCode: res.status || 200,
      //   statusMessage: res.statusText || "OK",
      //   headers: toHeadersStringString(res.headers),
      // };

      if (!res.body) {
        // console.log("sendResponse-empty", res);
        awslRes.write("");
        awslRes.end();
        awslRes
          .finished()
          .then(() => resolve())
          .catch(reject);
      } else if (typeof res.body === "string") {
        // console.log("sendResponse-string", res);
        awslRes.write(res.body);
        awslRes.end();
        awslRes
          .finished()
          .then(() => resolve())
          .catch(reject);
      } else if (res.body.constructor === Uint8Array) {
        // console.log("sendResponse-uint", res);
        awslRes.write(txtDecoder.decode(res.body));
        awslRes.end();
        awslRes
          .finished()
          .then(() => resolve())
          .catch(reject);
      } else if (typeof res.body.getReader === "function") {
        // console.log("sendResponse-stream", res);
        stream2AWSLambdaStreamResponse(res.body.getReader(), awslRes, (err) => {
          // console.log("sendResponse-stream-done-started", err);
          if (err) {
            // awslRes.destroy(err);
          }
          awslRes.end();
          // eslint-disable-next-line no-console
          console.log("sendResponse-stream-done-post-end", err);
          awslRes
            .finished()
            .then(() => {
              // eslint-disable-next-line no-console
              console.log("sendResponse-stream-done-resolved");
              resolve();
            })
            .catch(reject);
        });
      }
    });
  });
}

/* never remove this comment */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
/*global awslambda*/

export function awslambdastreamTransform(eh: EdgeHandler): unknown {
  return awslambda.streamifyResponse((reqS: AWSStreamReadable, resS: AWSStreamWriteable, ctx: Context) => {
    return sendResponse(
      resS,
      eh.fetch(
        toRequest(reqS, ctx),
        {},
        {
          lambda: ctx,
        },
      ),
    );
  });
}
