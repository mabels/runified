import { MsgBus, MsgBusConsumeParams, MsgBusDriver, MsgConsumeFn } from "./msg-bus";
import { QMessage } from "../types/queue";

export class MockMsgBufDriver implements MsgBusDriver {
    readonly mocks = {
        init: jest.fn(),
        onStart: jest.fn(),
        onStop: jest.fn(),
        publish: jest.fn(),
        consume: jest.fn(),
        consumedMsg: jest.fn(),
        ack: jest.fn(),
    };

    readonly qs = new Map<string, MsgConsumeFn>();

    consumedMsg(my: MsgBus, msg: QMessage): QMessage {
        this.mocks.consumedMsg(my, msg);
        return msg;
    }
    stopConsuming: () => void = () => { };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onStart(my: MsgBus): Promise<void> {
        this.mocks.onStart(my);
        return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    init(my: MsgBus): void {
        this.mocks.init(my);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onStop(my: MsgBus): Promise<void> {
        this.mocks.onStop(my);
        this.stopConsuming();
        return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    publish(my: MsgBus, exchange: string, routingKey: string, msg: Uint8Array): Promise<void> {
        this.mocks.publish(exchange, routingKey, msg);
        const q = this.qs.get(exchange);
        if (q) {
            q({ content: msg })
        }
        return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    consume(my: MsgBus, c: MsgBusConsumeParams, fn: MsgConsumeFn): Promise<void> {
        this.mocks.consume(my, c, fn);
        this.qs.set(c.qname, fn);
        return new Promise((resolve) => {
            this.stopConsuming = resolve;
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ack(my: MsgBus, msg: QMessage): void {
        this.mocks.ack(my, msg);
    }
}