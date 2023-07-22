import { App } from "./app";
import { Logger } from "../logger";
import { KeyValueStoreBlob } from "../key_value";

export interface Api {
  App(): App;
  Log(): Logger;
  KeyValueStore(storeName: string): Promise<KeyValueStoreBlob>;
}

export class ErrKVStoreNotSupported extends Error {
  readonly key: string;
  constructor(key: string) {
    super(`KVStore type unknown: ${key}`);
    this.key = key;
  }
}
