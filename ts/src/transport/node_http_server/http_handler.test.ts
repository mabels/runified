// TODO rename to http_handler_test.go

import { HTTPHandler, HttpRequest, HttpResponseWriter } from "../../types";
import { NodeHttpServer } from ".";
import { describe, expect, it } from "@jest/globals";
import { FetchHttpClient } from "../../utils";
import { HttpURL } from "../../types/http_url";
import { stream2string, string2stream } from "@adviser/cement/utils";
describe("HTTPHandler", () => {
  it("StartStop", async () => {
    const hp = new HTTPHandler({
      HttpServer: new NodeHttpServer({ Port: 0 }),
    });
    for (let i = 0; i < 10; i++) {
      await hp.Start();
      expect(hp.HttpServer().GetListenAddr()?.Port).toBeGreaterThan(1023);
      await hp.Stop();
    }
  });

  interface invokeItem {
    readonly w: HttpResponseWriter;
    readonly r: HttpRequest;
  }

  it("Complete", async () => {
    // expect.assertions(1);
    // test requests responses
    const hp = new HTTPHandler({
      HttpServer: new NodeHttpServer({ Port: 0 }),
    });
    const invokedHandler: invokeItem[] = [];

    const res = hp.RegisterHandler("/hi", async (w: HttpResponseWriter, r: HttpRequest) => {
      invokedHandler.push({
        w: w,
        r: r,
      });
      w.Header().Set("connection", "close");
      w.WriteHeader(242);
      const query: Record<string, string[]> = {};
      for (const [key, value] of r.URL.Query().Entries()) {
        const vs = [value];
        if (!query[key]) {
          query[key] = [];
        }
        query[key].push(...vs);
      }
      await w.Write(
        JSON.stringify({
          url: r.URL.String(),
          query: query,
          header: r.Header.AsRecordStringStringArray(),
          body: await stream2string(r.Body),
        }),
      );
      return Promise.resolve();
    });
    expect(res.is_ok()).toBeTruthy();
    await hp.Start().then(async () => {
      // console.log("started");
      const hc = new FetchHttpClient();
      try {
        const loops = 3;
        const srvAddr = hp.HttpServer().GetListenAddr();
        // console.log(srvAddr);
        const rurl = HttpURL.parse("http://dummy");
        const url = rurl.Ok();
        url.SetHostname(srvAddr?.Addr || "127.0.0.1");
        url.SetPort(srvAddr!.Port);
        url.SetPath("/hi");
        for (let i = 0; i < loops; i++) {
          url.Query().Set("i", `${i}`);
          const getRes = await hc.Get(url.String());
          expect(getRes.StatusCode).toBe(242);
          expect(getRes.Header?.Get("connection")).toEqual("close");
          expect(JSON.parse(await stream2string(getRes.Body))).toStrictEqual({
            body: "",
            header: {
              accept: ["*/*"],
              "accept-encoding": ["gzip, deflate"],
              "accept-language": ["*"],
              connection: ["keep-alive"],
              host: [url.Host],
              "sec-fetch-mode": ["cors"],
              "user-agent": ["runified/1.0.0"],
            },
            query: { i: [`${i}`] },
            url: url.String(),
          });

          const postRes = await hc.Post(url.String(), "application/json", string2stream(`Hi: ${i}`));
          expect(postRes.StatusCode).toBe(242);
          expect(postRes.Header?.Get("connection")).toEqual("close");
          expect(JSON.parse(await stream2string(postRes.Body))).toStrictEqual({
            body: `Hi: ${i}`,
            header: {
              accept: ["*/*"],
              "accept-encoding": ["gzip, deflate"],
              "accept-language": ["*"],
              "content-type": [`application/json`],
              connection: ["keep-alive"],
              host: [url.Host],
              "sec-fetch-mode": ["cors"],
              "transfer-encoding": ["chunked"],
              "user-agent": ["runified/1.0.0"],
            },
            query: { i: [`${i}`] },
            url: url.String(),
          });
        }
      } catch (err) {
        return Promise.reject(err);
      } finally {
        // hc.Abort();
        await hp.Stop();
      }
      return Promise.resolve();
    });
  });
});
