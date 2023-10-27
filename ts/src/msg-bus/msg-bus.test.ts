import { MockLogger } from "@adviser/runified/testutils";
import { MsgBus, MsgBusConsumer } from "./msg-bus";
import amqplib from "amqplib";
import dotenv from "dotenv";
import {
  OpenSeaGetNFTV2Container$OpenSeaNFTV2,
  OpenSeaGetNFTV2Container$OpenSeaNFTV2CoerceType,
  OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory,
  OpenSeaGetNFTV2Container$OpenSeaNFTV2Object,
} from "../types/generated/openseagetnftv2container$openseanftv2";
import { SystemAbstractionImpl } from "@adviser/runified/utils";
import { TimeMode } from "@adviser/runified/types";
import { OpenSeaGetNFTV2ContainerFactory } from "../types/generated/openseagetnftv2container";

dotenv.config();
it("start-msg-bus", async () => {
  const log = MockLogger();
  const assertExchange = jest.fn();
  const close = jest.fn();
  const conn = {
    createChannel: jest.fn().mockReturnValue({
      close,
      assertExchange,
    }),
  };
  const mb = new MsgBus({
    conn: conn as unknown as amqplib.Connection,
    log: log.logger,
  });
  await mb.start();

  await mb.stop();

  expect(close).toBeCalledTimes(1);
  expect(assertExchange).toBeCalledWith("msg-bus", "direct", { durable: false });
});

