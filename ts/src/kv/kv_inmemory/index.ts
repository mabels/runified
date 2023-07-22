import { KeyNotFound, KeyValueStoreBlob } from "../../types/key_value";

export class KVInMemory implements KeyValueStoreBlob {
  readonly _store: Map<string, Uint8Array> = new Map<string, Uint8Array>();

  Get(key: string): Promise<Uint8Array> {
    const ret = this._store.get(key);
    if (!ret) {
      return Promise.reject(new KeyNotFound(key));
    }
    return Promise.resolve(ret);
  }

  Set(key: string, val: Uint8Array): Promise<Uint8Array> {
    this._store.set(key, val);
    return Promise.resolve(val);
  }

  Del(key: string): Promise<Uint8Array> {
    const res = this._store.get(key);
    if (!res) {
      return Promise.reject(new KeyNotFound(key));
    }
    this._store.delete(key);
    return Promise.resolve(res);
  }
}
