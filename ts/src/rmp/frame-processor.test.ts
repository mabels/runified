import { FrameProcessor, Frame, VersionCodec, VersionFormat, FrameMetrics } from "./frame-processor";
import { SimpleBuffer } from "./simple-buffer";

function createStream(bas: Uint8Array[], sizeFn: () => number): ReadableStream {
  return new ReadableStream<Uint8Array>({
    start(ctr): void {
      // expect(ba.length).toBe(INPUTLEN)
      for (const ba of bas) {
        for (let ofs = 0; ofs < ba.length; ) {
          const nextLen = sizeFn();
          let endOfs = ofs + nextLen;
          if (endOfs >= ba.length) {
            endOfs = ofs + (ba.length - ofs);
          }
          // if (ofs >= ba.length - 5) {
          //     console.log(ba.length, nextLen, ofs, endOfs)
          // }
          // console.log("enqueue:", ofs, endOfs)
          ctr.enqueue(ba.subarray(ofs, endOfs));
          ofs = endOfs;
        }
      }
      ctr.close();
    },
  });
}

describe("FrameProcessor", () => {
  // const frameProcessor = new FrameProcessor();

  it("build-decode", () => {
    const sb = new SimpleBuffer();
    const txtD = new TextDecoder();
    const base64Chars = /[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/]/;
    const macFrame = new Uint8Array(FrameProcessor.MacFrameSize);
    for (let i = 0, o = 61; i < 20; o = o << 1, ++i) {
      const build = FrameProcessor.build(new Uint8Array(o));
      expect(build.length).toBe(o + FrameProcessor.MacFrameSize);
      macFrame.set(build.subarray(0, FrameProcessor.MacFrameSize));
      const my = txtD.decode(macFrame);
      expect(my.match(base64Chars)).toBeTruthy();
      // console.log(`build-decode: ${o} -> ${build.length} -> ${my}`);
      sb.push(build);
      const fb = FrameProcessor.decode(sb);
      expect(fb.Version).toBe(Symbol.for("A"));
      expect(fb.Codec).toBe("-".charCodeAt(0));
      expect(fb.Format).toBe("I".charCodeAt(0));
      expect(fb.Length).toBe(o);
      sb.shift(fb.Length);
    }
  });

  it("not throw", () => {
    expect(() => {
      FrameProcessor.build(new Uint8Array());
    }).not.toThrow();
  });
  it("FrameProcessor empty", async () => {
    const bytes = Array(10).fill(FrameProcessor.build(new Uint8Array(0))) as Uint8Array[];
    expect(
      await new FrameProcessor({
        inputStream: createStream(bytes, () => 1),
      }).match((frame: Frame) => {
        expect(frame.MacFrame.Length).toBe(0);
      }),
    ).toEqual({ received: { Bytes: 0, Frames: 10 }, send: { Bytes: 0, Frames: 0 } });
  });

  it("FrameProcessor random sizes ", async () => {
    const frames = Array(1024)
      .fill(0)
      .map(() => {
        return FrameProcessor.build(new Uint8Array(~~(Math.random() * 300 + 63)));
      });
    let frameIdx = 0;
    // const bufferSize = frames.reduce((a, v) =>  a + v.length, 0)
    // const start = new Date()
    const metrics = await new FrameProcessor({
      inputStream: createStream(frames, () => ~~(Math.random() * 300 + 63)),
    }).match((frame: Frame) => {
      expect(frame.MacFrame.Version).toBe(Symbol.for("A"));
      expect(frame.MacFrame.Codec).toBe(VersionCodec["-"]);
      expect(frame.MacFrame.Format).toBe(VersionFormat.I);
      //   throw Error('What')
      //   console.log("GotFrame:", frame.MacFrame.Length, frame.Payload.length, frameIdx, frames[frameIdx].length)
      expect(frame.MacFrame.Length + FrameProcessor.MacFrameSize).toBe(frames[frameIdx].length);
      expect(frame.Payload.length + FrameProcessor.MacFrameSize).toBe(frames[frameIdx].length);
      frameIdx++;
      //   console.log("frameIdx:", frameIdx)
    });
    expect(metrics.received.Frames).toEqual(frames.length);
    // const end = new Date()
    // const dist = (end.getTime() - start.getTime())/1000
    // console.log("bandwidth:", bufferSize, dist, bufferSize/dist)
    expect(frames.length).toBe(frameIdx);
  });

  it("FrameProcessor defect frame ", async () => {
    const frames = Array(24)
      .fill(0)
      .map(() => {
        return FrameProcessor.build(new Uint8Array(~~(Math.random() * 300 + 63)));
      });
    const out = [...frames, new Uint8Array(1), ...frames];
    let frameIdx = 0;
    try {
      await new FrameProcessor({
        inputStream: createStream(out, () => ~~(Math.random() * 300 + 63)),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      }).match((frame: Frame) => {
        frameIdx++;
      });
      expect(true).toBe(false);
    } catch (e) {
      expect((e as Error).message).toBe("unknown version");
    }
    expect(frameIdx).toBe(frames.length);
  });

  // it("FrameProcessor empty", () => {
  //   const frame = new FrameProcessor();
  //   const byteFrame = frame.build(new TextEncoder().encode("test"));
  // });

  // it("Envelope", () => {
  //   //     buildEnvelope(frame.envWriter, {
  //   //         Src: "src",
  //   //         Dst: "dst",
  //   //         Time: 4711,
  //   //         TTL: 11,
  //   //         Payload: {
  //   //             Type: "type",
  //   //             Data: (new TextEncoder()).encode("test")
  //   //         }
  //   // })

  // it("getStreamController non blocking", async () => {
  //   const fp = new FrameProcessor({

  //   });
  //   const gscs = Array(100)
  //     .fill(0)
  //     .map(() => fp.getStreamController());
  //   const gsc = await Promise.all(gscs);
  //   expect(gsc.length).toBe(100);
  //   for (let i = 0; i < gsc.length; i++) {
  //     expect(await fp.getStreamController()).toBe(gsc[i]);
  //   }
  // });

  it("run stack", async () => {
    const trans = new TransformStream<Uint8Array, Uint8Array>();
    const pks = 100;
    const fp = new FrameProcessor({
      inputStream: new ReadableStream<Uint8Array>({
        start(ctr): void {
          for (let i = 0; i < pks; i++) {
            ctr.enqueue(FrameProcessor.build(new TextEncoder().encode(`InputStream:${i}`)));
          }
          ctr.close();
        },
      }),
      outputStream: trans.writable,
    });
    const frameProcessor = new Promise<void>((resolve) => {
      let onFrames = 0;
      fp.onFrame((frame: Frame) => {
        if (onFrames++ < pks) {
          const data = new TextDecoder().decode(frame.Payload);
          expect(fp.send(new TextEncoder().encode(`OutputStream:${data}`))).toBe(true);
        }
        if (onFrames >= pks) {
          let count = 0;
          const action = (): void => {
            expect(fp.send(new TextEncoder().encode(`AfterClose:${count++}`))).toBe(true);
            if (count < pks) {
              setTimeout(action, 1);
            } else {
              void fp.close().then((metrics) => {
                expect(metrics).toEqual({
                  received: { ...metrics.received, Frames: pks },
                  send: { ...metrics.send, Frames: 2 * pks },
                });
                resolve();
              });
            }
          };
          action();
        }
      });
    });
    const outStreamProcessor = new Promise<FrameMetrics>((resolve, reject) => {
      let oFrames = 0;
      const dfp = new FrameProcessor({
        inputStream: trans.readable,
      });
      dfp
        .match((frame: Frame) => {
          const data = new TextDecoder().decode(frame.Payload);
          if (oFrames < pks) {
            expect(data).toBe(`OutputStream:InputStream:${oFrames++}`);
          } else {
            expect(new TextDecoder().decode(frame.Payload)).toBe(`AfterClose:${oFrames++ - pks}`);
          }
        })
        .then((metric) => {
          resolve(metric);
        })
        .catch((e) => reject(e as Error));
    });
    const inputStreamProcessor = fp.start();

    const [ometrics, metrics] = await Promise.all([outStreamProcessor, inputStreamProcessor, frameProcessor]);

    expect(metrics).toEqual({
      received: { Bytes: metrics.received.Bytes, Frames: pks },
      send: { Bytes: metrics.send.Bytes, Frames: pks * 2 },
    });

    expect(ometrics).toEqual({
      received: { Bytes: ometrics.received.Bytes, Frames: 2 * pks },
      send: { Bytes: ometrics.send.Bytes, Frames: 0 },
    });

    // start(inputStream: ReadableStream<Uint8Array>): Promise<number> {
    //   return new Promise((rs, rj) => {
    //     FrameProcessor.match(inputStream, (frame) => {
    //       this.receiveFrameFns.forEach(rf => rf(frame));
    //     }).then((frames) => {
    //       this.getStreamController().then(sc => sc.controller.close());
    //       rs(frames)
    //     });
    //   });

    // send(payload: Uint8Array): void {
    //   this.getStreamController().then(sc => sc.controller.enqueue(FrameProcessor.build(payload)));
    // }
    // onFrame(rf: ReceiveFrameFn): void {
    //   this.receiveFrameFns.push(rf);
    // }
  });
});

// export {};
