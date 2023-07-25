import { SimpleBuffer } from "./simple-buffer";

const LEN = 62;
// const INPUTLEN = ~~(1024 * 1024/LEN) * LEN
const INPUTLEN = ~~((1024 * 1024) / LEN) * LEN;

function simepleBuffer(ba: Uint8Array, sizeFn: () => number): SimpleBuffer {
  const sb = new SimpleBuffer();
  // expect(ba.length).toBe(INPUTLEN)
  for (let ofs = 0; ofs < ba.length; ) {
    const nextLen = sizeFn();
    let endOfs = ofs + nextLen;
    if (endOfs >= ba.length) {
      endOfs = ofs + (ba.length - ofs);
    }
    // if (ofs >= ba.length - 5) {
    //     console.log(ba.length, nextLen, ofs, endOfs)
    // }
    sb.push(ba.subarray(ofs, endOfs));
    ofs = endOfs;
  }
  return sb;
}

function createTestBuffer(len: number) {
  const values = new Uint8Array(LEN);
  const buffer = new Uint8Array(len);
  for (let i = 0; i < values.length; i++) {
    if (i < 26) {
      values[i] = "A".charCodeAt(0) + i;
    } else if (i < 52) {
      values[i] = "a".charCodeAt(0) + i - 26;
    } else {
      values[i] = "0".charCodeAt(0) + i - 52;
    }
  }
  for (let i = 0; i < buffer.length; i += values.length) {
    values[0] = (i >> 16) & 0xff;
    values[1] = (i >> 8) & 0xff;
    values[2] = i & 0xff;
    buffer.set(values, i);
  }
  return buffer;
}

function test62(sp: SimpleBuffer, buffer: Uint8Array) {
  expect(sp.bufferLen).toBe(buffer.length);
  let ok = true;
  for (let i = 0; i < buffer.length; i += LEN) {
    const o = sp.shift(LEN);
    // expect(o.length).toBeGreaterThanOrEqual(LEN)
    // expect(enc.decode(o.subarray(LEN-10, LEN))).toBe('0123456789')
    // expect(i).toBe(o[0] << 16 | o[1] << 8 | o[2])
    if (i != ((o[0] << 16) | (o[1] << 8) | o[2])) {
      ok = false;
      expect(i).toBe((o[0] << 16) | (o[1] << 8) | o[2]);
    }
  }
  expect(ok).toBeTruthy();
  expect(sp.buffer.length).toBe(0);
}

describe("SimpleBuffer", () => {
  const buffer = createTestBuffer(INPUTLEN);
  it("push with empty buffer", () => {
    const sb = new SimpleBuffer();
    sb.push(new Uint8Array());
    expect(sb.bufferLen).toBe(0);
    expect(sb.buffer.length).toBe(0);
    sb.push(new Uint8Array(1));
    sb.push(new Uint8Array(0));
    sb.push(new Uint8Array(1));
    expect(sb.bufferLen).toBe(2);
    expect(sb.buffer.length).toBe(2);
  });

  it("sequence onebyte", () => {
    const buffer = createTestBuffer(~~((64 * 1024) / LEN) * LEN);
    const sp = simepleBuffer(buffer, () => 1);
    test62(sp, buffer);
  });
  it("sequence 20byte packets", () => {
    const sp = simepleBuffer(buffer, () => 20);
    test62(sp, buffer);
  });

  it("sequence random packets", () => {
    const sp = simepleBuffer(buffer, () => ~~(Math.random() * 73 + 10));
    test62(sp, buffer);
  });

  it("sequence toobig", () => {
    const sp = simepleBuffer(buffer, () => 2048);
    test62(sp, buffer);
  });
  it("sequence matching", () => {
    const sp = simepleBuffer(buffer, () => LEN);
    expect(sp.buffer.length).toBe(INPUTLEN / LEN);
    test62(sp, buffer);
  });
});

export {};
