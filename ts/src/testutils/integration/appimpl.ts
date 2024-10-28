import { Api, App, AppParam, CLIConfig } from "../../types/app";
import { HTTPHandler } from "../../types";
import { NodeHttpServer } from "../../transport/node_http_server";
import { ApiImpl, WrapApiHandler } from "../../app";
import { RunifiedReqFactory, RunifiedReqFactoryImpl } from "../../generated/runifiedreq";
import { RunifiedResFactoryImpl } from "../../generated/runifiedres";
import { RunifiedHandler } from "./runified_handler";
import { ApiHandlers } from "../../app/app";
import { Logger, SysAbstraction } from "@adviser/cement";
import { NodeSysAbstraction } from "@adviser/cement/node";

export class AppImpl implements App {
  readonly _appParam: AppParam;
  readonly _httpHandler: HTTPHandler;
  readonly _api: Api;
  readonly _sys: SysAbstraction;

  constructor(args: AppParam) {
    this._appParam = {
      ...args,
      Log: args.Log.With().Timestamp().Module("appimpl").Logger(),
    };
    this._sys = args.Sys ?? NodeSysAbstraction();
    this._httpHandler = new HTTPHandler({
      HttpServer: args.HttpServer ?? new NodeHttpServer(this._appParam.CLIconfig.Listen),
    });

    this._api = new ApiImpl(this);

    this._appParam.Log.Debug().Str("handler", "/runified").Msg("Registering handlers");
    this._httpHandler.RegisterHandler(
      "/runified",
      WrapApiHandler<RunifiedReqFactoryImpl, RunifiedResFactoryImpl>(this._api, ApiHandlers(RunifiedHandler), RunifiedReqFactory),
    );
  }

  Sys(): SysAbstraction {
    return this._sys;
  }
  HTTPHandler(): HTTPHandler {
    return this._httpHandler;
  }

  CLIConfig(): CLIConfig {
    return this._appParam.CLIconfig;
  }

  Log(): Logger {
    return this._appParam.Log;
  }

  Start(): Promise<void> {
    return this._httpHandler.Start();
  }
  Stop(): Promise<void> {
    return this._httpHandler.Stop();
  }
}
