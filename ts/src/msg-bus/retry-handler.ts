import { Message, Connection, Channel, ConsumeMessage } from "amqplib";
import { PrismaClient, Prisma } from "../prisma/client";
import { Logger, SysAbstraction } from "@adviser/runified/types";
import { Stats, SystemAbstractionImpl } from "@adviser/runified/utils";
import { sanitizeJson } from "./sanitize-elastic-search";
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

export interface RetryHandler<T> {
  readonly name: string;
  handle(msg: Message, payload: RetryMsg<T>, stat: Stats): Promise<RetryHandlerResult>;
  readonly config: Partial<RetryHandlerConfig>;
}

export interface RetryMsg<T> {
  readonly key: T;
  readonly handler: string;
  readonly next?: unknown;
  readonly txn: string;
}
export interface RetryStep {
  readonly stepAt: Date;
  readonly value: {
    readonly payload: RetryMsg<unknown>;
    readonly headers?: Record<string, unknown>;
    readonly ctx?: unknown;
  };
  readonly error?: {
    readonly error: string;
  };
  readonly stats?: unknown;
}

export interface RetryState {
  readonly state: string; // "fetching" | "retrying" | "done" | "error"
  readonly handler: string;
  readonly key: string;
  readonly txn: string;
  readonly steps: RetryStep[];
  readonly updated_at: Date;
  readonly created_at: Date;
}

export type RetryStatePrisma = RetryState & { readonly steps: Prisma.InputJsonValue };

export interface RetryHandlerParams {
  readonly conn: Connection;
  readonly dataBaseUrl: string;
  readonly instance: string;
  readonly queueName?: string;
  readonly exchangeName?: string;
  readonly prefetch?: number;
  readonly log: Logger;
  readonly retryCount?: number;
  readonly historyLength?: number;
  readonly initialRetryDelay?: number;
  readonly reclaimInterval?: number;
  readonly prisma?: PrismaClient;
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

export class RetryManager {
  readonly conn: Connection;
  readonly instance: string;
  readonly queueName: string;
  readonly exchangeName: string;
  readonly dataBaseUrl: string;
  readonly prefetch: number;
  readonly historyLength: number;
  readonly log: Logger;
  readonly sys: SysAbstraction;
  readonly prisma: PrismaClient;
  readonly reclaimInterval: number;
  readonly handlerConfig: RetryHandlerConfig;

  readonly handlers: Map<string, RetryHandler<unknown>> = new Map();

  _ch?: Channel;

  constructor(param: RetryHandlerParams) {
    this.conn = param.conn;
    let quName = param.queueName;
    let exName = param.exchangeName;
    if (!quName) {
      quName = "retry-queue-" + param.instance;
    }
    if (!exName) {
      exName = "retry-exchange-" + param.instance;
    }
    this.instance = param.instance;
    this.queueName = quName;
    this.exchangeName = exName;
    this.dataBaseUrl = param.dataBaseUrl;
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
    this.prisma = param.prisma || new PrismaClient({ datasourceUrl: this.dataBaseUrl });
  }

  async setQueue() {
    const ch = await this.conn.createChannel();

    await ch.assertExchange(this.exchangeName, "x-delayed-message", {
      arguments: { "x-delayed-type": "direct" },
      durable: true,
    });
    await ch.assertQueue(this.queueName, { durable: true });
    await ch.bindQueue(this.queueName, this.exchangeName, "");
    return ch;
  }

  registerHandler<T>(handler: RetryHandler<T>) {
    this.handlers.set(handler.name, handler);
  }

  async updateState(state: RetryState) {
    return this.prisma.$transaction(async (prisma) => {
      const dbState = await prisma.retryStates.findUnique({
        where: {
          handler_key: {
            key: state.key,
            handler: state.handler,
          },
          txn: state.txn,
        },
      });
      if (dbState) {
        state = {
          ...state,
          steps: [...(dbState.steps as unknown as []), ...state.steps].slice(0, this.historyLength),
        };
      }
      return prisma.retryStates.update({
        where: {
          handler_key: {
            key: state.key,
            handler: state.handler,
          },
          txn: state.txn,
        },
        data: {
          state: state.state,
          steps: state.steps as unknown as Prisma.InputJsonValue,
          updated_at: state.updated_at,
        },
      });
    });
  }

