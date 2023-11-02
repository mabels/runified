import { Result } from "wueste/result";
import { RetryMsg } from "../generated/retrymsg";
import { RetryState, RetryStateFactory } from "../generated/retrystate";
import { Logger, SysAbstraction } from "../types";
import { QMessage } from "../types/queue";
import { Stats, SystemAbstractionImpl } from "../utils";
import { walk } from "wueste/helper";

export interface RetryHandlerResult {
  readonly retry?: boolean;
  readonly next?: unknown;
  readonly error?: Error;
  readonly ctx?: unknown;
}

export interface RetryHandlerConfig {
  readonly refreshInterval: number;
  readonly errorRetryInterval: number;
  readonly restartInterval: number;
  readonly retryCount: number;
  readonly delayStrategy: (delay: number, prevDelay: number, sys: SysAbstraction) => number;
  readonly initialRetryDelay: number;
}

export interface RetryHandler {
  readonly name: string;
  handle(msg: QMessage, payload: RetryState, stat: Stats): Promise<RetryHandlerResult>;
  readonly config: Partial<RetryHandlerConfig>;
}

export interface RetryHandlerParams {
  readonly driver: RetryDriver;
  readonly instance: string;
  readonly prefetch?: number;
  readonly log: Logger;
  readonly retryCount?: number;
  readonly historyLength?: number;
  readonly initialRetryDelay?: number;
  readonly reclaimInterval?: number;
  readonly handlerConfig?: Partial<RetryHandlerConfig>;
  readonly sys?: SysAbstraction;
}

export function randomDelayStrategy(step: number, initial: number, sys: SysAbstraction): number {
  const prev = initial ** (step - 1);
  const variance = prev * 2;
  return prev + sys.Random0ToValue(variance);
}

export function keyAsString(unk: unknown): string {
  switch (typeof unk) {
    case "boolean":
      return unk ? "true" : "false";
    case "number":
      return "" + unk;
    case "string":
      return unk;
    case "object":
      if (Array.isArray(unk)) {
        return unk.map((i) => keyAsString(i)).join("|");
      } else if (unk === null) {
        return "";
      } else {
        const keys = Object.keys(unk).sort();
        return keys
          .reduce((acc, key) => {
            const val = keyAsString((unk as Record<string, unknown>)[key]);
            acc.push(val);
            return acc;
          }, [] as string[])
          .join("|");
      }
    default:
      throw Error("unknown type:" + typeof unk);
  }
}

export interface RetryDriver {
  init(my: RetryManager): void
  updateState(state: RetryState): Promise<void>
  ensureRetryState(key: string, msg: RetryState): Promise<RetryState | undefined>
  startConsumer(my: RetryManager, msg: (msg: QMessage, rs: RetryState)=> Promise<void>): Promise<void>
  // return list of to be reclaimed
  reclaimByHandler(my: RetryManager, log: Logger , handle: RetryHandler): Promise<RetryState[]>
  msgPublishRetry(my: RetryManager, rs: RetryState|Result<RetryState>): Promise<void>
  msgAck(my: RetryManager, msg: QMessage): void|Promise<void>
}

export class RetryManager {
  readonly instance: string;
  readonly prefetch: number;
  readonly historyLength: number;
  readonly log: Logger;
  readonly sys: SysAbstraction;
  readonly reclaimInterval: number;
  readonly handlerConfig: RetryHandlerConfig;

  readonly handlers: Map<string, RetryHandler> = new Map();

  readonly _driver: RetryDriver

  constructor(param: RetryHandlerParams) {
    this.instance = param.instance;
    this.prefetch = param.prefetch || 4;
    this.log = param.log.With().Module("RetryManager").Str("instance", param.instance).Logger();
    this.historyLength = param.historyLength || 10;
    this.sys = param.sys || new SystemAbstractionImpl();
    this.reclaimInterval = param.reclaimInterval || 1000 * 60;
    const handlerConfig = param.handlerConfig || ({} as Partial<RetryHandlerConfig>);
    this.handlerConfig = {
      refreshInterval: handlerConfig.refreshInterval || 7 * 24 * 60 * 60 * 1000,
      errorRetryInterval: handlerConfig.errorRetryInterval || 24 * 60 * 60 * 1000,
      restartInterval: handlerConfig.restartInterval || 4 * 60 * 60 * 1000,
      retryCount: handlerConfig.retryCount || 3,
      initialRetryDelay: param.initialRetryDelay || 2,
      delayStrategy: handlerConfig.delayStrategy || ((step, initial) => initial ** step),
    };
    this._driver = param.driver;
    this._driver.init(this)
  }

  registerHandler(handler: RetryHandler) {
    this.handlers.set(handler.name, handler);
  }

  // async updateState(state: RetryState) {
  //   return this._driver.updateState(state)
  // }

  async ensureRetryState(key: string, msg: RetryState): Promise<RetryState | undefined> {
    return this._driver.ensureRetryState(key, msg)
  }

