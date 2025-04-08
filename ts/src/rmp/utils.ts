import { EnvelopeCtx, MatchFN } from "./envelope-handler.js";
import { Envelope } from "./envelope-processor.js";
import { UnregFn } from "./pony-types.js";
import * as crypto from "node:crypto";
export type UnknownFn = (...args: unknown[]) => void;

export function uint6ToB64(nUint6: number): number {
  return nUint6 < 26
    ? nUint6 + 65
    : nUint6 < 52
      ? nUint6 + 71
      : nUint6 < 62
        ? nUint6 - 4
        : nUint6 === 62
          ? 43
          : nUint6 === 63
            ? 47
            : 65;
}

export function b64ToUint6(nChr: number): number {
  return nChr > 64 && nChr < 91
    ? nChr - 65
    : nChr > 96 && nChr < 123
      ? nChr - 71
      : nChr > 47 && nChr < 58
        ? nChr + 4
        : nChr === 43
          ? 62
          : nChr === 47
            ? 63
            : 0;
}

export function base64EncArr(aBytes: Uint8Array): string {
  let nMod3 = 2;
  let sB64Enc = "";

  const nLen = aBytes.length;
  let nUint24 = 0;
  for (let nIdx = 0; nIdx < nLen; nIdx++) {
    nMod3 = nIdx % 3;
    if (nIdx > 0 && ((nIdx * 4) / 3) % 76 === 0) {
      sB64Enc += "\r\n";
    }

    nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCodePoint(
        uint6ToB64((nUint24 >>> 18) & 63),
        uint6ToB64((nUint24 >>> 12) & 63),
        uint6ToB64((nUint24 >>> 6) & 63),
        uint6ToB64(nUint24 & 63),
      );
      nUint24 = 0;
    }
  }
  return sB64Enc.substring(0, sB64Enc.length - 2 + nMod3) + (nMod3 === 2 ? "" : nMod3 === 1 ? "=" : "==");
}

export function base64DecToArr(sBase64: string, nBlocksSize = 0): Uint8Array {
  const sB64Enc = sBase64.replace(/[^A-Za-z0-9+/]/g, "");
  const nInLen = sB64Enc.length;
  const nOutLen = nBlocksSize ? Math.ceil(((nInLen * 3 + 1) >> 2) / nBlocksSize) * nBlocksSize : (nInLen * 3 + 1) >> 2;
  const taBytes = new Uint8Array(nOutLen);

  let nMod3;
  let nMod4;
  let nUint24 = 0;
  let nOutIdx = 0;
  for (let nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4));
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      nMod3 = 0;
      while (nMod3 < 3 && nOutIdx < nOutLen) {
        taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
        nMod3++;
        nOutIdx++;
      }
      nUint24 = 0;
    }
  }

  return taBytes;
}

export function responseInitFromResponse(response: Response, ri: ResponseInit = {}): ResponseInit {
  return {
    ...ri,
    status: response.status,
    statusText: response.statusText,
    headers: { ...response.headers, ...ri.headers },
  };
}

// export interface PipeOnClose {
//   stream: ReadableStream<Uint8Array>;
//   onClose: Promise<void>;
// }

export function readerLoop(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  writeFn: (chunk: Uint8Array) => Promise<void>,
  doneFn: (err: Error | undefined) => void,
): void {
  reader
    .read()
    .then(({ done, value }) => {
      if (done) {
        doneFn(undefined);
        return;
      }
      if (value) {
        writeFn(value)
          .then(() => {
            readerLoop(reader, writeFn, doneFn);
          })
          .catch((err) => {
            doneFn(err as Error);
          });
      } else {
        readerLoop(reader, writeFn, doneFn);
      }
    })
    .catch(doneFn);
}

function readLoop(
  controller: ReadableStreamController<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  doneFn: (err: Error | undefined, ctr?: ReadableStreamController<Uint8Array>) => void,
): void {
  reader
    .read()
    .then(({ done, value }) => {
      if (done) {
        doneFn(undefined, controller);
        return;
      }
      if (value) {
        controller.enqueue(value);
      }
      readLoop(controller, reader, doneFn);
    })
    .catch(doneFn);
}

export function PipeWaitToClose(
  src: ReadableStream<Uint8Array>,
  doneFn: (err: Error | undefined, ctr?: ReadableStreamController<Uint8Array>) => void,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller): void {
      const reader = src.getReader();
      readLoop(controller, reader, doneFn);
    },
  });
}

export class OnMatchHandler<FN extends MatchFN> {
  readonly handlers = new Map<string, FN>();
  addId(id: string, fn: FN) {
    this.handlers.set(id, fn);
    return (): void => {
      this.handlers.delete(id);
    };
  }
  add(fn: FN): UnregFn {
    return this.addId(quickId(), fn);
  }
  invoke(id: string, ...args: unknown[]): boolean {
    const fn = this.handlers.get(id);
    if (fn) {
      fn(args[0] as Envelope, args[1] as EnvelopeCtx);
    }
    return !!fn;
  }
}

export function quickId(len = 12): string {
  const rand = crypto.getRandomValues(new Uint8Array(len));
  return base64EncArr(rand);
}

function streamToUint8ArrayArray(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  doneFn: (err: Error | undefined, r: Uint8Array[]) => void,
  result: Uint8Array[] = [],
): void {
  reader
    .read()
    .then(({ done, value }) => {
      if (done) {
        doneFn(undefined, result);
        return;
      }
      if (value) {
        result.push(value);
      }
      streamToUint8ArrayArray(reader, doneFn, result);
    })
    .catch((err) => {
      doneFn(err as Error, result);
    });
}

export function streamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    streamToUint8ArrayArray(stream.getReader(), (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      const result = new Uint8Array(results.reduce((acc, v) => acc + v.length, 0));
      results.reduce(
        (acc, v) => {
          result.set(v, acc.offset);
          acc.offset += v.length;
          return acc;
        },
        { result, offset: 0 },
      );
      resolve(result);
    });
  });
}

export class WaitToClose {
  awaiting: number;
  readonly onCloses: (() => void)[] = [];
  constructor(awaiting: number) {
    this.awaiting = awaiting;
  }

  done = (): void => {
    this.awaiting--;
    if (this.awaiting <= 0) {
      this.onCloses.forEach((fn) => fn());
    }
  };

  onClose(fn: () => void): void {
    this.onCloses.push(fn);
  }
}
