import { Api, App, ErrKVStoreNotSupported } from "../types/app";
import { KeyValueStoreBlob } from "../types";
import { KVInMemory } from "../kv/kv_inmemory";
import { Logger } from "@adviser/cement";

export class ApiImpl implements Api {
  readonly _app: App;
  readonly _kvStoreMap = new Map<string, KeyValueStoreBlob>();

  constructor(app: App) {
    this._app = app;
  }

  KeyValueStore(storeName: string): Promise<KeyValueStoreBlob> {
    const kvStoreType = this._app.CLIConfig().KVStoreType;

    switch (kvStoreType) {
      case "inmemory": {
        let kv = this._kvStoreMap.get(storeName);
        if (!kv) {
          kv = new KVInMemory();
          this._kvStoreMap.set(storeName, kv);
        }
        return Promise.resolve(kv);
      }
    }
    return Promise.reject(new ErrKVStoreNotSupported(kvStoreType));
  }

  App(): App {
    return this._app;
  }

  Log(): Logger {
    return this._app.Log();
  }
}
