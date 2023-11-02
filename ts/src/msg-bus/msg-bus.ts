import { Logger } from "../types";
import { Result } from "wueste/result";
import { WuestePayload, WuestenFactory, WuestenReflectionObject } from "wueste/wueste";
import { QMessage } from "../types/queue";

export interface MsgBusParams {
  readonly log: Logger;
  readonly publishQName?: string;
  readonly driver: MsgBusDriver;
}

export interface MsgBusConsumer<T, I, G> {
  readonly consumeQName: string;
  readonly skipAutoAck?: boolean;
  readonly prefetch?: number;
  readonly factory: WuestenFactory<T, I, G>;
  handler(msg: QMessage, t: T): Promise<void>;
}

const txtEncoder = new TextEncoder();
const txtDecoder = new TextDecoder();

export interface MsgBusConsumeParams {
  readonly qname: string;
  readonly consumerConcurrency: number;
}
export type MsgConsumeFn = (msg: QMessage) => void | Promise<void>;

export interface MsgBusDriver {
  onStart(my: MsgBus): Promise<void>;
  init(my: MsgBus): void; // to set up the logger
  onStop(my: MsgBus): Promise<void>;
  publish(my: MsgBus, exchange: string, routingKey: string, msg: Uint8Array): void|Promise<void>;
  consume(my: MsgBus, c: MsgBusConsumeParams, fn: MsgConsumeFn): Promise<void>;
  readonly consumedMsg?: (my: MsgBus, msg: QMessage) => QMessage;
  ack(my: MsgBus, msg: QMessage): void|Promise<void>;
}
export class MsgBus {
  readonly log: Logger;
  readonly _publishQName: string;
  readonly _driver: MsgBusDriver;

  constructor(params: MsgBusParams) {
    this.log = params.log.With().Module("msg-bus").Logger();
    this._publishQName = params.publishQName || "msg-bus";
    this._driver = params.driver;
    this._driver.init(this)
  }

  async start(): Promise<MsgBus> {
    await this._driver.onStart(this)
    return this;
  }

  async stop() {
    await this._driver.onStop(this)
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(rmsg: Result<WuestePayload>) {
    if (rmsg.is_err()) {
      throw rmsg.unwrap_err();
    }
    const jsonStr = JSON.stringify(rmsg.unwrap());
    this.log.Debug().Str("component", "send").Str("routingKey", rmsg.unwrap().Type).Any("payload", rmsg.unwrap().Data).Msg("send");
    return this._driver.publish(this, this._publishQName, rmsg.unwrap().Type, txtEncoder.encode(jsonStr));
  }

  async consumer<T, I, G>(c: MsgBusConsumer<T, I, G>) {
    const log = this.log.With().Str("component", "consumer").Str("name", c.consumeQName).Logger();
    const qname = c.consumeQName
    const rtk = (c.factory.Schema() as WuestenReflectionObject).id!;
    log.Debug().Str("queueName", qname).Str("exchangeName", this._publishQName).Str("routingKey", rtk).Msg("consumer start");
    this._driver.consume(this, {
      qname,
      consumerConcurrency: c.prefetch || 1,
    }, (msg) => {
      if (!msg) {
        return;
      }
      msg = this._driver.consumedMsg ? this._driver.consumedMsg(this, msg) : msg;
      try {
        const r = c.factory.FromPayload(JSON.parse(txtDecoder.decode(msg.content)));
        if (r.is_err()) {
          log.Error().Err(r.unwrap_err()).Msg("coerce");
          this._driver.ack(this, msg);
          return;
        }
        log.Debug().Any("payload", r.unwrap()).Msg("pass to handler");
        c.handler(msg, r.unwrap());
        !c.skipAutoAck && this._driver.ack(this, msg);
      } catch (e) {
        !c.skipAutoAck && this._driver.ack(this, msg);
        log
          .Error()
          .Err(e as Error)
          .Msg("msg-bus");
      }
    });
  }
}
