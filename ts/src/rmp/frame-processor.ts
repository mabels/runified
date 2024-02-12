import { b64ToUint6, quickId, uint6ToB64 } from "./utils";
import { SimpleBuffer } from "./simple-buffer";
import { NodeSysAbstraction, SysAbstraction } from "@adviser/cement";

// export enum Format {
//   Binary,
//   Text,
//   Pretty
// }

export enum Waiter {
  Frame = 0,
  Payload = 4,
}

// export type BuilderFn = (writer: Writer) => Uint8Array;

// export interface Envelope {
//     readonly Src: string;
//     readonly Dst: string;
//     readonly Time: number;
//     readonly Payload: BuilderFn;
// }

export interface MacFrame {
  readonly Version: symbol;
  readonly Codec: VersionCodec;
  readonly Format: VersionFormat;
  readonly Length: number;
}

export interface Frame {
  readonly MacFrame: MacFrame;
  readonly Payload: Uint8Array;
}

export enum VersionCodec {
  "-" = "-".charCodeAt(0),
  "Z" = "Z".charCodeAt(0),
  "G" = "G".charCodeAt(0),
  "L" = "L".charCodeAt(0),
}

export enum VersionFormat {
  "I" = "I".charCodeAt(0), // Ion
  "J" = "J".charCodeAt(0), // Json
}

export interface Version {
  Version: "A";
  Codec: VersionCodec;
  Format: VersionFormat;
}

function buildVersion(v: Version, ret: Uint8Array) {
  let codec = VersionCodec["-"];
  if (v.Codec) {
    codec = v.Codec;
  }
  let format = VersionFormat.I;
  if (v.Format) {
    format = v.Format;
  }
  // const ret = new Uint8Array(3);
  ret[0] = "A".charCodeAt(0);
  ret[1] = codec;
  ret[2] = format;
  return ret;
}

function getCodec(c: number): VersionCodec {
  switch (c) {
    case VersionCodec["-"]:
      return VersionCodec["-"];
    case VersionCodec.G:
      return VersionCodec.G;
    case VersionCodec.L:
      return VersionCodec.L;
    case VersionCodec.Z:
      return VersionCodec.Z;
    default:
      throw Error("Unknown codec");
  }
}
function getFormat(f: number): VersionFormat {
  switch (f) {
    case VersionFormat.I:
      return VersionFormat.I;
    case VersionFormat.J:
      return VersionFormat.J;
    default:
      throw Error("Unknown codec");
  }
}

// interface StreamController {
//   readonly stream: ReadableStream<Uint8Array>;
//   readonly controller: ReadableStreamController<Uint8Array>;
// }

// async function NewStreamController(): Promise<StreamController> {
//   let stream: ReadableStream<Uint8Array>;
//   const controller = await new Promise<ReadableStreamController<Uint8Array>>((rs, rj) => {
//     stream = new ReadableStream<Uint8Array>({
//       start(controller) {
//         rs(controller);
//       },
//     });
//   });
//   return Promise.resolve({ stream: stream!, controller });
// }

export type ReceiveFrameFn = (frame: Frame) => void;

export interface FrameStatistcs {
  Frames: number;
  Bytes: number;
}
export interface FrameMetrics {
  readonly send: FrameStatistcs;
  readonly received: FrameStatistcs;
}

export interface FrameProcessorParams {
  readonly maxSendQueueBytes?: number;
  readonly inputStream?: ReadableStream<Uint8Array>;
  readonly outputStream?: WritableStream<Uint8Array>;
  readonly sys?: SysAbstraction;
}

interface readBlock<T> {
  block: ReadableStreamReadResult<Uint8Array>;
  macFrame?: MacFrame;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: Error) => void;
  readonly frameFn: (frame: Frame) => void | Promise<void>;
  readonly buffer: SimpleBuffer;
  expectSize: number;
  frameOrPayload: Waiter;
  readonly reader: ReadableStreamDefaultReader<Uint8Array>;
}

export class FrameProcessor {
  static readonly MacFrameSize = "A-B01234".length;
  // readonly macWriter: Writer = makeBinaryWriter();
  readonly fpId = quickId();
  readonly config: FrameProcessorParams;
  readonly writer?: WritableStreamDefaultWriter<Uint8Array>;
  readonly sys: SysAbstraction;

  constructor(fp?: FrameProcessorParams) {
    // console.log("FrameProcessor:constructor:", this.fpId);
    this.config = {
      maxSendQueueBytes: 1024 * 1024,
      ...fp,
    };
    this.sys = fp?.sys ?? NodeSysAbstraction();
    if (this.config.outputStream) {
      this.writer = this.config.outputStream.getWriter();
    }
  }

