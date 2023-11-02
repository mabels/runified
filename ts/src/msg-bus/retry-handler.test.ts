import amqplib from "amqplib";
import {
  RetryHandler,
  RetryHandlerParams,
  RetryHandlerResult,
  RetryManager,
  RetryStep,
  keyAsString,
  randomDelayStrategy,
} from "./retry-handler";
import { MockLogger } from "@adviser/runified/testutils";
import { createMockPrismaContext } from "../prisma/mockPrisma";
import { Prisma } from "../prisma/client";
import { SystemAbstractionImpl } from "@adviser/runified/utils";
import { TimeMode, IDMode, RandomMode } from "@adviser/runified/types";
import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createRetryStateTransaction(prisma: PrismaClient, sys: SystemAbstractionImpl) {
  prisma.retryStates.create = jest.fn().mockImplementation((msg) => {
    return Promise.resolve(msg.data);
  });
}
it("random delay stategry", () => {
  const sys = new SystemAbstractionImpl({ RandomMode: RandomMode.STEP });
  expect(randomDelayStrategy(0, 2, sys)).toBe(0.5001);
  expect(randomDelayStrategy(8, 2, sys)).toBe(128.0512);
  expect(randomDelayStrategy(8, 2, sys)).toBe(128.0768);
});

it("send defect json undefined", async () => {
  const log = MockLogger();
  const rm = new RetryManager({
    log: log.logger,
  } as RetryHandlerParams);
  const ack = jest.fn();
  const ch = { ack } as unknown as amqplib.Channel;
  await rm.msgHandler(log.logger, ch, { content: Buffer.from("@}{") } as amqplib.ConsumeMessage);
  expect(ack).toBeCalledTimes(1);
  await log.logger.Flush();
  const logs = log.logCollector.Logs();
  expect(logs[0].error).toContain("Unexpected token");
  logs[0].error = "Unexpected token @ in JSON at position 0";
  expect(logs).toEqual([
    {
      error: "Unexpected token @ in JSON at position 0",
      level: "error",
      msg: "channel unknown error",
    },
  ]);
});
it("send defect json null", async () => {
  const log = MockLogger();
  const rm = new RetryManager({
    log: log.logger,
  } as RetryHandlerParams);
  const ack = jest.fn();
  const ch = { ack } as unknown as amqplib.Channel;
  await rm.msgHandler(log.logger, ch, { content: Buffer.from("null") } as amqplib.ConsumeMessage);
  expect(ack).toBeCalledTimes(1);
  expect(log.logCollector.Logs()).toEqual([
    {
      headers: {},
      payload: null,
      module: "RetryManager",
      level: "error",
      msg: "payload not exist",
    },
  ]);
});

