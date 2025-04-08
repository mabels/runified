import { FetchHttpClient } from "./fetch_http_client.js";
import { stream2string, string2stream } from "@adviser/cement/utils";
import { NodeHttpServer } from "../transport/node_http_server/index.js";
import { HTTPHandler, HttpRequest, HttpResponseWriter, HttpURL } from "../types/index.js";

async function runServer(fn: (url: string) => Promise<void>): Promise<void> {
  const handler = new HTTPHandler({
    HttpServer: new NodeHttpServer({ Port: 0 }),
  });
  handler.RegisterHandler("/", async (w: HttpResponseWriter, r: HttpRequest) => {
    w.WriteHeader(200);
    await w.Write(await stream2string(r.Body));
    await w.End();
  });

  await handler.Start();
  const srvUrl = HttpURL.parse(`http://dummy`).Ok();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  srvUrl.SetPort(handler.HttpServer().GetListenAddr()!.Port);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  srvUrl.SetHostname(handler.HttpServer().GetListenAddr()!.Addr || "localhost");
  await fn(srvUrl.String());
  await handler.Stop();
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
