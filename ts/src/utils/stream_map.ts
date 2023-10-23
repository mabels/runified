interface pumpState<T, U> {
  readonly reader: ReadableStreamDefaultReader<T>;
  readonly controller: ReadableStreamDefaultController<U>;
  readonly streamMap: StreamMap<T, U>;
  idx: number;
}
function pump<T, U>(ps: pumpState<T, U>): void {
  ps.reader.read().then(({ done, value }) => {
    if (done) {
      ps.streamMap.Close && ps.streamMap.Close();
      ps.controller.close();
      return;
    }
    ps.controller.enqueue(ps.streamMap.Map(value, ps.idx++));
    pump(ps);
  });
}

export interface StreamMap<T, U> {
  Map(s: T, idx: number): U;
  readonly Close?: () => void;
}
export function streamMap<T, U>(s: ReadableStream<T>, sm: StreamMap<T, U>): ReadableStream<U> {
  return new ReadableStream<U>({
    start(controller) {
      pump({ reader: s.getReader(), controller, streamMap: sm, idx: 0 });
      return;
    },
  });
}

export function array2stream<T>(a: T[]): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      for (let i = 0; i < a.length; i++) {
        controller.enqueue(a[i]);
      }
      controller.close();
    },
  });
}

export async function stream2array<T, U>(a: ReadableStream<T>): Promise<U[]> {
  return new Promise<U[]>((resolve) => {
    const ret: U[] = [];
    streamMap(a, {
      Map: (i) => {
        ret.push(i as unknown as U);
        return i;
      },
      Close: () => {
        resolve(ret);
      },
    });
  });
}
