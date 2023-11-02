
export interface QConnection {
    createChannel(): Promise<QChannel>;
}

export interface QMessage {
    content: Uint8Array;
    properties?: {
        headers?: Record<string, string>;
    }
}

export interface QConsumeOptions {
}

export interface QChannel {
    close(): Promise<void>;
    publish(exchange: string, routingKey: string, msg: Buffer): void|Promise<void>;
    consume(queue: string, handler: (msg: QMessage) => void|Promise<void>, options?: QConsumeOptions): Promise<void>;
    ack(msg: QMessage): void;
    nack(msg: QMessage): void;
}