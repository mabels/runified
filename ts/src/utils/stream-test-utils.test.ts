export interface streamingTestState {
  readonly sendChunks: number;
  readonly sendChunkSize: number;
  fillCalls: number;
  CollectorFn: jest.Mock<void, [{ done: boolean; value: Uint8Array | undefined; fillCalls: number; reBufferCalls: number }]>;
}

export async function receiveFromStream(reb: ReadableStream<Uint8Array>, state: streamingTestState) {
  return new Promise<void>((resolve) => {
    let reBufferCalls = 0;
    const reader = reb.getReader();
    function pump() {
      reader.read().then(({ done, value }) => {
        state.CollectorFn({ done, value, fillCalls: state.fillCalls, reBufferCalls });
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
}

export async function sendToStream(reb: WritableStream<Uint8Array>, state: streamingTestState) {
  return new Promise<void>((resolve) => {
    const writer = reb.getWriter();
    function pump(i: number) {
      if (i >= state.sendChunks) {
        writer.close();
        resolve();
        return;
      }
      writer.ready.then(() => {
        state.fillCalls++;
        writer.write(new Uint8Array(Array(state.sendChunkSize).fill(i)));
        pump(i + 1);
      });
    }
    pump(0);
  });
}

it("does nothing", () => {});
