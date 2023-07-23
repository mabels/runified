import { App } from "@adviser/runified/types/app";
import { FromCommandLine } from "@adviser/runified/app";
import { HttpHeader, Logger } from "@adviser/runified/types";
import { AppImpl } from "@adviser/runified/testutils/integration/app";
import { globalToLocalBaseUrl } from "@adviser/runified/testutils";
import { LoggerImpl } from "@adviser/runified/utils";
import { RunifiedReqFactory, RunifiedReq } from "@adviser/runified/generated/runified_req";
import { RunifiedResFactory, RunifiedRes } from "@adviser/runified/generated/runified_res";
import { SDKClient, postWithRequestContext } from "@adviser/runified/sdk";

async function startApp(fn: (baseUrl: string, app: App, logCollector: Logger) => Promise<void>) {
  const log = new LoggerImpl();
  const cliCFG = FromCommandLine(["", "--listen-port", "0"]);
  const app = new AppImpl({ Log: log, CLIconfig: cliCFG });
  await app.Start();
  const localAdr = app.HTTPHandler().HttpServer().GetListenAddr();
  if (!localAdr) {
    throw new Error("no listen address");
  }
  await fn(globalToLocalBaseUrl(localAdr), app, log);
  await app.Stop();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
startApp(async (baseUrl: string, app: App, log: Logger) => {
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
    DefaultRequestHeaders: HttpHeader.from({ "X-Connection": "close" }),
  });
  const rctx = await postWithRequestContext<RunifiedReq, RunifiedRes>(
    sdk,
    "/runified",
    RunifiedReqFactory,
    RunifiedResFactory,
    reqVal
  );
  if (rctx.Response.Value.collectionAddress != "collectionAddress") {
    throw new Error("not ready for production");
  }
})
  .then(() => {
    console.log("Ready for production");
  })
  .catch((err) => {
    console.error(err);
  });
