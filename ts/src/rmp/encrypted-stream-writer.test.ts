import { connectTcp, createResponseStream, DeCrypter } from "./encrypted-stream-writer";
import net from "node:net";
import crypto from "node:crypto";
import { Frame, FrameProcessor } from "./frame-processor";

function onceServer(port = 4711, fn: (frame: Frame) => void) {
  return new Promise<void>((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", (err) => {
      reject(err);
    });
    srv.listen(port, () => {
      // console.log(`Listen`);
      srv.on("connection", (socket) => {
        const out = new TransformStream<Uint8Array, Uint8Array>();
        const fp = new FrameProcessor({
          inputStream: out.readable,
        });
        const writer = out.writable.getWriter();
        // console.log(`Listen:connection`);
        socket.on("data", (data) => {
          // console.log(`Received data: ${data}`);
          writer.write(new Uint8Array(data));
        });
        socket.on("close", () => {
          // console.log(`Listen:close`);
          writer.close();
          srv.close();
          resolve();
        });
        fp.match(fn).then(() => {});
      });
    });
  });
}

it("connect tcp reject unhandled", async () => {
  expect(connectTcp(`tcp://localhost:49724`)).rejects.toThrowError();
});

it("connect tcp", async () => {
  const port = 59723;
  const oc = onceServer(port, (frame) => {
    expect(frame).toEqual({});
    // readerLoop(
    //   rs.getReader(),
    //   async (data) => {
    //     expect(data).toEqual("xxxx");
    //   },
    //   () => {}
    // );
  });
  const stream = await connectTcp("tcp://localhost:59723");
  expect(stream.readable).toBeDefined();
  expect(stream.writable).toBeDefined();
  stream.close();
  await oc;
  // stream.writable.close();
});

it("createResponseStream not working", async () => {
  const dataInputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(new TextEncoder().encode(`Hello ${i}`));
      }
    },
  });
  const rs = createResponseStream({
    endpointUrl: "tcp://localhost:47554",
    crypto: { key: new Uint8Array(32) },
    response: new Response(dataInputStream),
  });
  expect(rs).rejects.toThrowError();
});

it("createResponseStream working", async () => {
  const port = 59723;
  const cparam = {
    key: crypto.randomBytes(32),
    iv: crypto.randomBytes(12),
  };
  const deCipher = new DeCrypter(cparam);
  const results = [
    `{"streamId":"123","cipher":"chacha20-poly1305","iv":"${cparam.iv.toString("base64")}"}`,
    '{"status":200,"statusText":"","headers":{}}',
    ...new Array(10).fill(0).map((_, i) => `Hello ${i}`),
  ];
  let first = true;
  const os = onceServer(port, (frame) => {
    if (first) {
      first = false;
      expect(results.shift()).toEqual(new TextDecoder().decode(frame.Payload));
      return;
    }
    const data = deCipher.decrypt(frame.Payload);
    expect(new TextDecoder().decode(data)).toEqual(results.shift());
  });

  const dataInputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(new TextEncoder().encode(`Hello ${i}`));
      }
      controller.close();
    },
  });
  const rs = await createResponseStream({
    endpointUrl: `http://localhost:${port}/?streamId=123`,
    crypto: cparam,
    response: new Response(dataInputStream),
  });
  await os;
  expect(results).toEqual([]);
  expect(rs).toEqual({
    connectionEstablish: 0,
    metrics: { received: { Bytes: 0, Frames: 0 }, send: { Bytes: 280, Frames: 12 } },
    totalTime: 0,
  });
});
