import { Logger } from "@adviser/runified/types";
import amqplib from "amqplib";
import { Result } from "wueste/result";
import { Payload, WuestenFactory, WuestenReflectionObject } from "wueste/wueste";

export interface MsgBusParams {
  readonly conn: amqplib.Connection;
  readonly log: Logger;
  readonly exchangeName?: string;
}

export interface MsgBusConsumer<T, I, G> {
  readonly name: string;
  readonly prefetch?: number;
  readonly factory: WuestenFactory<T, I, G>;
  handler(msg: T): Promise<void>;
}

const txtEncoder = new TextEncoder();
export class MsgBus {
  readonly conn: amqplib.Connection;
  readonly log: Logger;
  readonly exchangeName: string;

  channel?: amqplib.Channel;

  constructor(params: MsgBusParams) {
    this.conn = params.conn;
    this.log = params.log.With().Module("msg-bus").Logger();
    this.exchangeName = params.exchangeName || "msg-bus";
  }

  async start(): Promise<MsgBus> {
    this.channel = await this.conn.createChannel();
    await this.channel.assertExchange(this.exchangeName, "direct", { durable: false });
    return this;
  }

  async stop() {
    if (!this.channel) {
      throw Error("channel not initialized");
    }
    await this.channel.close();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(rmsg: Result<Payload>) {
    if (!this.channel) {
      throw Error("channel not initialized");
    }
    if (rmsg.is_err()) {
      throw rmsg.unwrap_err();
    }
    const jsonStr = JSON.stringify(rmsg.unwrap());
    this.log.Debug().Str("component", "send").Str("routingKey", rmsg.unwrap().Type).Any("payload", rmsg.unwrap().Data).Msg("send");
    this.channel.publish(this.exchangeName, rmsg.unwrap().Type, Buffer.from(txtEncoder.encode(jsonStr)));
  }

  async consumer<T, I, G>(c: MsgBusConsumer<T, I, G>) {
    if (!this.channel) {
      throw Error("channel not initialized");
    }
    const log = this.log.With().Str("component", "consumer").Str("name", c.name).Logger();
    const qname = `${this.exchangeName}-${c.name}`;
    await this.channel.assertQueue(qname, { durable: true });
    const rtk = (c.factory.Schema() as WuestenReflectionObject).id!;
    await this.channel.bindQueue(qname, this.exchangeName, rtk);

    log.Debug().Str("queueName", qname).Str("exchangeName", this.exchangeName).Str("routingKey", rtk).Msg("consumer start");
    this.channel.prefetch(c.prefetch || 1);
    this.channel.consume(qname, (msg) => {
      if (!msg) {
        return;
      }
      try {
        const r = c.factory.FromPayload(JSON.parse(msg.content.toString()));
        if (r.is_err()) {
          log.Error().Err(r.unwrap_err()).Msg("coerce");
          this.channel!.ack(msg);
          return;
        }
        log.Debug().Any("payload", r.unwrap()).Msg("pass to handler");
        c.handler(r.unwrap());
        this.channel!.ack(msg);
      } catch (e) {
        this.channel!.ack(msg);
        log
          .Error()
          .Err(e as Error)
          .Msg("msg-bus");
      }
    });
  }
}
