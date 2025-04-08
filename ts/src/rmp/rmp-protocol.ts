// import { processFetchWithController } from "./process-fetch.js";
import { ExecutionContext, Env, EdgeHandler } from "./pony-types.js";
import { FrameProcessor } from "./frame-processor.js";
import { EnvelopeHandler } from "./envelope-handler.js";
// import { Reader } from "ion-js";
import { quickId } from "./utils.js";
// import { fromHeadersInit } from "./network/abstract-headers.js";
// import userLevelStream from "./edge-handler/user-level-stream.js";
// import userLevelString from "./edge-handler/user-level-string.js";

export interface RMProtocolCtx {
  Request: Request;
  readonly cf?: {
    readonly env: Env;
    readonly ctx: ExecutionContext;
  };
  readonly rmp: {
    readonly FrameProcessor: FrameProcessor;
    readonly EnvelopeHandler: EnvelopeHandler;
  };
}

// const ht = new HttpTransaction({ EnvelopeHandler: eh });
//     eh.onEnvelope((envelope: Envelope) => {
//       return ht.match(envelope, { ...ctx, cf: { env, ctx }, Envelope: envelope }) ? MatchState.Matched : MatchState.NotMatched;
//     });
//     ht.onRequest((req: HttpRequestHeaderFrame, ctx: HttpTransactionCtx) => {
//       console.log("onRequest", req);
//       return MatchState.Matched;
//     });

// export type RMPHandler = EdgeHandler & {
//   id: string;
//   registerCtx?: (fp: FrameProcessor, eh: EnvelopeHandler) => void;
// };

export type RMPContextFn = (fp: FrameProcessor, eh: EnvelopeHandler) => void;

export class RMProtocol implements EdgeHandler {
  readonly id = quickId();
  readonly onConnectFns: RMPContextFn[] = [];
  readonly onCloseFns: RMPContextFn[] = [];

  onConnect(fn: RMPContextFn): void {
    this.onConnectFns.push(fn);
  }

  onClose(fn: RMPContextFn): void {
    this.onCloseFns.push(fn);
  }

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const tp = new TransformStream<Uint8Array, Uint8Array>();
    const fp = new FrameProcessor({
      inputStream: request.body ?? undefined,
      outputStream: tp.writable,
    });
    const eh = new EnvelopeHandler(fp);
    eh.onConnect((fp, eh) => {
      this.onConnectFns.forEach((fn) => fn(fp, eh));
    });
    eh.onClose((fp, eh) => {
      this.onCloseFns.forEach((fn) => fn(fp, eh));
    });
    // const cs = await fp.getStreamController();
    if (request.body) {
      void fp.match((frame) => {
        eh.match(frame.Payload, {
          ...ctx,
          cf: { env, ctx },
          Request: request,
          rmp: {
            FrameProcessor: fp,
            EnvelopeHandler: eh,
          },
        });
      });
    } else {
      throw new Error("request.body has to be a ReadableStream");
    }
    eh.fireConnect();
    return eh.response(tp.readable);
  }

  // async connect(url: string) {
  //   const fp = new FrameProcessor();
  //   const eh = new EnvelopeHandler(fp);
  //   console.log(`clientConnect:start`);
  //   eh.onEnvelope((envelope) => {
  //     console.log("envelope>", envelope.Payload.Type);
  //     return MatchState.Pass;
  //   });
  //   console.log(`clientConnect:start-1`);
  //   // const sc = await fp.getStreamController();
  //   console.log(`clientConnect:start-2 ${url}`);
  //   // setTimeout(() => {
  //   //   sc.controller.close()
  //   //  },1000);
  //   const res = await stream(
  //     url,
  //     {
  //       method: "CONNECT",
  //       // body: sc.stream,
  //     },
  //     (data: StreamFactoryData): Writable => {
  //       console.log(`clientConnect:start-33333 ${data}`);
  //       return {} as unknown as Writable;
  //     }
  //   );
  //   console.log(`clientConnect:start-3`, res);
  //   // if (res.body) {
  //   //   this.fp.match(res.body, (frame) => {
  //   //     this.eh.match(frame.Payload, {} as RMProtocolCtx);
  //   //   });
  //   // } else {
  //   //   throw new Error("response.body has to be a ReadableStream");
  //   // }
  //   console.log(`clientConnect:start-4`);
  //   return eh.response(sc.stream);
  // }
}
