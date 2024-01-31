import { App } from "@adviser/runified/types/app";
import { FromCommandLine } from "@adviser/runified/app";
import { HttpHeader, } from "@adviser/runified/types";
import { AppImpl } from "@adviser/runified/testutils/integration/appimpl";
import { globalToLocalBaseUrl } from "@adviser/runified/testutils";
import { RunifiedReqFactory, RunifiedReq } from "@adviser/runified/generated/runifiedreq";
import { RunifiedResFactory, RunifiedRes } from "@adviser/runified/generated/runifiedres";
import { SDKClient, postWithRequestContext } from "@adviser/runified/sdk";
import { Logger, LoggerImpl } from "@adviser/cement";

async function startApp(fn: (baseUrl: string, app: App, logCollector: Logger) => Promise<void>) {
  const log = new LoggerImpl();
  log.SetDebug("appimpl", "MockApiHandler", "sdk", "api-/runified");
  const cliCFG = FromCommandLine(["", "--listen-port", "0"]);
  const app = new AppImpl({ Log: log, CLIconfig: cliCFG });
  await app.Start();
  const localAdr = app.HTTPHandler().HttpServer().GetListenAddr();
  if (!localAdr) {
    throw new Error("no listen address");
  } else {
    log.Info().Any("listen", localAdr).Msg();
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
    Logger: log,
    BaseUrl: baseUrl,
    DefaultRequestHeaders: HttpHeader.from({ "X-Connection": "close" }),
  });
  const rctx = await postWithRequestContext<RunifiedReq, unknown, unknown, RunifiedRes, unknown, unknown>(
    sdk,
    "/runified",
    RunifiedReqFactory,
    RunifiedResFactory,
    reqVal,
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
