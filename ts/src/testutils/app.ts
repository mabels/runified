import { App, CLIConfig } from "../types/app/index.js";
import { HTTPHandler } from "../types/index.js";
import { Logger, MockLogger, RuntimeSysAbstraction } from "@adviser/cement";
import { NodeSysAbstraction } from "@adviser/cement/node";

interface MockAppParams {
  readonly CliConfig: CLIConfig;
  readonly Log?: Logger;
  readonly Sys?: RuntimeSysAbstraction;
}

export class MockApp implements App {
  readonly _cliConfig: CLIConfig;
  readonly _log: Logger;
  readonly _sys: RuntimeSysAbstraction;

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
