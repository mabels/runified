import { v4 } from "uuid";
import { Logger, SysAbstraction, WithLogger } from "../types";
import { SystemAbstractionImpl } from "./system_abstraction";

const encoder = new TextEncoder();

type JsonRecord = Record<string, string | number | boolean | unknown>;

export interface LoggerImplParams {
  readonly out?: WritableStream<Uint8Array>;
  readonly sys?: SysAbstraction;
  readonly withAttributes?: JsonRecord;
}
export class LoggerImpl implements Logger {
  readonly _out: WritableStream<Uint8Array>;
  readonly _sys: SysAbstraction;
  readonly _attributes: JsonRecord = {};
  readonly _withAttributes: JsonRecord;
  readonly _toFlush: Map<string, Promise<void>> = new Map();

  constructor(params?: LoggerImplParams) {
    if (!params) {
      params = {};
    }
    if (!params.sys) {
      this._sys = new SystemAbstractionImpl();
    } else {
      this._sys = params.sys;
    }
    if (!params.out) {
      this._out = this._sys.Stdout();
    } else {
      this._out = params.out;
    }
    if (!params.withAttributes) {
      this._withAttributes = {};
    } else {
      this._withAttributes = { ...params.withAttributes };
    }
    this._attributes = { ...this._withAttributes };
  }
  Timestamp(): Logger {
    this._attributes["ts"] = this._sys.Time().Now().toISOString();
    return this;
  }
  Error(): Logger {
    this._attributes["level"] = "error";
    return this;
  }
  Err(err: Error): Logger {
    this._attributes["error"] = err.message;
    return this;
  }
  Str(key: string, value: string): Logger {
    this._attributes[key] = value;
    return this;
  }
  Info(): Logger {
    this._attributes["level"] = "info";
    return this;
  }
  Any(key: string, value: string | number | boolean | JsonRecord): Logger {
    this._attributes[key] = value;
    return this;
  }
  Dur(key: string, nsec: number): Logger {
    this._attributes[key] = nsec;
    return this;
  }
  Uint64(key: string, value: number): Logger {
    this._attributes[key] = value;
    return this;
  }

  async Flush(): Promise<void> {
    await Promise.all(this._toFlush.values());
    return Promise.resolve();
  }

  With(): WithLogger {
    return new WithLoggerBuilder(
      new LoggerImpl({
        out: this._out,
        sys: this._sys,
        withAttributes: { ...this._withAttributes },
      })
    );
  }

  Msg(...args: string[]): void {
    this._attributes["msg"] = args.join(" ");
    const writer = this._out.getWriter();
    if (this._attributes["ts"] === "ETERNITY") {
      this.Timestamp();
    }
    const encoded = encoder.encode(JSON.stringify(this._attributes) + "\n");
    Object.keys(this._attributes).forEach((key) => {
      delete this._attributes[key];
    });
    Object.assign(this._attributes, this._withAttributes);
    //this._attributes = { ...this._withAttributes };
    writer.ready
      .then(() => {
        const my = writer.write(encoded);
        const myId = v4();
        this._toFlush.set(myId, my);
        my.finally(() => {
          this._toFlush.delete(myId);
        });
      })
      .catch((err) => {
        console.log("Chunk error:", err);
      });
  }
}

class WithLoggerBuilder implements WithLogger {
  readonly _li: LoggerImpl;
  constructor(li: LoggerImpl) {
    this._li = li;
  }
  Logger(): Logger {
    Object.assign(this._li._withAttributes, this._li._attributes);
    return this._li;
  }
  Str(key: string, value: string): WithLogger {
    this._li.Str(key, value);
    return this;
  }

  Error(): WithLogger {
    this._li.Error();
    return this;
  }
  Err(err: Error): WithLogger {
    this._li.Err(err);
    return this;
  }
  Info(): WithLogger {
    this._li.Info();
    return this;
  }
  Timestamp(): WithLogger {
    this._li._attributes["ts"] = "ETERNITY";
    return this;
  }
  Any(key: string, value: JsonRecord): WithLogger {
    this._li.Any(key, value);
    return this;
  }
  Dur(key: string, nsec: number): WithLogger {
    this._li.Dur(key, nsec);
    return this;
  }
  Uint64(key: string, value: number): WithLogger {
    this._li.Uint64(key, value);
    return this;
  }
}
