import * as http from "node:http";
import { FetchHttpClient } from "./fetch_http_client";
import enableDestroy from "server-destroy";
import { stream2string } from "./stream2string";
import { string2stream } from "./string2stream";

function runServer(fn: (url: string) => Promise<void>) {
  const host = "localhost";
  const port = ~~(Math.random() * (65535 - 1024) + 1024);
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    req.on("data", (chunk) => {
      res.write(chunk);
    });
    req.on("end", () => {
      res.end();
    });
  });
  enableDestroy(server);
  try {
    server.listen(port, host, () => {
      // console.log(`Server is running on http://${host}:${port}`);
    });
    fn(`http://${host}:${port}`).finally(() => {
      // console.log(`Server is closed`);
      server.destroy();
      server.close();
    });
  } catch (e) {
    // console.warn(`try different port: ${port}`);
    runServer(fn);
  }
}

it(`loop test`, async () => {
  await runServer(async (url) => {
    const client = new FetchHttpClient();
    for (let i = 0; i < 200; i++) {
      await client.Get(url);
    }
  });
});

it(`send string body`, async () => {
  await runServer(async (url) => {
    const client = new FetchHttpClient();
    const res = await client.Post(url, "application/test", "Hello World");
    expect(await stream2string(res.Body)).toBe("Hello World");
  });
});

it(`send uint8array body`, async () => {
  await runServer(async (url) => {
    const client = new FetchHttpClient();
    const res = await client.Post(url, "application/test", new TextEncoder().encode("Hello World"));
    expect(await stream2string(res.Body)).toBe("Hello World");
  });
});

it(`send stream body`, async () => {
  await runServer(async (url) => {
    const client = new FetchHttpClient();
    const res = await client.Post(url, "application/test", string2stream("Hello World"));
    expect(await stream2string(res.Body)).toBe("Hello World");
  });
});
