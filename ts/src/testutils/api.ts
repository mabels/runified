import { KVInMemory } from "../kv/kv_inmemory.js";
import { Api, App } from "../types/app/index.js";
import { KeyValueStoreBlob } from "../types/index.js";
import { Logger } from "@adviser/cement";

export interface MockApiParams {
  readonly App: App;
  readonly Log?: Logger;
}

export class MockApi implements Api {
  readonly _kvStoreMap = new Map<string, KeyValueStoreBlob>();
  readonly _params: MockApiParams;
  readonly _log: Logger;
  constructor(params: MockApiParams) {
    this._params = params;
    this._log = params.Log ?? params.App.Log().With().Str("MockApi", "MockApi").Timestamp().Logger();
  }

  KeyValueStore(kvStoreName: string): Promise<KeyValueStoreBlob> {
    const kvStore = this._kvStoreMap.get(kvStoreName) ?? new KVInMemory();
    this._kvStoreMap.set(kvStoreName, kvStore);
    return Promise.resolve(kvStore);
  }

  App(): App {
    return this._params.App;
  }

  Log(): Logger {
    return this._log;
  }
}