function expectFindUnique<T = string>(sys: SystemAbstractionImpl, prisma: PrismaClient, key?: T) {
  if (!key) {
    key = "max" as T;
  }
  const keyStr = keyAsString(key);
  expect(prisma.retryStates.findUnique).toBeCalledTimes(2);
  expect(prisma.retryStates.findUnique.mock.calls[0][0]).toEqual({
    where: {
      handler_key: {
        handler: "wurst",
        key: keyStr,
      },
    },
  });
  expect(prisma.retryStates.findUnique.mock.calls[1][0]).toEqual({
    where: {
      handler_key: {
        handler: "wurst",
        key: keyStr,
      },
      txn: "STEPId-0",
    },
  });
  expect(prisma.retryStates.create).toBeCalledWith({
    data: {
      created_at: sys.Time().Now(),
      handler: "wurst",
      key: keyStr,
      real_key: key,
      state: "new",
      steps: [],
      txn: "STEPId-0",
      updated_at: sys.Time().Now(),
    },
  });
}
it("stop on retryCount", async () => {
  const log = MockLogger();
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const handler = {
    name: "wurst",
    handle: jest.fn(),
    config: {},
  };
  rm.registerHandler(handler);
  const ack = jest.fn();
  const ch = { ack } as unknown as amqplib.Channel;
  await rm.msgHandler(log.logger, ch, {
    content: Buffer.from(JSON.stringify({ handler: "wurst", key: "max" })),
    properties: {
      headers: {
        "x-retry-count": 10,
      },
    } as unknown as amqplib.MessageProperties,
  } as amqplib.ConsumeMessage);
  expect(ack).toBeCalledTimes(1);
  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      headers: {
        "x-retry-count": 10,
      },
      level: "error",
      module: "RetryManager",
      msg: "max retry reached",
      payload: {
        handler: "wurst",
        key: "max",
        txn: "STEPId-0",
      },
      retryCount: 10,
    },
  ]);

  expectFindUnique(sys, pctx.prisma);
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "max",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "error",
      steps: [
        {
          error: { error: "max retry reached" },
          stepAt: sys.Time().Now(),
          value: {
            payload: {
              handler: "wurst",
              key: "max",
              txn: "STEPId-0",
            },
            headers: {
              "x-retry-count": 10,
            },
          },
        } as RetryStep,
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

it("no handler", async () => {
  const log = MockLogger();
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const ch = { ack } as unknown as amqplib.Channel;
  await rm.msgHandler(log.logger, ch, {
    content: Buffer.from(JSON.stringify({ handler: "wurst", key: "max" })),
    properties: {} as unknown as amqplib.MessageProperties,
  } as amqplib.ConsumeMessage);
  expect(ack).toBeCalledTimes(1);
  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      level: "error",
      module: "RetryManager",
      msg: "handler not found",
      payload: {
        handler: "wurst",
        key: "max",
      },
    },
  ]);
  expect(pctx.prisma.retryStates.findUnique).toBeCalledTimes(0);
  expect(pctx.prisma.retryStates.update).toBeCalledTimes(0);
  expect(pctx.prisma.retryStates.create).toBeCalledTimes(0);
});
it("handler ok invalid result", async () => {
  const log = MockLogger();
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const ch = { ack } as unknown as amqplib.Channel;
  const handler = {
    name: "wurst",
    handle: jest.fn(),
    config: {},
  };
  rm.registerHandler(handler);
  const key = { handler: "wurst", key: "max" };
  const msg = {
    content: Buffer.from(JSON.stringify(key)),
    properties: {} as unknown as amqplib.MessageProperties,
  } as amqplib.ConsumeMessage;
  await rm.msgHandler(log.logger, ch, msg);
  expect(ack).toBeCalledTimes(1);
  expect(handler.handle).toBeCalledTimes(1);
  expect(handler.handle.mock.calls[0][0]).toEqual(msg);
  expect(handler.handle.mock.calls[0][1]).toEqual({ ...key, txn: "STEPId-0" });
  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      level: "error",
      msg: "handler result invalid",
      module: "RetryManager",
      payload: {
        handler: "wurst",
        key: "max",
        txn: "STEPId-0",
      },
    },
  ]);
  expectFindUnique(sys, pctx.prisma);
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "max",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "error",
      steps: [
        {
          error: { error: "invalid result" },
          stepAt: sys.Time().Now(),
          value: {
            payload: {
              handler: "wurst",
              key: "max",
              txn: "STEPId-0",
            },
            headers: undefined,
          },
        } as RetryStep,
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

interface MyKey {
  K1: string;
  K2: number;
}

it("handler ok with result", async () => {
  const log = MockLogger();
  log.logger.SetDebug("RetryManager");
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const ch = { ack } as unknown as amqplib.Channel;
  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: (msg, key) => {
      return Promise.resolve({
        ...key,
        retry: false,
      });
    },
    config: {},
  };
  rm.registerHandler(handler);
  const key = { handler: "wurst", key: { K1: "k1", K2: true, K3: "What" } };
  const msg = {
    content: Buffer.from(JSON.stringify(key)),
    properties: {} as unknown as amqplib.MessageProperties,
  } as amqplib.ConsumeMessage;
  await rm.msgHandler(log.logger, ch, msg);
  expect(ack).toBeCalledTimes(1);
  expect(JSON.parse(ack.mock.calls[0][0].content.toString())).toEqual({
    handler: "wurst",
    key: { K1: "k1", K2: true, K3: "What" },
  });
  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      level: "debug",
      module: "RetryManager",
      msg: "handler done",
      payload: {
        handler: "wurst",
        key: { K1: "k1", K2: true, K3: "What" },
        txn: "STEPId-0",
      },
      res: {
        handler: "wurst",
        key: { K1: "k1", K2: true, K3: "What" },
        retry: false,
        txn: "STEPId-0",
      },
      stats: {
        "wurst#": {
          cnt: 1,
          unit: "ns",
          val: 0,
        },
      },
    },
  ]);
  expectFindUnique(sys, pctx.prisma, { K1: "k1", K2: true, K3: "What" });
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "k1|true|What",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "done",
      steps: [
        {
          headers: undefined,
          stats: {
            "wurst#": {
              cnt: 1,
              unit: "ns",
              val: 0,
            },
          },
          stepAt: sys.Time().Now(),
          value: {
            ctx: undefined,
            headers: undefined,
            payload: {
              handler: "wurst",
              key: { K1: "k1", K2: true, K3: "What" },
              next: undefined,
              txn: "STEPId-0",
            },
          },
        },
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

it("handler ok with next", async () => {
  const log = MockLogger();
  log.logger.SetDebug("RetryManager");
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const publish = jest.fn();
  const ch = { ack, publish } as unknown as amqplib.Channel;
  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: (msg, key) => {
      return Promise.resolve({
        ...key,
        retry: false,
        next: { bax: 4711 },
      } as RetryHandlerResult);
    },
    config: {},
  };
  rm.registerHandler(handler);
  const key = { handler: "wurst", key: "max" };
  const msg = {
    content: Buffer.from(JSON.stringify(key)),
    properties: {} as unknown as amqplib.MessageProperties,
  } as amqplib.ConsumeMessage;
  await rm.msgHandler(log.logger, ch, msg);
  expect(ack).toBeCalledTimes(1);
  expect(JSON.parse(ack.mock.calls[0][0].content.toString())).toEqual({ handler: "wurst", key: "max" });
  expect(publish).toBeCalledTimes(1);
  expect(JSON.parse(publish.mock.calls[0][2].toString())).toEqual({
    handler: "wurst",
    key: "max",
    next: { bax: 4711 },
    txn: "STEPId-0",
  });

  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      level: "debug",
      module: "RetryManager",
      msg: "handler done",
      payload: {
        handler: "wurst",
        key: "max",
        next: { bax: 4711 },
        txn: "STEPId-0",
      },
      res: {
        handler: "wurst",
        key: "max",
        retry: false,
        next: { bax: 4711 },
        txn: "STEPId-0",
      },
      stats: {
        "wurst#": {
          cnt: 1,
          unit: "ns",
          val: 0,
        },
      },
    },
  ]);
  expectFindUnique(sys, pctx.prisma);
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "max",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "next",
      steps: [
        {
          stats: {
            "wurst#": {
              cnt: 1,
              unit: "ns",
              val: 0,
            },
          },
          stepAt: sys.Time().Now(),
          value: {
            ctx: undefined,
            payload: {
              handler: "wurst",
              key: "max",
              next: { bax: 4711 },
              txn: "STEPId-0",
            },
            headers: undefined,
          },
        },
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

it("handler retry", async () => {
  const log = MockLogger();
  log.logger.SetDebug("RetryManager");
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const publish = jest.fn();
  const ch = { ack, publish } as unknown as amqplib.Channel;
  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: (msg, key) => {
      return Promise.resolve({
        ...key,
        retry: true,
        next: { bax: 4711 },
      } as RetryHandlerResult);
    },
    config: {},
  };
  rm.registerHandler(handler);
  const key = { handler: "wurst", key: "max" };
  const msg = {
    content: Buffer.from(JSON.stringify(key)),
    properties: {
      headers: {
        test: "test",
        "x-retry-count": 2,
      },
      userId: "userId",
    } as unknown as amqplib.MessageProperties,
  } as amqplib.ConsumeMessage;
  await rm.msgHandler(log.logger, ch, msg);
  expect(ack).toBeCalledTimes(1);
  expect(JSON.parse(ack.mock.calls[0][0].content.toString())).toEqual({ handler: "wurst", key: "max" });
  expect(publish).toBeCalledTimes(1);
  expect(JSON.parse(publish.mock.calls[0][2].toString())).toEqual({
    handler: "wurst",
    key: "max",
    next: { bax: 4711 },
    txn: "STEPId-0",
  });
  expect(publish.mock.calls[0][3]).toEqual({
    headers: {
      test: "test",
      "x-delay": 8000,
      "x-retry-count": 3,
    },
    userId: "userId",
  });

  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      level: "debug",
      module: "RetryManager",
      msg: "handler done",
      headers: {
        test: "test",
        "x-delay": 8000,
        "x-retry-count": 3,
      },
      payload: {
        handler: "wurst",
        key: "max",
        next: { bax: 4711 },
        txn: "STEPId-0",
      },
      res: {
        handler: "wurst",
        key: "max",
        retry: true,
        next: { bax: 4711 },
        txn: "STEPId-0",
      },
      stats: {
        "wurst#": {
          cnt: 1,
          unit: "ns",
          val: 0,
        },
      },
    },
  ]);
  expectFindUnique(sys, pctx.prisma);
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "max",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "retrying",
      steps: [
        {
          stats: {
            "wurst#": {
              cnt: 1,
              unit: "ns",
              val: 0,
            },
          },
          stepAt: sys.Time().Now(),
          value: {
            ctx: undefined,
            headers: {
              test: "test",
              "x-delay": 8000,
              "x-retry-count": 3,
            },
            payload: {
              handler: "wurst",
              key: "max",
              next: { bax: 4711 },
              txn: "STEPId-0",
            },
          },
        } as RetryStep,
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

it("handler exception", async () => {
  const log = MockLogger();
  log.logger.Module("xx").SetDebug("xx");
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const publish = jest.fn();
  const ch = { ack, publish } as unknown as amqplib.Channel;
  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: (msg, key) => {
      throw new Error("wurst");
    },
    config: {},
  };
  rm.registerHandler(handler);
  const key = { handler: "wurst", key: "max" };
  const msg = {
    content: Buffer.from(JSON.stringify(key)),
  } as amqplib.ConsumeMessage;
  await rm.msgHandler(log.logger, ch, msg);
  expect(ack).toBeCalledTimes(1);
  expect(JSON.parse(ack.mock.calls[0][0].content.toString())).toEqual({ handler: "wurst", key: "max" });

  expect(log.logCollector.Logs()).toEqual([
    {
      error: "wurst",
      handler: "wurst",
      level: "error",
      module: "RetryManager",
      headers: {},
      msg: "msg unknown error",
      payload: {
        handler: "wurst",
        key: "max",
        txn: "STEPId-0",
      },
    },
  ]);
  expectFindUnique(sys, pctx.prisma);
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "max",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "error",
      steps: [
        {
          stepAt: sys.Time().Now(),
          error: { error: "wurst" },
          value: {
            headers: {},
            payload: {
              handler: "wurst",
              key: "max",
              txn: "STEPId-0",
            },
          },
        } as RetryStep,
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

it("handler sents error", async () => {
  const log = MockLogger();
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST, IdMode: IDMode.STEP });
  const pctx = createMockPrismaContext();
  createRetryStateTransaction(pctx.prisma, sys);
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  const ack = jest.fn();
  const publish = jest.fn();
  const ch = { ack, publish } as unknown as amqplib.Channel;
  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: (msg, key) => {
      return Promise.resolve({
        error: Error("meno ist doof"),
        ctx: {
          what: 48,
          wunderful: "World",
        },
      } as RetryHandlerResult);
    },
    config: {},
  };
  rm.registerHandler(handler);
  const key = { handler: "wurst", key: { K1: "k1", K2: 4711 } };
  const msg = {
    content: Buffer.from(JSON.stringify(key)),
  } as amqplib.ConsumeMessage;
  await rm.msgHandler(log.logger, ch, msg);
  expect(ack).toBeCalledTimes(1);
  expect(JSON.parse(ack.mock.calls[0][0].content.toString())).toEqual({ handler: "wurst", key: { K1: "k1", K2: 4711 } });

  expect(log.logCollector.Logs()).toEqual([
    {
      handler: "wurst",
      level: "error",
      module: "RetryManager",
      headers: {},

      ctx: {
        what: 48,
        wunderful: "World",
      },
      error: "meno ist doof",

      msg: "handler reports error",
      payload: {
        handler: "wurst",
        key: { K1: "k1", K2: 4711 },
        txn: "STEPId-0",
      },
    },
  ]);
  expectFindUnique(sys, pctx.prisma, { K1: "k1", K2: 4711 });

  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    where: {
      handler_key: {
        handler: "wurst",
        key: "k1|4711",
      },
      txn: "STEPId-0",
    },
    data: {
      state: "error",
      steps: [
        {
          stepAt: sys.Time().Now(),
          error: {
            error: "meno ist doof",
          },
          value: {
            headers: {},
            payload: {
              handler: "wurst",
              key: { K1: "k1", K2: 4711 },
              txn: "STEPId-0",
            },
            ctx: {
              what: 48,
              wunderful: "World",
            },
          },
        } as RetryStep,
      ],
      updated_at: sys.Time().Now(),
    },
  });
});

