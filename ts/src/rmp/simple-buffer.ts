export class SimpleBuffer {
  readonly buffer: Uint8Array[] = [];
  bufferLen = 0;
  nextOfs = 0;
  push(chunk: Uint8Array) {
    if (chunk.length > 0) {
      this.buffer.push(chunk);
      this.bufferLen += chunk.length;
    }
  }
  shift(len: number): Uint8Array {
    if (len > this.bufferLen) {
      throw Error(`Buffer to short:${len}:${this.bufferLen}`);
    }
    if (len == 0) {
      return new Uint8Array();
    }
    if (this.nextOfs === 0 && this.buffer[0].length >= len) {
      this.bufferLen -= len;
      const ret = this.buffer[0];
      if (this.buffer[0].length == len) {
        // console.log("Shift-X", this.buffer.length)
        this.buffer.shift();
      } else {
        this.nextOfs = len;
      }
      return ret;
    }
    const ret = new Uint8Array(len);
    let retOfs = 0;
    while (len > 0) {
      const head = this.buffer[0];
      let remainingHeadLen = head.length - this.nextOfs;
      if (remainingHeadLen > len) {
        remainingHeadLen = len;
      }

      ret.set(head.subarray(this.nextOfs, this.nextOfs + remainingHeadLen), retOfs);
      retOfs += remainingHeadLen;
      this.bufferLen -= remainingHeadLen;
      len -= remainingHeadLen;
      if (remainingHeadLen + this.nextOfs == head.length) {
        // console.log("Shift-Y", this.buffer.length)
        this.buffer.shift();
        this.nextOfs = 0;
      } else {
        this.nextOfs += remainingHeadLen;
      }
    }
    return ret;
  }
}
