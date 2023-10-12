import { KeyValueStore, KeyValueStoreBlob } from "../types/key_value";
import { SerDe } from "../types/serde";

interface wrappedKvStoreParams<TT> {
  readonly blobStore: KeyValueStoreBlob;
  readonly serde: SerDe<TT>;
}

class wrappedKvStore<T> implements KeyValueStore<T> {
  readonly _blobStore: KeyValueStoreBlob;
  readonly _serde: SerDe<T>;
  // readonly _factory: (t: never) => Result<T, Error>;

  constructor(args: wrappedKvStoreParams<T>) {
    this._blobStore = args.blobStore;
    this._serde = args.serde;
    // this._factory = args.factory;
  }

  // Del implements types.KeyValueStore.
  async Del(key: string): Promise<T> {
    try {
      const bytes = await this._blobStore.Del(key);
      const res = this._serde.Unmarshal(bytes);
      if (res.is_ok()) {
        return Promise.resolve(res.unwrap());
      }
      return Promise.reject(res.unwrap_err());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Get implements types.KeyValueStore.
  async Get(key: string): Promise<T> {
    try {
      const bytes = await this._blobStore.Get(key);
      const res = this._serde.Unmarshal(bytes);
      if (res.is_ok()) {
        return Promise.resolve(res.unwrap());
      }
      return Promise.reject(res.unwrap_err());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Set implements types.KeyValueStore.
  async Set(key: string, value: T): Promise<T> {
    const bytes = this._serde.Marshal(value);
    if (bytes.is_err()) {
      return Promise.reject(bytes.unwrap_err());
    }
    await this._blobStore.Set(key, bytes.unwrap());
    return Promise.resolve(value);
  }
}

export function WrapKvStore<T>(
  blobStore: KeyValueStoreBlob,
  serde: SerDe<T>,
  // factory: (t: any) => Result<T, Error>
): KeyValueStore<T> {
  return new wrappedKvStore<T>({
    blobStore: blobStore,
    serde: serde,
  });
}
