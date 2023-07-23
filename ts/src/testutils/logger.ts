import { Logger, SysAbstraction } from "../types";
import { LoggerImpl } from "../utils";
import { LogCollector } from "./log_collector";

export interface MockLoggerReturn {
  readonly logger: Logger;
  readonly logCollector: LogCollector;
}

export function MockLogger(params?: { sys?: SysAbstraction }): MockLoggerReturn {
  const lc = new LogCollector();
  return {
    logCollector: lc,
    logger: new LoggerImpl({ out: lc, sys: params?.sys }),
  };
}
