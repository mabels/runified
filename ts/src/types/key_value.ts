export interface KeyValueStoreBlob {
  Get(key: string): Promise<Uint8Array>;
  Set(key: string, value: Uint8Array): Promise<Uint8Array>;
  Del(key: string): Promise<Uint8Array>;
}

export interface KeyValueStore<T> {
  Get(key: string): Promise<T>;
  Set(key: string, value: T): Promise<T>;
  Del(key: string): Promise<T>;
}

export class KeyNotFound implements Error {
  readonly name: string = "KeyNotFound";
  readonly key: string;
  readonly message: string;
  readonly stack?: string;
  constructor(key: string) {
    this.message = `key not found: ${key}`;
    this.key = key;
  }
}
