import path from "node:path";
import { App } from "../../types/app";
import { FromCommandLine } from "../../app";
import { FetchHttpClient } from "../../utils";
import { DefaultHttpRequest } from "../../types";
import { SDKClient, postWithRequestContext } from "../../sdk";
import { RunifiedReq, RunifiedReqFactory } from "../../generated/runifiedreq";
import { RunifiedRes, RunifiedResFactory } from "../../generated/runifiedres";
import { Logger, MockLogger, SysAbstraction, TimeMode } from "@adviser/cement";
import { NodeSysAbstraction } from "@adviser/cement/node";
import { ErrorFactory } from "../../generated/error";
import { globalToLocalBaseUrl } from "../global-to-local-base-url";
import { HttpHeader } from "../../types/http_header";
import { AppImpl } from "./appimpl";
import { stream2string, string2stream } from "@adviser/cement/utils";

async function startApp(
  sys: SysAbstraction,
  fn: (baseUrl: string, app: App, logCollector: Logger) => Promise<void>,
): Promise<void> {
  const { logger: log } = MockLogger();
  const cliCFG = FromCommandLine(["", "--listen-port", "0"]);
  const app = new AppImpl({ Log: log, CLIconfig: cliCFG, Sys: sys });
  await app.Start();
  const localAdr = app.HTTPHandler().HttpServer().GetListenAddr();
  if (!localAdr) {
    throw new Error("no listen address");
  }
  await fn(globalToLocalBaseUrl(localAdr), app, log);
  await app.Stop();
}

it("TestRunifiedGetMethod()", async () => {
  const sys = NodeSysAbstraction({
    TimeMode: TimeMode.STEP,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await startApp(sys, async (baseUrl: string, app: App, log: Logger) => {
    // console.log("baseUrl", baseUrl)
    const uri = path.join(baseUrl, "/runified");
    const hc = new FetchHttpClient();
    const hq = DefaultHttpRequest({
      Method: "POST",
      URL: uri,
      Header: HttpHeader.from({ "X-Connection": "close" }),
      Body: string2stream(Array(1000).fill("a").join("")),
    });
    const res = await hc.Do(hq);
    expect(res.StatusCode).toBe(500);
    const body = await stream2string(res.Body);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const resObj = ErrorFactory.Builder().Coerce(JSON.parse(body));
    expect(resObj.is_err()).toBe(false);
    expect(resObj.unwrap().message).toContain("is not valid JSON");
  });
});

it("TestRunified", async () => {
  const sys = NodeSysAbstraction({
    TimeMode: TimeMode.STEP,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await startApp(sys, async (baseUrl: string, app: App, log: Logger) => {
    const obj = {
      collectionAddress: "collectionAddress",
      contract: "contract",
      id: "id",
      price: {
        amount: {
          raw: 4711.11,
        },
      },
      source: {
        name: "uri",
      },
      tokenId: "tokenId",
    };
    const reqVal = RunifiedReqFactory.Builder().Coerce(obj).unwrap();

    const sdk = new SDKClient({
      BaseUrl: baseUrl,
      Sys: sys,
      DefaultRequestHeaders: HttpHeader.from({ "X-Connection": "close" }),
    });
    const rctx = await postWithRequestContext<RunifiedReq, unknown, unknown, RunifiedRes, unknown, unknown>(
      sdk,
      "/runified",
      RunifiedReqFactory,
      RunifiedResFactory,
      reqVal,
    );
    const mySys = NodeSysAbstraction({ TimeMode: TimeMode.STEP });
    for (let i = 0; i < 3; i++) {
      mySys.Time().Now();
    }
    expect(rctx.Response.Value).toEqual(
      RunifiedResFactory.Builder()
        .Coerce({
          ...obj,
          createdAt: mySys.Time().Now().toISOString(),
        })
        .unwrap(),
    );
  });
});
