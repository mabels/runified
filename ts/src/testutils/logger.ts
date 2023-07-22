import { Logger as LoggerIf } from "../types/logger";
import { SysAbstraction } from "../types/sys_abstraction";
import { LoggerImpl } from "../utils/logger";
import { LogCollector } from "./log_collector";

export interface MockLoggerReturn {
  readonly logger: LoggerIf;
  readonly logCollector: LogCollector;
}

export function MockLogger(params?: { sys?: SysAbstraction }): MockLoggerReturn {
  const lc = new LogCollector();
  return {
    logCollector: lc,
    logger: new LoggerImpl({ out: lc, sys: params?.sys }),
  };
}