  static decode(buffer: SimpleBuffer): MacFrame {
    if (buffer.bufferLen < FrameProcessor.MacFrameSize) {
      throw new Error("MacFrame to Short");
    }
    const headerBytes = buffer.shift(FrameProcessor.MacFrameSize);
    const version = headerBytes[0];
    if (version != "A".charCodeAt(0)) {
      throw new Error("unknown version");
    }
    const codec = getCodec(headerBytes[1]);
    const format = getFormat(headerBytes[2]);
    const bit24 = b64ToUint6(headerBytes[3]);
    const bit18 = b64ToUint6(headerBytes[4]);
    const bit12 = b64ToUint6(headerBytes[5]);
    const bit6 = b64ToUint6(headerBytes[6]);
    const bit0 = b64ToUint6(headerBytes[7]);
    const length = (bit24 << 24) | (bit18 << 18) | (bit12 << 12) | (bit6 << 6) | bit0;
    return {
      Version: Symbol.for("A"),
      Codec: codec,
      Format: format,
      Length: length,
    };
  }

  static build(
    payloadFrame: Uint8Array,
    v: Version = { Version: "A", Codec: VersionCodec["-"], Format: VersionFormat.I },
  ): Uint8Array {
    /*
      three letter version code
      first:
        A = Version,
        Codec:
          - pass through
          Z = Zlib
          G = Gzip
          L = LZ4
        Format:
          B = Binary
          T = Text
    */
    const headerBytes = new Uint8Array(FrameProcessor.MacFrameSize + payloadFrame.length);
    buildVersion(v, headerBytes);
    // const bytesLength = new Uint8Array(32 / 8);
    headerBytes[3] = uint6ToB64((payloadFrame.length >> 24) & 0x3f);
    headerBytes[4] = uint6ToB64((payloadFrame.length >> 18) & 0x3f);
    headerBytes[5] = uint6ToB64((payloadFrame.length >> 12) & 0x3f);
    headerBytes[6] = uint6ToB64((payloadFrame.length >> 6) & 0x3f);
    headerBytes[7] = uint6ToB64((payloadFrame.length >> 0) & 0x3f);
    // if (headerBytes.length !== FrameProcessor.MacFrameSize) {
    //   throw new Error("Invalid macFrame length must be constant:" + headerBytes.length);
    // }
    // const out = new Uint8Array(headerBytes.length + payloadFrame.length);
    // out.set(headerBytes);
    headerBytes.set(payloadFrame, FrameProcessor.MacFrameSize);
    return headerBytes;
  }

  _read(r: readBlock<FrameMetrics>) {
    if (r.block.done) {
      r.resolve(this.metrics);
      return;
    }
    r.buffer.push(r.block.value);
    while (r.buffer.bufferLen >= r.expectSize) {
      switch (r.frameOrPayload) {
        case Waiter.Frame:
          r.macFrame = FrameProcessor.decode(r.buffer);
          r.frameOrPayload = Waiter.Payload;
          r.expectSize = r.macFrame.Length;
          break;
        case Waiter.Payload:
          {
            if (!r.macFrame) {
              r.reject(Error("No MacFrame"));
              return;
            }
            this.metrics.received.Frames++;
            this.metrics.received.Bytes += r.macFrame.Length;
            const promise = r.frameFn({
              MacFrame: r.macFrame,
              Payload: r.buffer.shift(r.macFrame.Length),
            });
            if (promise && typeof promise.then === "function") {
              promise
                .then(() => {})
                .catch((e) => {
                  console.error("FrameProcessor:match:catch:", e);
                });
            }
            r.frameOrPayload = Waiter.Frame;
            r.expectSize = FrameProcessor.MacFrameSize;
          }
          break;
        default:
          r.reject(new Error("unknown Waiter State"));
          return;
      }
    }
    r.reader
      .read()
      .then((block) => {
        r.block = block;
        this._read(r);
      })
      .catch(r.reject);
  }

  match(frameFn: (frame: Frame) => void | Promise<void>): Promise<FrameMetrics> {
    return new Promise((rs, rj) => {
      if (!this.config.inputStream) {
        return rj("No input stream");
      }
      const reader = this.config.inputStream!.getReader();
      // eslint-disable-next-line no-constant-condition
      // while (true) {
      reader
        .read()
        .then((block) => {
          this._read({
            reader,
            block,
            resolve: rs,
            reject: rj,
            frameFn,
            frameOrPayload: Waiter.Frame,
            expectSize: FrameProcessor.MacFrameSize,
            buffer: new SimpleBuffer(),
          });
        })
        .catch(rj);
    });
  }