  async msgHandler(msg: QMessage, rs: RetryState) {
    msg.properties = msg.properties || {
      headers: {},
    };
    let log = this.log.With().Any("payload", rs).Any("headers", msg.properties.headers).Logger();
    const now = this.sys.Time().Now();
    let key: string | undefined = undefined;
    try {
      key = keyAsString(rs.key);

      const handler = this.handlers.get(rs.handler);
      log = log.With().Str("handler", rs.handler).Logger();
      if (!handler) {
        this._driver.msgAck(this, msg);
        log.Error().Msg("handler not found");
        return;
      }
      const txnPayload = await this.ensureRetryState(key, rs);
      if (!txnPayload) {
        this._driver.msgAck(this, msg);
        log.Error().Msg("txn mismatch");
        return;
      }
      rs = txnPayload;
      log = log.With().Any("payload", rs).Logger();

      if (txnPayload.retry_count >= this.handlerConfig.retryCount) {
        this._driver.msgAck(this, msg);
        this._driver.updateState({
          state: "error",
          handler: rs.handler,
          key: key,
          txn: rs.txn,
          steps: [{ stepAt: now, value: { payload: rs, headers: msg.properties.headers }, error: { error: "max retry reached" } }],
          updated_at: now,
          created_at: now,
        });
        log.Error().Uint64("retryCount", txnPayload.retry_count).Msg("max retry reached");
        return;
      }
      try {
        const stat = new Stats({
          feature: handler.name,
          sys: this.sys,
        });
        const res = await stat.Action("", async () => {
          return handler.handle(msg, rs, stat);
        });
        if (typeof res !== "object") {
          this._driver.msgAck(this, msg);
          await this._driver.updateState({
            state: "error",
            handler: rs.handler,
            key: key,
            txn: rs.txn,
            steps: [{ stepAt: now, value: { payload: rs, headers: msg.properties.headers }, error: { error: "invalid result" } }],
            updated_at: now,
            created_at: now,
          });
          log.Error().Msg("handler result invalid");
          return;
        }
        if (res.error) {
          this._driver.msgAck(this,msg);
          await this._driver.updateState({
            state: "error",
            handler: rs.handler,
            key: key,
            txn: rs.txn,
            steps: [
              {
                stepAt: now,
                value: { payload: rs, headers: msg.properties.headers, ctx: res.ctx },
                error: { error: res.error.message },
              },
            ],
            updated_at: now,
            created_at: now,
          });
          log.Error().Err(res.error).Any("ctx", res.ctx).Msg("handler reports error");
          return;
        }
        // rs = { ...rs, next: res.next };
        log = log.With().Any("payload", rs).Logger();
        const builder = RetryStateFactory.Builder();
        builder.Coerce(rs);
        builder.state("done");
        if (res.retry) {
          builder.retry_count(rs.retry_count + 1);
          builder.delay(this.handlerConfig.delayStrategy(rs.retry_count, this.handlerConfig.initialRetryDelay, this.sys))
          builder.state("retrying");
          this._driver.msgPublishRetry(this, builder.Get());
        } else if (res.next) {
          builder.state("next");
          builder.next(res.next);
          this._driver.msgPublishRetry(this, builder.Get());
        }

        await this._driver.updateState({
          state,
          handler: rs.handler,
          key: key,
          txn: rs.txn,
          steps: [{ stepAt: now, value: { payload: rs, headers: msg.properties.headers, ctx: res.ctx }, stats: stat.RenderCurrent() }],
          updated_at: now,
          created_at: now,
        });
        this._driver.msgAck(this, msg);
        log.Debug().Any("stats", stat.RenderCurrent()).Any("res", res).Msg("handler done");
      } catch (e) {
        this._driver.msgAck(this, msg);
        await this._driver.updateState({
          state: "error",
          handler: rs.handler,
          key: key,
          txn: rs.txn,
          steps: [{ stepAt: now, value: { payload: rs, headers: msg.properties.headers }, error: { error: (e as Error).message } }],
          updated_at: now,
          created_at: now,
        });
        log
          .Error()
          .Err(e as Error)
          .Msg("msg unknown error");
        return;
      }
    } catch (e) {
      if (rs && key) {
        await this._driver.updateState({
          state: "error",
          handler: rs.handler,
          key: key,
          txn: rs.txn,
          steps: [{ stepAt: now, value: { payload: rs, headers: msg.properties.headers }, error: { error: (e as Error).message } }],
          updated_at: now,
          created_at: now,
        });
      }
      this._driver.msgAck(this,msg);
      log
        .Error()
        .Err(e as Error)
        .Msg("channel unknown error");
      return;
    }
  }

  async reclaimByHandler(log: Logger, handle: RetryHandler) {
    const reclaims = await this._driver.reclaimByHandler(this, log, handle)
    for (const claim of reclaims) {
      log.Debug().Any("claim", claim).Msg("restarted");
      this._driver.msgPublishRetry(this, handle, claim.real_key, claim.txn);
    }
  }

  async reclaim() {
    const log = this.log.With().Str("action", "reclaim").Logger();
    log.Info().Msg("start");
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const stat = new Stats("reclaim");
      try {
        for (const handle of this.handlers.values()) {
          await stat.Action(handle.name, async () => {
            await this._driver.reclaimByHandler(this,log, handle);
          });
        }
        log.Info().Any("stats", stat.RenderCurrent()).Msg("reclaimed");
      } catch (e) {
        log
          .Error()
          .Any("stats", stat.RenderCurrent())
          .Err(e as Error)
          .Msg("reclaimed failed");
      }
      await new Promise((resolve) => setTimeout(resolve, this.reclaimInterval));
    }
  }

  async start() {
    return Promise.all([this._driver.startConsumer(this, this.msgHandler.bind(this)), this.reclaim()]);
  }
}

export type RetrySend<T> = (h: RetryHandler, key: T, txn?: string) => void;

