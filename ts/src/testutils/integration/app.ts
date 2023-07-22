import { App, AppParam } from "../../types/app/app";
import { CLIConfig } from "../../types/app/config";

import { HTTPHandler } from "../../types/http_handler";

import { SystemAbstractionImpl } from "../../utils/system_abstraction";
import { NodeHttpServer } from "../../transport/node_http_server";
import { Api } from "../../types/app/api";
import { WrapApiHandler } from "../../app/api_handler";
import { ApiImpl } from "../../app/api";
import { SysAbstraction } from "../../types/sys_abstraction";
import { RunifiedReq, RunifiedReqFactory } from "../../generated/runified_req";
import { RunifiedRes } from "../../generated/runified_res";
import { RunifiedHandler } from "./runified_handler";
import { Logger } from "../../types/logger";
import { ApiHandlers } from "../../app/app";

export class AppImpl implements App {
  readonly _appParam: AppParam;
  readonly _httpHandler: HTTPHandler;
  readonly _api: Api;
  readonly _sys: SysAbstraction;

  constructor(args: AppParam) {
    this._appParam = args;
    this._sys = args.Sys ?? new SystemAbstractionImpl();
    this._httpHandler = new HTTPHandler({
      HttpServer: args.HttpServer ?? new NodeHttpServer(this._appParam.CLIconfig.Listen),
    });

    this._api = new ApiImpl(this);

    this._httpHandler.RegisterHandler(
      "/runified",
      WrapApiHandler<RunifiedReq, RunifiedRes>(this._api, ApiHandlers(RunifiedHandler), RunifiedReqFactory)
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