  async ensureRetryState<T>(key: string, msg: RetryMsg<T>): Promise<RetryMsg<T> | undefined> {
    return await this.prisma.$transaction(async (prisma) => {
      let rs = await prisma.retryStates.findUnique({
        where: {
          handler_key: {
            key: key,
            handler: msg.handler,
          },
        },
      });
      if (!rs) {
        const now = this.sys.Time().Now();
        rs = await prisma.retryStates.create({
          data: {
            state: "new",
            handler: msg.handler,
            key: key,
            real_key: msg.key as unknown as Prisma.InputJsonValue,
            txn: this.sys.NextId(),
            steps: [],
            updated_at: now,
            created_at: now,
          },
        });
      }
      if (msg.txn && rs.txn !== msg.txn) {
        return undefined;
      }
      return {
        ...msg,
        txn: rs.txn,
      };
    });
  }

  async msgHandler(log: Logger, ch: Channel, msg: ConsumeMessage) {
    msg.properties = msg.properties || {
      headers: {},
    };
    const now = this.sys.Time().Now();
    let payload: RetryMsg<unknown> | undefined = undefined;
    let key: string | undefined = undefined;
    try {
      const msgContent = msg.content.toString();
      payload = JSON.parse(msgContent) as RetryMsg<unknown>;
      log = this.log.With().Any("payload", payload).Any("headers", msg.properties.headers).Logger();
      if (!payload) {
        log.Error().Msg("payload not exist");
        ch.ack(msg);
        return;
      }

      key = keyAsString(payload.key);

      const handler = this.handlers.get(payload.handler);
      log = log.With().Str("handler", payload.handler).Logger();
      if (!handler) {
        ch.ack(msg);
        log.Error().Msg("handler not found");
        return;
      }
      const txnPayload = await this.ensureRetryState(key, payload);
      if (!txnPayload) {
        ch.ack(msg);
        log.Error().Msg("txn mismatch");
        return;
      }
      payload = txnPayload;
      log = log.With().Any("payload", payload).Logger();

      if (
        msg.properties &&
        msg.properties.headers &&
        msg.properties.headers["x-retry-count"] &&
        msg.properties.headers["x-retry-count"] >= (handler.config.retryCount || this.handlerConfig.retryCount)
      ) {
        ch.ack(msg);
        await this.updateState({
          state: "error",
          handler: payload.handler,
          key: key,
          txn: payload.txn,
          steps: [{ stepAt: now, value: { payload, headers: msg.properties.headers }, error: { error: "max retry reached" } }],
          updated_at: now,
          created_at: now,
        });
        log.Error().Uint64("retryCount", msg.properties.headers["x-retry-count"]).Msg("max retry reached");
        return;
      }
      try {
        const stat = new Stats({
          feature: handler.name,
          sys: this.sys,
        });
        const res = await stat.Action("", async () => {
          return handler.handle(msg, payload!, stat);
        });
        if (typeof res !== "object") {
          ch.ack(msg);
          await this.updateState({
            state: "error",
            handler: payload.handler,
            key: key,
            txn: payload.txn,
            steps: [{ stepAt: now, value: { payload, headers: msg.properties.headers }, error: { error: "invalid result" } }],
            updated_at: now,
            created_at: now,
          });
          log.Error().Msg("handler result invalid");
          return;
        }
        if (res.error) {
          ch.ack(msg);
          await this.updateState({
            state: "error",
            handler: payload.handler,
            key: key,
            txn: payload.txn,
            steps: [
              {
                stepAt: now,
                value: { payload, headers: msg.properties.headers, ctx: walk(res.ctx, sanitizeJson) },
                error: { error: res.error.message },
              },
            ],
            updated_at: now,
            created_at: now,
          });
          log.Error().Err(res.error).Any("ctx", res.ctx).Msg("handler reports error");
          return;
        }
        let state = "done";
        payload = { ...payload, next: res.next };
        log = log.With().Any("payload", payload).Logger();
        if (res.retry) {
          const retryCount = (msg.properties.headers["x-retry-count"] || 0) + 1;
          (msg.properties.headers["x-delay"] =
            1000 * this.handlerConfig.delayStrategy(retryCount, this.handlerConfig.initialRetryDelay, this.sys)),
            (msg.properties.headers["x-retry-count"] = retryCount);
          ch.publish(this.exchangeName, "", Buffer.from(JSON.stringify(payload)), msg.properties);
          state = "retrying";
        } else if (res.next) {
          ch.publish(this.exchangeName, "", Buffer.from(JSON.stringify(payload)), msg.properties);
          state = "next";
        }
        await this.updateState({
          state,
          handler: payload.handler,
          key: key,
          txn: payload.txn,
          steps: [{ stepAt: now, value: { payload, headers: msg.properties.headers, ctx: res.ctx }, stats: stat.RenderCurrent() }],
          updated_at: now,
          created_at: now,
        });
        ch.ack(msg);
        log.Debug().Any("stats", stat.RenderCurrent()).Any("res", res).Msg("handler done");
      } catch (e) {
        ch.ack(msg);
        await this.updateState({
          state: "error",
          handler: payload.handler,
          key: key,
          txn: payload.txn,
          steps: [{ stepAt: now, value: { payload, headers: msg.properties.headers }, error: { error: (e as Error).message } }],
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
      if (payload && key) {
        await this.updateState({
          state: "error",
          handler: payload.handler,
          key: key,
          txn: payload.txn,
          steps: [{ stepAt: now, value: { payload, headers: msg.properties.headers }, error: { error: (e as Error).message } }],
          updated_at: now,
          created_at: now,
        });
      }
      ch.ack(msg);
      log
        .Error()
        .Err(e as Error)
        .Msg("channel unknown error");
      return;
    }
  }

  async reclaimByHandler(log: Logger, prisma: PrismaClient, handle: RetryHandler<unknown>, ch: Channel) {
    const now = this.sys.Time().Now();
    const toReclaim = await prisma.retryStates.findMany({
      where: {
        AND: [
          {
            handler: handle.name,
          },
          {
            OR: [
              {
                state: "done",
                updated_at: {
                  lt: new Date(now.getTime() - (handle.config.refreshInterval || this.handlerConfig.refreshInterval)),
                },
              },
              {
                state: "error",
                updated_at: {
                  lt: new Date(now.getTime() - (handle.config.errorRetryInterval || this.handlerConfig.errorRetryInterval)),
                },
              },
              {
                state: {
                  notIn: ["done", "error"],
                },
                updated_at: {
                  lt: new Date(now.getTime() - (handle.config.restartInterval || this.handlerConfig.restartInterval)),
                },
              },
            ],
          },
        ],
      },
    });
    for (const claim of toReclaim) {
      await prisma.retryStates.update({
        where: {
          handler_key: {
            handler: claim.handler,
            key: claim.key,
          },
        },
        data: {
          state: "reclaim",
          updated_at: now,
        },
      });
      this.retrySend(ch)(handle, claim.real_key, claim.txn);
      log.Debug().Any("claim", claim).Msg("restarted");
    }
  }

  async reclaim(ch: Channel) {
    const log = this.log.With().Str("action", "reclaim").Logger();
    log.Info().Msg("start");
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const stat = new Stats("reclaim");
      let prisma: PrismaClient | undefined = undefined;
      try {
        prisma = new PrismaClient({ datasourceUrl: this.dataBaseUrl });

        for (const handle of this.handlers.values()) {
          await stat.Action(handle.name, async () => {
            await this.reclaimByHandler(log, prisma!, handle, ch);
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
      prisma && prisma?.$disconnect();
      await new Promise((resolve) => setTimeout(resolve, this.reclaimInterval));
    }
  }

  async consumer(ch: Channel) {
    try {
      ch.prefetch(this.prefetch);
      const log = this.log.With().Str("action", "consumer").Logger();
      log.Info().Msg("start");
      await ch.consume(this.queueName, async (msg) => {
        if (!msg) {
          return;
        }
        this.msgHandler(log, ch, msg);
      });
    } catch (e) {
      this.log
        .Error()
        .Err(e as Error)
        .Msg("consume error");
    }
  }

  retrySend<T>(ch?: Channel): RetrySend<T> {
    return (handler, key, txn) => {
      ch = ch || this._ch;
      if (!ch) {
        throw Error("Need a channel");
      }
      ch.publish(
        this.exchangeName,
        "",
        Buffer.from(
          JSON.stringify({
            key: key,
            handler: handler.name,
            txn: txn,
          } as RetryMsg<unknown>),
        ),
      );
    };
  }

  async start() {
    this._ch = await this.setQueue();
    return Promise.all([this.consumer(this._ch), this.reclaim(this._ch)]);
  }
}

export type RetrySend<T> = (h: RetryHandler<T>, key: T, txn?: string) => void;
