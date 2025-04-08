import { IonTypes, Reader } from "ion-js";

import { Envelope, EnvelopeEncoder, ParamEnvelope, Payload } from "./envelope-processor.js";
import { RMPContextFn, RMProtocolCtx } from "./rmp-protocol.js";
import { FrameProcessor } from "./frame-processor.js";
import { ensureReader, readBlobTuple, readNumberTuple, readStringTuple, readTuple } from "./ion-utils.js";
import { OnMatchHandler, quickId } from "./utils.js";

export enum MatchState {
  // NotMatched = "NotMatched",
  Matched = "Matched",
  Abort = "Abort",
  Pass = "Pass",
}

export type EnvelopeCtx = RMProtocolCtx & { Ion: { Reader: Reader } };

export type MatchFN = (envelope: Envelope, ctx: EnvelopeCtx) => MatchState;

function readPayload(this: Reader): Payload {
  return ensureReader(this, (r) => {
    r.stepIn();
    const ret = {
      Type: readStringTuple(r, "Type"),
      Data: readBlobTuple(r, "Data"),
    };
    r.stepOut();
    return ret;
  });
}

function readPayloadTuple(reader: Reader, fieldName: string): Payload {
  return readTuple(reader, fieldName, readPayload);
}

function readVersionTuple(reader: Reader, fieldName: string): symbol {
  const vBytes = readTuple(reader, fieldName, reader.uInt8ArrayValue);
  if (vBytes.length !== 1) {
    throw Error("version must be a single byte");
  }
  return Symbol.for(String.fromCharCode(vBytes[0]));
}

// export type OnConnectFn = (eh: EnvelopeHandler) => void

export class EnvelopeHandler {
  readonly id = quickId();
  readonly frameProcessor: FrameProcessor;
  // readonly frameContext?: FetchHandlerCtx;
  readonly request?: Request;
  readonly matchFns = new OnMatchHandler<MatchFN>();
  readonly connectFns: RMPContextFn[] = [];
  readonly closeFns: RMPContextFn[] = [];
  readonly mySrc = quickId();

  resolveResultPromise?: (value: Response) => void;

  constructor(fp: FrameProcessor, request?: Request) {
    this.frameProcessor = fp;
    this.request = request;
    // this.frameContext = ctx;
  }

  async close() {
    return this.frameProcessor.close().finally(() => {
      this.closeFns.forEach((fn) => fn(this.frameProcessor, this));
    });
  }

  onConnect(fn: RMPContextFn): void {
    this.connectFns.push(fn);
  }

  onClose(fn: RMPContextFn): void {
    this.closeFns.push(fn);
  }

  fireConnect(): void {
    this.connectFns.forEach((fn) => fn(this.frameProcessor, this));
  }

  onEnvelope(fn: MatchFN) {
    return this.matchFns.add(fn);
  }

  match(bytesOrReader: Uint8Array | Reader, ctx: RMProtocolCtx): boolean {
    ensureReader(bytesOrReader, (reader) => {
      if (reader.next() !== IonTypes.STRUCT) {
        throw "no struct for envelope";
      }
      reader.stepIn();
      const env = {
        Version: readVersionTuple(reader, "Version"),
        Src: readStringTuple(reader, "Src"),
        Dst: readStringTuple(reader, "Dst"),
        Time: readNumberTuple(reader, "Time"),
        TTL: readNumberTuple(reader, "TTL"),
        Payload: readPayloadTuple(reader, "Payload"),
      };
      reader.stepOut();
      for (const fn of this.matchFns.handlers.values()) {
        switch (fn(env, { ...ctx, Ion: { Reader: reader } })) {
          case MatchState.Abort:
          case MatchState.Matched:
            return true;
          default:
        }
      }
    });
    return true;
  }

  // match(env: Envelope): boolean {
  //   for (let fn of this.matchFns) {
  //     switch (fn(env, this.frameContext)) {
  //       case MatchState.Abort:
  //       case MatchState.Matched:
  //         return true;
  //       default:
  //     }
  //   }
  //   return false;
  // }

  send(penv: ParamEnvelope): void {
    const env = new EnvelopeEncoder(
      {
        ...penv,
      },
      this.frameProcessor.sys,
    );
    this.frameProcessor.send(env.asIon());
  }

  response(stream: ReadableStream<Uint8Array>): Promise<Response> {
    // no special Header should be set here
    // console.log(`response: ${this.id}-1:${this.id}`);
    const ret = Promise.resolve(new Response(stream));
    // this.frameProcessor.disableQueue = false
    // console.log(`response: ${this.id}-2:${this.id}`);
    return ret;
  }
}
// function readVersionTuple(reader: Reader, arg1: string) {
//   throw new Error("Function not implemented.");
// }

// function readPayloadTuple(reader: Reader, arg1: string) {
//   throw new Error("Function not implemented.");
// }
