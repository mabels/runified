import { rebuffer, rebufferArray } from "./rebuffer";

it("rechunk empty", async () => {
  const chunks = await rebufferArray([], 10);
  expect(chunks.length).toEqual(0);
});

it("rechunk 0 size", async () => {
  const chunks = await rebufferArray([new Uint8Array(0)], 10);
  expect(chunks.length).toEqual(0);
});

it("rechunk smaller 10", async () => {
  const chunks = await rebufferArray([new Uint8Array(3)], 10);
  expect(chunks.length).toEqual(1);
  expect(chunks[0].length).toEqual(3);
});

it("rechunk smaller 10 pack smaller chunks", async () => {
  const chunks = await rebufferArray(
    Array(7)
      .fill(0)
      .map((_, i) => {
        const o = new Uint8Array(3);
        for (let j = 0; j < o.length; j++) {
          o[j] = i * o.length + j;
        }
        return o;
      }),
    10,
  );
  expect(chunks.length).toEqual(3);
  expect(chunks[0].length).toEqual(10);
  expect(Array.from(chunks[0]).map((i) => i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(chunks[1].length).toEqual(10);
  expect(Array.from(chunks[1]).map((i) => i)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  expect(chunks[2].length).toEqual(1);
  expect(Array.from(chunks[2]).map((i) => i)).toEqual([20]);
});

it("rechunk smaller 10 pack bigger chunks", async () => {
  const chunks = await rebufferArray(
    Array(3)
      .fill(0)
      .map((_, i) => {
        const o = new Uint8Array(11);
        for (let j = 0; j < o.length; j++) {
          o[j] = i * o.length + j;
        }
        return o;
      }),
    10,
  );
  expect(chunks.length).toEqual(4);
  expect(chunks[0].length).toEqual(10);
  expect(Array.from(chunks[0]).map((i) => i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(chunks[1].length).toEqual(10);
  expect(Array.from(chunks[1]).map((i) => i)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  expect(chunks[2].length).toEqual(10);
  expect(Array.from(chunks[2]).map((i) => i)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  expect(chunks[3].length).toEqual(3);
  expect(Array.from(chunks[3]).map((i) => i)).toEqual([30, 31, 32]);
});

it("test streaming backpressure", async () => {
  const ts = new TransformStream<Uint8Array, Uint8Array>(undefined, undefined, { highWaterMark: 2 });
  const bufsize = 11;
  const fillChunkSize = 3;
  const sendChunks = 10000;

  const reb = rebuffer(ts.readable, bufsize);
  const rebFn = jest.fn();
  let fillCalls = 0;
  let reBufferCalls = 0;
  const rebuffered = new Promise<void>((resolve) => {
    const reader = reb.getReader();
    function pump() {
      reader.read().then(({ done, value }) => {
        rebFn({ done, value, fillCalls, reBufferCalls });
        reBufferCalls++;
        if (done) {
          resolve();
          return;
        }
        pump();
      });
    }
    pump();
  });
  const filled = new Promise<void>((resolve) => {
    const writer = ts.writable.getWriter();
    function pump(i: number) {
      if (i >= sendChunks) {
        writer.close();
        resolve();
        return;
      }
      writer.ready.then(() => {
        fillCalls++;
        writer.write(new Uint8Array(Array(fillChunkSize).fill(i)));
        pump(i + 1);
      });
    }
    pump(0);
  });
  await Promise.all([filled, rebuffered]);
  expect(rebFn.mock.calls.length).toEqual(~~((fillChunkSize * sendChunks) / bufsize) + 1 + 1 /*done*/);
  expect(rebFn.mock.calls[rebFn.mock.calls.length - 1][0].done).toBeTruthy();
  let lastfillCalls = 0;
  for (let i = 0; i < rebFn.mock.calls.length - 1; i++) {
    const { fillCalls, reBufferCalls, value } = rebFn.mock.calls[i][0];
    // console.log(i, fillCalls, reBufferCalls, value[0], ~~((bufsize*i)/fillChunkSize))
    expect(value[0]).toBe(~~((bufsize * i) / fillChunkSize) % 256);
    expect(fillCalls).toBeLessThanOrEqual((fillCalls - lastfillCalls) * fillChunkSize + reBufferCalls * bufsize);
    lastfillCalls = fillCalls;
  }
});
