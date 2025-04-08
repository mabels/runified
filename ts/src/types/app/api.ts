import { App } from "./app.js";
import { Logger } from "@adviser/cement";
import { KeyValueStoreBlob } from "../key_value.js";

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
