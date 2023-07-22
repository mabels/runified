import { Logger } from "../logger";
import { CLIConfig } from "./config";
import { SysAbstraction } from "../sys_abstraction";
import { HttpServer } from "../http_server";
import { HTTPHandler } from "../http_handler";

export interface AppParam {
  readonly CLIconfig: CLIConfig;
  readonly Log: Logger;
  readonly Sys?: SysAbstraction;
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
