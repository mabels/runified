import path from "path";
import { App } from "../../types/app/app";
import { FromCommandLine } from "../../app/cli_config";
import { AppImpl } from "./app";
import { SystemAbstractionImpl } from "../../utils/system_abstraction";
import { Logger } from "../../types/logger";
import { string2stream } from "../../utils/string2steam";
import { HttpClientImpl } from "../../utils/http_client";
import { DefaultHttpRequest } from "../../types/http_request";
import { SDKClient } from "../../sdk/sdk";
import { RunifiedReq, RunifiedReqFactory } from "../../generated/runified_req";
import { RunifiedRes, RunifiedResFactory } from "../../generated/runified_res";
import { postWithRequestContext } from "../../sdk/request_context";
import { MockLogger } from "../logger";
import { stream2string } from "../../utils/stream2string";
import { ErrorFactory } from "../../generated/error";
import { SysAbstraction, TimeMode } from "../../types/sys_abstraction";
import { globalToLocalBaseUrl } from "../base_url";
import { HttpHeader } from "../../types/http_header";

async function startApp(sys: SysAbstraction, fn: (baseUrl: string, app: App, logCollector: Logger) => Promise<void>) {
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
  const sys = new SystemAbstractionImpl({
    TimeMode: TimeMode.STEP,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await startApp(sys, async (baseUrl: string, app: App, log: Logger) => {
    // console.log("baseUrl", baseUrl)
    const uri = path.join(baseUrl, "/runified");
    const hc = new HttpClientImpl();
    const hq = DefaultHttpRequest({
      Method: "POST",
      URL: uri,
      Header: HttpHeader.from({ "X-Connection": "close" }),
      Body: string2stream(Array(1000).fill("a").join("")),
    });
    const res = await hc.Do(hq);
    expect(res.StatusCode).toBe(500);
    const body = await stream2string(res.Body);
    const resObj = ErrorFactory.Builder().Coerce(JSON.parse(body));
    expect(resObj.is_err()).toBe(false);
    expect(resObj.unwrap().message).toBe("Unexpected token a in JSON at position 0");
  });
});

it("TestRunified", async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sys = new SystemAbstractionImpl({
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
    const rctx = await postWithRequestContext<RunifiedReq, RunifiedRes>(
      sdk,
      "/runified",
      RunifiedReqFactory,
      RunifiedResFactory,
      reqVal
    );
    expect(rctx.Response.Value).toEqual(
      RunifiedResFactory.Builder()
        .Coerce({
          ...obj,
          createdAt: new Date("2021-01-31T23:00:04.000Z"),
        })
        .unwrap()
    );
  });
});
