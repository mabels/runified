import { MockLogger } from "../testutils";
import { MsgBus, MsgBusConsumer } from "./msg-bus";
import { SystemAbstractionImpl } from "../utils";
import { TimeMode } from "../types";
import { MockMsgBufDriver } from "./mock-msg-driver";
import { RunifiedReq, RunifiedReqCoerceType, RunifiedReqFactory, RunifiedReqObject } from "../generated/runifiedreq";
import { walk } from "wueste/helper";

const ficture: RunifiedReq = {
  id: "id",
  contract: "contract",
  collectionAddress: "collectionAddress",
  price: {
    amount: { "raw": "raw" }
  },
  tokenId: "tokenId",
  source: {
    name: "name",
  }
}

it("start-msg-bus", async () => {
  const log = MockLogger();
  const driver = new MockMsgBufDriver();
  const mb = new MsgBus({
    driver: driver,
    log: log.logger,
  });
  await mb.start();

  await mb.stop();

  expect(driver.mocks.init).toBeCalledTimes(1);
  expect(driver.mocks.onStop).toBeCalledTimes(1);
  expect(driver.mocks.onStart).toBeCalledTimes(1);
});

const decoder = new TextDecoder();
it("send-msg-bus", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const log = MockLogger({ sys });
  const driver = new MockMsgBufDriver();
  const mb = new MsgBus({
    driver: driver,
    log: log.logger,
  });

  const myBuilder = RunifiedReqFactory.Builder();
  myBuilder.Coerce(ficture);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mb.send(RunifiedReqFactory.ToPayload(myBuilder.Get()));

  expect(driver.mocks.publish.mock.calls[0][0]).toEqual("msg-bus");
  expect(driver.mocks.publish.mock.calls[0][1]).toEqual("RunifiedReq");
  expect(JSON.parse(decoder.decode(driver.mocks.publish.mock.calls[0][2]))).toEqual({
    Data: ficture,
    Type: "RunifiedReq",
  });
});

function decodeUint8Array(a: unknown): unknown {
  const isTypedArray = (function() {
    const TypedArray = Object.getPrototypeOf(Uint8Array);
    return (obj: unknown) => obj instanceof TypedArray;
  })();
  return walk(a, (v) => {
    // console.log("decode", typeof v, isTypedArray(v))
    if (isTypedArray(v)) {
      return JSON.parse((new TextDecoder()).decode(v as Uint8Array));
    }
    return v
  })
}

it("consume-msg-bus", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const log = MockLogger({ sys });
  const driver = new MockMsgBufDriver();
  const mb = new MsgBus({
    driver,
    publishQName: "msg-bus-test",
    log: log.logger,
  });

  const handler = jest.fn();
  const myC: MsgBusConsumer<RunifiedReq, RunifiedReqCoerceType, RunifiedReqObject> = {
    consumeQName: "msg-bus-test",
    prefetch: 9,
    factory: RunifiedReqFactory,
    handler,
  };
  mb.consumer(myC).catch((e) => {
    throw e;
  });

  expect(driver.mocks.consume.mock.calls[0][1]).toEqual({ "consumerConcurrency": 9, "qname": "msg-bus-test" })

  await mb.send(RunifiedReqFactory.ToPayload(ficture));
  await log.logger.Flush();

  expect(log.logCollector.Logs()).toEqual([]);

  expect(driver.mocks.consumedMsg).toBeCalledTimes(1);
  expect(driver.mocks.ack).toBeCalledTimes(1);

  expect(decodeUint8Array(handler.mock.calls)).toEqual([[{
    content: {
      Data: ficture,
      Type: "RunifiedReq",
    }},
    ficture
  ]])

  expect(decodeUint8Array(driver.mocks.publish.mock.calls)).toEqual([
    [
      "msg-bus-test",
      "RunifiedReq",
      {
        Type: "RunifiedReq",
        Data: ficture,
      },
    ],
  ]);
});

it("consume-msg-bus-defect", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.CONST });
  const log = MockLogger({ sys });

  const driver = new MockMsgBufDriver();
  const mb = new MsgBus({
    driver,
    publishQName: "msg-bus-test",
    log: log.logger,
  });

  const handler = jest.fn();
  const myC: MsgBusConsumer<
    RunifiedReq,
    RunifiedReqCoerceType,
    RunifiedReqObject
  > = {
    consumeQName: "msg-bus-test",
    prefetch: 9,
    factory: RunifiedReqFactory,
    handler,
  };
  await mb.consumer(myC);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const myBuilder = RunifiedReqFactory.Builder();
  myBuilder.Coerce({...ficture,
    id: undefined
  });

  await expect(mb.send(RunifiedReqFactory.ToPayload(myBuilder.Get()))).rejects.toThrowError("Attribute[RunifiedReq.id] is required")
  await log.logger.Flush();


  expect(driver.mocks.consumedMsg).toBeCalledTimes(0);
  expect(driver.mocks.publish).toBeCalledTimes(0);
  expect(driver.mocks.ack).toBeCalledTimes(0);

  expect(log.logCollector.Logs()).toEqual([]);

});
