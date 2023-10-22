import { rebufferArray } from "./rebuffer";
it("rechunk empty", async () => {
  const chunks = await rebufferArray([], 10);
  expect(chunks.length).toEqual(0);
});

it("rechunk empty 0 size", async () => {
  const chunks = await rebufferArray([new Uint8Array(0)], 10);
  expect(chunks.length).toEqual(0);
});

it("rechunk empty smaller 10", async () => {
  const chunks = await rebufferArray([new Uint8Array(3)], 10);
  expect(chunks.length).toEqual(1);
  expect(chunks[0].length).toEqual(3);
});

it("rechunk empty smaller 10 pack smaller chunks", async () => {
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

it("rechunk empty smaller 10 pack bigger chunks", async () => {
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
