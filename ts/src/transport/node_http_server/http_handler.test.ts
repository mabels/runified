// TODO rename to http_handler_test.go

import { HTTPHandler, HttpRequest, HttpResponseWriter } from "../../types";
import { NodeHttpServer } from ".";
import { describe, expect, it } from "@jest/globals";
import { HttpClientImpl, stream2string, string2stream } from "../../utils";
describe("HTTPHandler", () => {
  it("StartStop", async () => {
    const hp = new HTTPHandler({
      HttpServer: new NodeHttpServer({ Port: 8087 }),
    });
    for (let i = 0; i < 2; i++) {
      await new Promise((resolve, reject) => {
        hp.Start()
          .then(async () => {
            try {
              expect(await hp.Stop()).toBeFalsy();
              resolve(undefined);
            } catch (err) {
              reject(err);
            }
          })
          .catch((err) => {
            expect(err).toBeNull();
          });
      });
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
      HttpServer: new NodeHttpServer({ Port: 8087 }),
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
      for (const [key, value] of r.URL.Query().entries()) {
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
        })
      );
      return Promise.resolve();
    });
    expect(res.is_ok()).toBeTruthy();
    await hp.Start().then(async () => {
      // console.log("started");
      const hc = new HttpClientImpl();
      try {
        const loops = 3;
        for (let i = 0; i < loops; i++) {
          const getRes = await hc.Get(`http://127.0.0.1:8087/hi?i=${i}`);
          expect(getRes.StatusCode).toBe(242);
          expect(getRes.Header?.Get("connection")).toEqual("close");
          expect(JSON.parse(await stream2string(getRes.Body))).toStrictEqual({
            body: "",
            header: {
              accept: ["*/*"],
              "accept-encoding": ["gzip, deflate"],
              "accept-language": ["*"],
              connection: ["keep-alive"],
              host: ["127.0.0.1:8087"],
              "sec-fetch-mode": ["cors"],
              "user-agent": ["runified/1.0.0"],
            },
            query: { i: [`${i}`] },
            url: `http://127.0.0.1:8087/hi?i=${i}`,
          });

          const postRes = await hc.Post(`http://127.0.0.1:8087/hi?i=${i}`, "application/json", string2stream(`Hi: ${i}`));
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
              host: ["127.0.0.1:8087"],
              "sec-fetch-mode": ["cors"],
              "transfer-encoding": ["chunked"],
              "user-agent": ["runified/1.0.0"],
            },
            query: { i: [`${i}`] },
            url: `http://127.0.0.1:8087/hi?i=${i}`,
          });
        }
      } catch (err) {
        return Promise.reject(err);
      } finally {
        hc.Abort();
        await hp.Stop();
      }
      return Promise.resolve();
    });
  });
});