  // toResolveStreamController: ((sc: StreamController) => void)[] = [];
  // awaitStreamController?: Promise<StreamController> = undefined;
  // gotStreamController?: StreamController = undefined;

  readonly metrics: FrameMetrics = {
    send: { Frames: 0, Bytes: 0 },
    received: { Frames: 0, Bytes: 0 },
  };

  readonly receiveFrameFns: ReceiveFrameFn[] = [];

  // only need from receiving
  async start(): Promise<FrameMetrics> {
    const rs = await this.match((frame) => {
      this.receiveFrameFns.forEach((rf) => rf(frame));
    });
    return rs;
  }

  // getStreamController(): Promise<StreamController> {
  //   // this should not wait for the stream controller to be resolved
  //   if (!this.awaitStreamController) {
  //     console.log("getStreamController:not", this.awaitStreamController);
  //     this.awaitStreamController = NewStreamController();
  //     return new Promise((rs, _rj) => {
  //       console.log("getStreamController:Awaiting");
  //       this.awaitStreamController!.then((sc) => {
  //         console.log("getStreamController:Got");
  //         rs(sc);
  //         this.gotStreamController = sc;
  //         const myResolves = this.toResolveStreamController;
  //         this.toResolveStreamController = [];
  //         myResolves.forEach((rsFn) => rsFn(this.gotStreamController!));
  //       });
  //     });
  //   } else {
  //     // console.log("getStreamController:have", this.awaitStreamController);
  //   }
  //   return new Promise((rs, _rj) => {
  //     if (this.gotStreamController) {
  //       // console.log("getStreamController:gotStreamController", this.awaitStreamController);
  //       rs(this.gotStreamController);
  //       return
  //     }
  //     console.log("getStreamController:queue", this.awaitStreamController);
  //     this.toResolveStreamController.push(rs);
  //   });
  // }

  readonly sendQueue: Uint8Array[] = [];
  sendQueueLength: number = 0;
  // // disableQueue = false
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  runQueue(empty = (err: Error | undefined, fp: FrameProcessor) => {}): void {
    // if (!sc) {
    //   // console.log(`runQueue:NoStreamController`);
    //   this.getStreamController().then((sc) => {
    //     this.runQueue(empty, sc);
    //   });
    //   return;
    // }
    if (this.sendQueue.length > 0) {
      const toSend = this.sendQueue.shift();
      // console.log(`runQueue:Sending:${this.sendQueue.length}:${toSend!.length}`);
      if (!this.writer) {
        throw new Error("No writer");
      }
      this.writer
        .write(toSend)
        .then(() => {
          this.runQueue(empty);
        })
        .catch((err) => empty(err, this));
    } else {
      // console.log(`runQueue:empty`);
      empty(undefined, this);
    }
  }

  send(payload: Uint8Array): boolean {
    // console.log(`send:${payload.length}`);
    if (payload.length == 0) {
      // console.log('send:empty');
      return true;
    }
    if (this.sendQueue.length >= this.config.maxSendQueueBytes!) {
      // console.log('send:maxSendQueueBytes');
      return false;
    }
    // console.log('send:queue');
    const frame = FrameProcessor.build(payload);
    this.metrics.send.Frames++;
    this.metrics.send.Bytes += frame.length;
    this.sendQueueLength += frame.length;
    this.sendQueue.push(frame);
    this.runQueue();
    return true;
  }

  close(): Promise<FrameMetrics> {
    return new Promise((rs, rj) => {
      this.runQueue((err, fp) => {
        if (err) {
          return rj(err);
        }
        if (this.writer) {
          this.writer
            .close()
            .then(() => {
              this.onCloseFns.forEach((fn) => fn(fp.metrics));
              rs(this.metrics);
            })
            .catch(rj);
        } else {
          this.onCloseFns.forEach((fn) => fn(fp.metrics));
          rs(this.metrics);
        }
      });
    });
  }

  readonly onCloseFns: ((fm: FrameMetrics) => void)[] = [];

  onClose(fn: (fm: FrameMetrics) => void): void {
    this.onCloseFns.push(fn);
  }
  onFrame(rf: ReceiveFrameFn): void {
    this.receiveFrameFns.push(rf);
  }
}
