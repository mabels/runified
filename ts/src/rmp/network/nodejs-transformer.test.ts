import { createServer, Server } from "node:http";
import { nodejsTransform } from "./nodejs-transformer";
import { HttpHeader } from "../../types";
import { AddressInfo } from "node:net";
import { stream2string } from "../../utils";

const duplex: { duplex?: string } = {
  duplex: "half",
};

describe("nodejs-transformer", () => {
  let port = 0;
  let server: Server;

  beforeAll(async () => {
    return new Promise<void>((rs) => {
      server = createServer(
        nodejsTransform({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          fetch: async (req, _env, _ctx) => {
            return new Response(req.body, {
              status: 200,
              statusText: "OK",
              headers: HttpHeader.from(req.headers).Set("Connection", "close").Add("X-Test", "Test").AsHeaderInit(),
            });
          },
        }),
      ).listen(port, () => {
        const addr = server.address() as AddressInfo;
        port = addr.port;
        rs();
      });
    });
  });

  it("nodejs-transformer-empty-body", async () => {
    const res = await fetch(`http://localhost:${port}`, {
      method: "GET",
      headers: {
        hello: "world",
      },
    });
    expect(res.status).toBe(200);
    expect(res.statusText).toBe("OK");
    expect(res.headers.get("Connection")).toBe("close");
    expect(res.headers.get("X-Test")).toBe("Test");
    expect(res.headers.get("hello")).toBe("world");
    expect(await stream2string(res.body)).toBe("");
  });

  it("nodejs-transformer-constant-body", async () => {
    const res = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: {
        hello: "world",
      },
      body: "hello world",
      ...duplex,
    });
    expect(res.status).toBe(200);
    expect(res.statusText).toBe("OK");
    expect(res.headers.get("X-Test")).toBe("Test");
    expect(res.headers.get("hello")).toBe("world");
    expect(await stream2string(res.body)).toBe("hello world");
  });

  it("nodejs-transformer-stream-body", async () => {
    const rs = new ReadableStream<Uint8Array>({
      start(controller) {
        let count = 10;
        const inter = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(`msg:${count--}\n`));
          if (count < 0) {
            clearInterval(inter);
            controller.close();
          }
        }, 50);
      },
    });
    const res = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: {
        hello: "world",
      },
      body: rs,
      ...duplex,
    });
    expect(res.status).toBe(200);
    expect(res.statusText).toBe("OK");
    expect(res.headers.get("X-Test")).toBe("Test");
    expect(res.headers.get("hello")).toBe("world");
    const reader = res.body!.getReader();
    let count = 10;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) {
        break;
      }
      expect(new TextDecoder().decode(chunk)).toBe(`msg:${count--}\n`);
    }
  });

  afterAll(() => {
    server.close();
  });
});
