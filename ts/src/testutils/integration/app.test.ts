import { MockLogger, MockLoggerReturn, TimeMode, TimeUnits } from "@adviser/cement";
import { NodeSysAbstraction } from "@adviser/cement/node";
import { AppHandler } from "../../types/app";
import { FetchHttpClient } from "../../utils";

import { AppImpl } from "./appimpl";
import { FromCommandLine } from "../../app";
import { describe, expect, it } from "@jest/globals";
import { DefaultHttpRequest, HttpHeader } from "../../types";
import { globalToLocalBaseUrl } from "../global-to-local-base-url";
import { BindAppToHandler } from "../../app/app";
import { stream2string, string2stream } from "@adviser/cement/utils";

describe("App", () => {
  const cliCFG = FromCommandLine(["", "--listen-port", "0"]);
  it("start and stop the app", async () => {
    const { logCollector, logger: log }: MockLoggerReturn = MockLogger();
    const app = new AppImpl({
      Log: log,
      CLIconfig: cliCFG,
      Sys: NodeSysAbstraction({
        TimeMode: TimeMode.STEP,
      }),
    });

    app.HTTPHandler().RegisterHandler(
      "/test",
      BindAppToHandler(app, async (app: AppHandler) => {
        const r = app.Request();
        const w = app.Response();
        const res = await stream2string(r.Body);
        expect(res).toBe("hi");
        w.Header().Set("Connection", "close");
        w.Header().Set("X-Request-ID", r.Header.Get("X-Request-ID")! + "-test");
        w.Header().Set("Content-Type", "application/json");
        w.Header().Set("X-Test", "test");
        w.Write("Ho");
        w.End();
        return Promise.resolve(true);
      }),
    );

    expect(app.Log()).toBeTruthy();
    expect(app.CLIConfig()).toBe(cliCFG);

    await app.Start();
    const hc = new FetchHttpClient();

    const postBody = "hi";
    const url = globalToLocalBaseUrl(app.HTTPHandler().HttpServer().GetListenAddr(), "/test");
    const hq = DefaultHttpRequest({
      Method: "POST",
      URL: url,
      Body: string2stream(postBody),
      Header: HttpHeader.from({
        "Content-Type": "application/json",
        "X-Request-ID": "1234",
      }),
    });
    const res = await hc.Do(hq);

    expect(res.StatusCode).toBe(200);
    expect(res.Header?.Get("X-Request-ID")).toBe("1234-test");
    expect(res.Header?.Get("X-Test")).toBe("test");
    const logs = logCollector.Logs();
    expect(logs.length).toBe(1);
    expect(logs[0]["rid"]).toBe(hq.Header.Get("X-Request-ID")!);
    expect(logs[0]["path"]).toBe("/test");
    expect(logs[0]["level"]).toBe("info");
    expect(logs[0]["duration"]).toBe(`${1 * TimeUnits.Second}ms`);
    const body = await stream2string(res.Body);
    expect(body).toBe("Ho");

    expect(logs[0]["responseLength"]).toBeGreaterThan(body.length);
    // requestHeaderByteLength test
    expect(logs[0]["requestLength"]).toBeGreaterThan(0);
    expect(logs[0]["rid"]).toBe("1234");
    await app.Stop();
  });
});