it("send-msg-bus", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const log = MockLogger({ sys });
  const conn = {};
  const mb = new MsgBus({
    conn: conn as unknown as amqplib.Connection,
    log: log.logger,
  });
  const publish = jest.fn();
  mb.channel = {
    publish,
  } as unknown as amqplib.Channel;
  // await mb.start();

  const myBuilder = OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory.Builder();
  myBuilder.Coerce({
    identifier: "identifier",
    collection: "collection",
    contract: "contract",
    token_standard: "token_standard",
    name: "name",
    description: "description",
    created_at: sys.Time().Now().toISOString(),
    updated_at: sys.Time().Now().toISOString(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mb.send(OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory.ToPayload(myBuilder.Get()));

  expect(publish.mock.calls[0][0]).toEqual("msg-bus");
  expect(publish.mock.calls[0][1]).toEqual("OpenSeaNFTV2");
  expect(JSON.parse(publish.mock.calls[0][2].toString())).toEqual({
    Data: {
      collection: "collection",
      contract: "contract",
      created_at: sys.Time().Now().toISOString(),
      description: "description",
      identifier: "identifier",
      name: "name",
      token_standard: "token_standard",
      updated_at: sys.Time().Now().toISOString(),
    },
    Type: "OpenSeaNFTV2",
  });
});

it("consume-msg-bus", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const log = MockLogger({ sys });
  const conn = {};
  const mb = new MsgBus({
    conn: conn as unknown as amqplib.Connection,
    log: log.logger,
  });
  const assertQueue = jest.fn();
  const bindQueue = jest.fn();
  const prefetch = jest.fn();
  const consume = jest.fn();
  const ack = jest.fn();
  mb.channel = {
    assertQueue,
    bindQueue,
    prefetch,
    consume,
    ack,
  } as unknown as amqplib.Channel;
  // await mb.start();

  const handler = jest.fn();
  const myC: MsgBusConsumer<
    OpenSeaGetNFTV2Container$OpenSeaNFTV2,
    OpenSeaGetNFTV2Container$OpenSeaNFTV2CoerceType,
    OpenSeaGetNFTV2Container$OpenSeaNFTV2Object
  > = {
    name: "test",
    prefetch: 9,
    factory: OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory,
    handler,
  };
  await mb.consumer(myC);

  expect(assertQueue.mock.calls[0][0]).toEqual("msg-bus-test");
  expect(assertQueue.mock.calls[0][1]).toEqual({ durable: true });
  expect(bindQueue.mock.calls[0][0]).toEqual("msg-bus-test");
  expect(bindQueue.mock.calls[0][1]).toEqual("msg-bus");
  expect(prefetch.mock.calls[0][0]).toEqual(9);
  expect(consume.mock.calls[0][0]).toEqual("msg-bus-test");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mb.channel.publish = (qn: string, rt: string, msg: Buffer, opt) => {
    expect(qn).toEqual("msg-bus");
    expect(rt).toEqual("OpenSeaNFTV2");
    consume.mock.calls[0][1]({
      content: msg,
      fields: {} as unknown as amqplib.MessageFields,
      properties: {
        headers: {
          Type: "OpenSeaNFTV2",
        },
      } as unknown as amqplib.Options.Publish,
    } as amqplib.ConsumeMessage);
    return true;
  };

  const myBuilder = OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory.Builder();
  const ref = myBuilder.Coerce({
    identifier: "identifier",
    collection: "collection",
    contract: "contract",
    token_standard: "token_standard",
    name: "name",
    description: "description",
    created_at: sys.Time().Now().toISOString(),
    updated_at: sys.Time().Now().toISOString(),
  });

  await mb.send(OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory.ToPayload(myBuilder.Get()));
  await log.logger.Flush();

  expect(log.logCollector.Logs()).toEqual([]);

  expect(ack).toBeCalledTimes(1);

  expect(handler.mock.calls[0][0]).toEqual(ref.unwrap());
});

it("consume-msg-bus-defect", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const log = MockLogger({ sys });
  const conn = {};
  const mb = new MsgBus({
    conn: conn as unknown as amqplib.Connection,
    log: log.logger,
  });
  const assertQueue = jest.fn();
  const bindQueue = jest.fn();
  const prefetch = jest.fn();
  const consume = jest.fn();
  const ack = jest.fn();
  mb.channel = {
    assertQueue,
    bindQueue,
    prefetch,
    consume,
    ack,
  } as unknown as amqplib.Channel;
  // await mb.start();

  const handler = jest.fn();
  const myC: MsgBusConsumer<
    OpenSeaGetNFTV2Container$OpenSeaNFTV2,
    OpenSeaGetNFTV2Container$OpenSeaNFTV2CoerceType,
    OpenSeaGetNFTV2Container$OpenSeaNFTV2Object
  > = {
    name: "test",
    prefetch: 9,
    factory: OpenSeaGetNFTV2Container$OpenSeaNFTV2Factory,
    handler,
  };
  await mb.consumer(myC);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mb.channel.publish = (qn: string, rt: string, msg: Buffer, opt) => {
    expect(qn).toEqual("msg-bus");
    expect(rt).toEqual("OpenSeaGetNFTV2Container");
    consume.mock.calls[0][1]({
      content: msg,
      fields: {} as unknown as amqplib.MessageFields,
      properties: {
        headers: {
          Type: "OpenSeaNFTV2",
        },
      } as unknown as amqplib.Options.Publish,
    } as amqplib.ConsumeMessage);
    return true;
  };

  const myBuilder = OpenSeaGetNFTV2ContainerFactory.Builder();
  myBuilder.Coerce({
    nft: {
      identifier: "identifier",
      collection: "collection",
      contract: "contract",
      token_standard: "token_standard",
      name: "name",
      description: "description",
      created_at: sys.Time().Now().toISOString(),
      updated_at: sys.Time().Now().toISOString(),
    },
  });

  await mb.send(OpenSeaGetNFTV2ContainerFactory.ToPayload(myBuilder.Get()));
  await log.logger.Flush();

  expect(ack).toBeCalledTimes(1);

  expect(log.logCollector.Logs()).toEqual([
    {
      error:
        "WuestePayload Type mismatch:[OpenSeaGetNFTV2Container$OpenSeaNFTV2,OpenSeaNFTV2,OpenSeaNFTV2] != OpenSeaGetNFTV2Container",
      level: "error",
      module: "msg-bus",
      component: "consumer",
      msg: "coerce",
      name: "test",
    },
  ]);
});
