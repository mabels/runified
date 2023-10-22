interface pumpState<T> {
  readonly reader: ReadableStreamDefaultReader<T>;
  readonly controller: ReadableStreamDefaultController<T>;
  readonly streamMap: StreamMap<T>;
}
function pump<T>(ps: pumpState<T>): void {
  ps.reader.read().then(({ done, value }) => {
    if (done) {
      ps.streamMap.Close && ps.streamMap.Close();
      ps.controller.close();
      return;
    }
    ps.controller.enqueue(ps.streamMap.Map(value));
    pump(ps);
  });
}

export interface StreamMap<T> {
  Map(s: T): T;
  readonly Close?: () => void;
}
export function streamMap<T>(s: ReadableStream<T>, sm: StreamMap<T>): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      pump({ reader: s.getReader(), controller, streamMap: sm });
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

export async function stream2array<T>(a: ReadableStream<T>): Promise<T[]> {
  const ret: T[] = [];
  return new Promise<T[]>((resolve) => {
    streamMap(a, {
      Map: (i) => {
        ret.push(i);
        return i;
      },
      Close: () => {
        resolve(ret);
      },
    });
  });
}
