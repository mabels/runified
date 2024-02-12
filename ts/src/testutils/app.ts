import { App, CLIConfig } from "../types/app";
import { HTTPHandler } from "../types";
import { Logger, MockLogger, NodeSysAbstraction, SysAbstraction } from "@adviser/cement";

interface MockAppParams {
  readonly CliConfig: CLIConfig;
  readonly Log?: Logger;
  readonly Sys?: SysAbstraction;
}

export class MockApp implements App {
  readonly _cliConfig: CLIConfig;
  readonly _log: Logger;
  readonly _sys: SysAbstraction;

  constructor(params: MockAppParams) {
    this._cliConfig = params.CliConfig;
    this._sys = NodeSysAbstraction({ TimeMode: params.CliConfig.TimeMode });
    this._log = params.Log || MockLogger().logger;
  }

  HTTPHandler(): HTTPHandler {
    throw new Error("Method not implemented.");
  }

  CLIConfig(): CLIConfig {
    return this._cliConfig;
  }

  Log(): Logger {
    return this._log;
  }

  Sys(): SysAbstraction {
    return this._sys;
  }

  Start(): Promise<void> {
    return Promise.resolve();
  }

  Stop(): Promise<void> {
    return Promise.resolve();
  }
}
