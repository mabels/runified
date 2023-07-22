import { KVInMemory } from "../kv/kv_inmemory";
import { Api } from "../types/app/api";
import { App } from "../types/app/app";
import { KeyValueStoreBlob } from "../types/key_value";
import { Logger } from "../types/logger";

export interface MockApiParams {
  readonly App: App;
  readonly Log?: Logger;
}

export class MockApi implements Api {
  readonly _kvStoreMap: Map<string, KeyValueStoreBlob> = new Map();
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