it("appends to updateState", async () => {
  const log = MockLogger();
  log.logger.Module("xx").SetDebug("xx");
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const pctx = createMockPrismaContext();
  pctx.prisma.retryStates.findUnique.mockResolvedValueOnce({
    created_at: sys.Time().Now(),
    handler: "test",
    key: "test",
    state: "test",
    real_key: { K1: "K1", K3: 461 },
    txn: "txnId",
    steps: [
      {
        stepAt: sys.Time().Now(),
        value: {
          payload: { handler: "test", key: "test" },
          headers: { "x-retry-count": 1 },
        },
      },
    ] as unknown as Prisma.JsonValue,
    updated_at: sys.Time().Now(),
  });
  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);
  await rm.updateState({
    state: "test",
    handler: "test",
    key: "test",
    txn: "txnId",
    steps: [
      {
        stepAt: sys.Time().Now(),
        value: {
          payload: { handler: "test", key: "move", txn: "txnId" },
          headers: { "x-retry-count": 2 },
        },
      },
    ],
    updated_at: sys.Time().Now(),
    created_at: sys.Time().Now(),
  });
  expect(pctx.prisma.retryStates.findUnique).toBeCalledWith({
    where: {
      handler_key: {
        handler: "test",
        key: "test",
      },
      txn: "txnId",
    },
  });
  expect(pctx.prisma.retryStates.update).toBeCalledWith({
    data: {
      state: "test",
      steps: [
        {
          stepAt: sys.Time().Now(),
          value: {
            headers: {
              "x-retry-count": 1,
            },
            payload: {
              handler: "test",
              key: "test",
            },
          },
        },
        {
          stepAt: sys.Time().Now(),
          value: {
            headers: {
              "x-retry-count": 2,
            },
            payload: {
              handler: "test",
              key: "move",
              txn: "txnId",
            },
          },
        },
      ],
      updated_at: sys.Time().Now(),
    },
    where: {
      handler_key: {
        handler: "test",
        key: "test",
      },
      txn: "txnId",
    },
  });
});

