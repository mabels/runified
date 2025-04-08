import { Logger, RuntimeSysAbstraction, } from "@adviser/cement";
import { CLIConfig } from "./config.js";
import { HttpServer } from "../http_server.js";
import { HTTPHandler } from "../http_handler.js";

export interface AppParam {
  readonly CLIconfig: CLIConfig;
  readonly Log: Logger;
  readonly Sys?: RuntimeSysAbstraction;
  readonly HttpServer?: HttpServer;
}

export interface App {
  Log(): Logger;
  CLIConfig(): CLIConfig;
  HTTPHandler(): HTTPHandler;
  Start(): Promise<void>;
  Stop(): Promise<void>;
  Sys(): SysAbstraction;
  // Context() context.Context
}
