import { Result } from "@adviser/result";
import { WuestenFactory } from "wueste/wueste";

export interface SerDe<T> {
  Marshal(t: T): Result<Uint8Array, Error>;
  Unmarshal(raw: Uint8Array | string): Result<T, Error>;
}

export class JsonSerDe<T, I, O> implements SerDe<T> {
  static readonly _encoder = new TextEncoder();
  static readonly _decoder = new TextDecoder();
  readonly _factory: WuestenFactory<T, I, O>;
  constructor(factory: WuestenFactory<T, I, O>) {
    this._factory = factory;
  }
  Marshal(t: T): Result<Uint8Array> {
    const map = this._factory.ToObject(t);
    return Result.Ok(JsonSerDe._encoder.encode(JSON.stringify(map)));
  }

  Unmarshal(raw: Uint8Array | string): Result<T> {
    try {
      if (typeof raw !== "string") {
        raw = JsonSerDe._decoder.decode(raw);
      }
      const map = JSON.parse(raw);
      return this._factory.Builder().Coerce(map);
    } catch (e) {
      return Result.Err(e as Error);
    }
  }
}