type tmpStates = Prisma.PrismaPromise<
  {
    state: string;
    handler: string;
    key: string;
    txn: string;
    real_key: Prisma.JsonValue;
    steps: Prisma.JsonValue;
    updated_at: Date;
    created_at: Date;
  }[]
>;

it("reclaimTest empty", async () => {
  const log = MockLogger();
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const pctx = createMockPrismaContext();

  const ack = jest.fn();
  const publish = jest.fn();
  const ch = { ack, publish } as unknown as amqplib.Channel;

  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);

  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: async (msg, key) => {
      return Promise.resolve({});
    },
    config: {},
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  pctx.prisma.retryStates.findMany.mockImplementationOnce(() => [] as unknown as tmpStates);

  await rm.reclaimByHandler(log.logger, pctx.prisma, handler, ch);

  expect(publish).toBeCalledTimes(0);
});

it("reclaimTest elements", async () => {
  const log = MockLogger();
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const pctx = createMockPrismaContext();

  const ack = jest.fn();
  const publish = jest.fn();
  const ch = { ack, publish } as unknown as amqplib.Channel;

  const rm = new RetryManager({
    log: log.logger,
    prisma: pctx.prisma,
    sys: sys,
  } as unknown as RetryHandlerParams);

  const handler: RetryHandler<MyKey> = {
    name: "wurst",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle: async (msg, key) => {
      return Promise.resolve({});
    },
    config: {},
  };

  const val = [
    {
      state: "murks",
      handler: "wurst",
      key: "hut",
      txn: "hut",
      real_key: "hut",
      steps: [],
      updated_at: sys.Time().Now(),
      created_at: sys.Time().Now(),
    },
    {
      state: "mirks",
      handler: "wurst",
      key: "hut|45",
      txn: "moks",
      real_key: { a: "hut", c: 45 },
      steps: [],
      updated_at: sys.Time().Now(),
      created_at: sys.Time().Now(),
    },
  ];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  pctx.prisma.retryStates.findMany.mockImplementationOnce(() => val as unknown as tmpStates);

  await rm.reclaimByHandler(log.logger, pctx.prisma, handler, ch);

  expect(publish).toBeCalledTimes(2);
  expect(JSON.parse(publish.mock.calls[0][2].toString())).toEqual({
    handler: val[0].handler,
    key: val[0].real_key,
    txn: val[0].txn,
  });
  expect(JSON.parse(publish.mock.calls[1][2].toString())).toEqual({
    handler: val[1].handler,
    key: val[1].real_key,
    txn: val[1].txn,
  });
});
