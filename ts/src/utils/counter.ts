import { HttpHeader, HttpResponseWriter } from "../types";

export interface CountingRequestReaderParams {
  readonly R?: ReadableStream<Uint8Array>;
}

class reader implements ReadableStreamDefaultReader<Uint8Array> {
  constructor(readonly _reader: ReadableStreamReader<Uint8Array>, readonly _countingReader: CountingReadableStream) {}

  async read(x?: never): Promise<ReadableStreamReadResult<Uint8Array>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ret = await this._reader.read(x!);
    this._countingReader.ReadBytes += ret.value?.length ?? 0;
    return Promise.resolve(ret);
  }
  releaseLock(): void {
    return this._reader.releaseLock();
  }
  get closed(): Promise<undefined> {
    return this._reader.closed;
  }
  cancel(reason?: never): Promise<void> {
    return this._reader.cancel(reason);
  }
}

export class CountingReadableStream implements ReadableStream<Uint8Array> {
  readonly _stream: ReadableStream<Uint8Array>;
  ReadBytes = 0;
  constructor(stream: ReadableStream<Uint8Array>) {
    this._stream = stream;
  }
  get locked() {
    return this._stream.locked;
  }
  cancel(reason?: never): Promise<void> {
    return this._stream.cancel(reason);
  }
  getReader(options: { mode: "byob" }): ReadableStreamBYOBReader;
  getReader(): ReadableStreamDefaultReader<Uint8Array>;
  getReader(options?: ReadableStreamGetReaderOptions | undefined): ReadableStreamReader<Uint8Array>;
  getReader(options?: unknown): ReadableStreamReader<Uint8Array> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return new reader(this._stream.getReader(options!), this);
  }
  pipeThrough<T>(transform: ReadableWritablePair<T, Uint8Array>, options?: StreamPipeOptions | undefined): ReadableStream<T> {
    return this._stream.pipeThrough(transform, options);
  }
  pipeTo(destination: WritableStream<Uint8Array>, options?: StreamPipeOptions | undefined): Promise<void> {
    return this._stream.pipeTo(destination, options);
  }
  tee(): [ReadableStream<Uint8Array>, ReadableStream<Uint8Array>] {
    return this._stream.tee();
  }
}

export class CountingResponseWriter implements HttpResponseWriter {
  readonly _params: HttpResponseWriter;
  StatusCode?: number;
  WrittenBytes = 0;
  constructor(param: HttpResponseWriter) {
    this._params = param;
  }

  Header(): HttpHeader {
    return this._params.Header();
  }
  async Write(data?: string | Uint8Array): Promise<number> {
    const count = await this._params.Write(data);
    this.WrittenBytes += count;
    return count;
  }
  WriteHeader(statusCode: number): void {
    this.StatusCode = statusCode;
    this._params.WriteHeader(statusCode);
  }
  End(): Promise<void> {
    return this._params.End();
  }
}

// calculate the bytelength of the headers of type map[string][]string
export function CalculateHeaderByteLength(headers: HttpHeader | undefined): number {
  if (!(headers instanceof HttpHeader)) {
    return 0;
  }
  let totalSum = 0;
  const items = headers.Items();
  for (const [k, vs] of items) {
    for (const v of vs) {
      totalSum += k.length + ": ".length + v.length + "\r\n".length;
    }
  }
  return totalSum;
}

// filter out unwanted headers from request headers
export function FilterHeaders(headers: HttpHeader): HttpHeader {
  const resultingHeaders = headers.Clone();
  const confidentialHeaderSlice = ["Authorization", "Cookie", "X-Request-ID"];
  for (const header of confidentialHeaderSlice) {
    resultingHeaders.Del(header);
  }
  return resultingHeaders;
}
