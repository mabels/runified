interface ReChunkResult {
  readonly rest: Uint8Array;
  readonly chunk: Uint8Array;
}

export function array2stream(a: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < a.length; i++) {
        controller.enqueue(a[i]);
      }
      controller.close();
    },
  });
}

export async function rebufferArray(a: Uint8Array[], chunkSize: number): Promise<Uint8Array[]> {
  const rs = rebuffer(array2stream(a), chunkSize);
  const res: Uint8Array[] = [];
  const reader = rs.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    res.push(value);
  }
  return res;
}

function reChunk(cs: Uint8Array[], chunkSize: number): ReChunkResult {
  const len = cs.reduce((acc, v) => acc + v.length, 0);
  const last = cs[cs.length - 1];
  const lastOfs = len - last.length;
  // console.log("reChunk", len, lastOfs, last.length, chunkSize, chunkSize - lastOfs)
  const rest = last.subarray(chunkSize - lastOfs);
  cs[cs.length - 1] = last.subarray(0, chunkSize - lastOfs);
  const chunk = new Uint8Array(chunkSize);
  let ofs = 0;
  for (let i = 0; i < cs.length; i++) {
    // console.log("reChunk:for", i, ofs, chunk.length, cs[i].length)
    chunk.set(cs[i], ofs);
    ofs += cs[i].length;
  }
  return { rest, chunk };
}

interface pumpState {
  readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  tmp: Uint8Array[];
  tmpLen: number;
  readonly chunkSize: number;
}

function pump(ps: pumpState): void {
  ps.reader.read().then(({ done, value }) => {
    if (done) {
      if (ps.tmpLen > 0) {
        ps.controller.enqueue(reChunk(ps.tmp, ps.tmpLen).chunk);
      }
      ps.controller.close();
      return;
    }
    if (ps.tmpLen + value.length > ps.chunkSize) {
      ps.tmp.push(value);
      const res = reChunk(ps.tmp, ps.chunkSize);
      ps.controller.enqueue(res.chunk);
      ps.tmp = [res.rest];
      ps.tmpLen = res.rest.length;
    } else if (value.length) {
      ps.tmp.push(value);
      ps.tmpLen += value.length;
    }
    pump(ps);
  });
}

export function rebuffer(a: ReadableStream<Uint8Array>, chunkSize: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = a.getReader();
      pump({
        reader,
        controller,
        tmp: [],
        tmpLen: 0,
        chunkSize,
      });
    },
  });
}
