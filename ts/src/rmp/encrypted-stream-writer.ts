import { FrameMetrics, FrameProcessor } from "./frame-processor";
import net from "node:net";
import crypto from "node:crypto";
import { base64EncArr, readerLoop } from "./utils";
import { HttpHeader } from "../types";

export interface CrypterParam {
  readonly key: Uint8Array;
  readonly cipherStr?: crypto.CipherCCMTypes;
  readonly iv?: Uint8Array;
}

export interface ResponseStreamParam {
  readonly endpointUrl: string;
  readonly crypto: CrypterParam;
  readonly response: Response;
  readonly frameProcessor?: FrameProcessor;
}

export interface Result {
  readonly totalTime: number;
  readonly connectionEstablish: number;
  readonly metrics: FrameMetrics;
}

class CrypterBase {
  readonly key: crypto.CipherKey;
  readonly iv: Uint8Array;
  readonly cipherStr: string;
  constructor(deen: CrypterParam) {
    this.key = deen.key;
    this.iv = deen.iv || crypto.randomBytes(12);
    this.cipherStr = deen.cipherStr || "chacha20-poly1305";
  }
}

export class Crypter extends CrypterBase {
  readonly cipher: crypto.CipherGCM;
  constructor(crypter: CrypterParam) {
    super(crypter);
    this.cipher = crypto.createCipheriv(this.cipherStr as crypto.CipherCCMTypes, this.key, this.iv, {
      authTagLength: 16,
    });
  }

  encrypt(data: Uint8Array | string): Uint8Array {
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    }
    return this.cipher.update(data);
  }
  final(): Uint8Array {
    return this.cipher.final();
  }
}

export class DeCrypter extends CrypterBase {
  readonly decipher: crypto.DecipherGCM;
  constructor(crypter: CrypterParam) {
    super(crypter);
    this.decipher = crypto.createDecipheriv(this.cipherStr as crypto.CipherCCMTypes, this.key, this.iv, {
      authTagLength: 16,
    });
  }

  decrypt(data: Uint8Array): Uint8Array {
    return this.decipher.update(data);
  }
  final(): Uint8Array {
    return this.decipher.final();
  }
  //   decipher.setAuthTag(
  //     Buffer.from(data.substring(24, 56), 'hex')
  //   ),
  //   decrypted = [
  //     decipher.update(
  //       Buffer.from(data.substring(56), 'hex'),
  //       'binary',
  //       'utf8'
  //     ), decipher.final('utf8')
  //   ].join('');
  //   cb(false, decrypted)
  // }

  // cipher.final();
  // cipher.update(
  //     Buffer.from(data), 'utf8'),
  //     cipher.final()
  // ]),
  //   tag = cipher.getAuthTag(),
  //   final = Buffer.concat([iv, tag, encrypted]).toString('hex');
  //   cb(false, final)
  // } catch (err) {
  //   if(err){
  //     cb(err,null)
  //   }
  // }
}

export function connectTcp(urlOrStr: string | URL): Promise<TransformStream<Uint8Array, Uint8Array> & { close(): void }> {
  return new Promise((resolve, reject) => {
    let url: URL;
    if (typeof urlOrStr === "string") {
      url = new URL(urlOrStr);
    } else {
      url = urlOrStr;
    }
    const receive = new TransformStream<Uint8Array, Uint8Array>();
    const receiveReader = receive.readable.getReader();
    const send = new TransformStream<Uint8Array, Uint8Array>();
    const sendWriter = send.writable.getWriter();
    const client = new net.Socket();
    client.on("error", (err) => {
      reject(err);
    });
    const port = parseInt(url.port, 10);
    if (!(port > 0)) {
      reject(new Error(`Invalid port number: ${url.port}`));
    }
    client.connect(port, url.hostname, () => {
      return resolve({
        close: () => {
          receive.writable.close();
        },
        readable: send.readable,
        writable: receive.writable,
      });
    });
    client.on("data", function (data) {
      sendWriter.write(new Uint8Array(data));
    });

    client.on("close", function () {
      sendWriter.close();
    });
    readerLoop(
      receiveReader,
      (data) => {
        return new Promise((resolve, reject) => {
          client.write(Buffer.from(data), (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      },
      (err) => {
        if (err) {
          // unhandlerejection
          throw err;
        }
        client.destroy();
      }
    );
  });
}

// will resolve after the stream is finished or rejects if an error occurs
export async function createResponseStream(rsp: ResponseStreamParam): Promise<Result> {
  const url = new URL(rsp.endpointUrl);
  const rw = await connectTcp(url);
  const fp =
    rsp.frameProcessor ||
    new FrameProcessor({
      inputStream: rw.readable,
      outputStream: rw.writable,
    });
  const deEnCrypter = new Crypter(rsp.crypto);
  fp.send(
    new TextEncoder().encode(
      JSON.stringify({
        streamId: url.searchParams.get("streamId"),
        cipher: deEnCrypter.cipherStr,
        iv: base64EncArr(deEnCrypter.iv),
      })
    )
  );
  fp.send(
    deEnCrypter.encrypt(
      JSON.stringify({
        status: rsp.response.status,
        statusText: rsp.response.statusText,
        headers: HttpHeader.from(rsp.response.headers).AsRecordStringString(),
      })
    )
  );
  if (rsp.response.body) {
    const reader = rsp.response.body.getReader();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        fp.send(deEnCrypter.encrypt(value));
      }
    }
  }
  fp.send(deEnCrypter.final());
  fp.close();
  return Promise.resolve({
    totalTime: 0,
    connectionEstablish: 0,
    metrics: fp.metrics,
  });
}
