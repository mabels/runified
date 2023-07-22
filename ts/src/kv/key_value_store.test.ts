import { KeyNotFound, KeyValueStore } from "../types/key_value";
import { SerDe } from "../types/serde";
import { KVInMemory } from "./kv_inmemory";
import { WrapKvStore } from "./wrap_kv";
import { Result } from "wueste/result";

export async function testKV(kv: KeyValueStore<string>) {
  const hiStr = "hi";

  let res = kv.Get("test");
  expect(res).rejects.toEqual(new KeyNotFound("test"));
  res = kv.Set("test", hiStr);
  expect(res).resolves.toEqual(hiStr);
  res = kv.Get("test");
  expect(res).resolves.toEqual(hiStr);
  res = kv.Del("test");
  expect(res).resolves.toEqual(hiStr);
  res = kv.Del("test");
  expect(res).rejects.toEqual(new KeyNotFound("test"));
  res = kv.Get("test");
  expect(res).rejects.toEqual(new KeyNotFound("test"));
}

class Base64 implements SerDe<string> {
  Marshal(t: string): Result<Uint8Array> {
    return Result.Ok(new TextEncoder().encode(t));
  }
  Unmarshal(raw: Uint8Array): Result<string> {
    return Result.Ok(new TextDecoder().decode(raw));
  }
}

it("InMemoryKV", async () => {
  const bkv = new KVInMemory();
  const kv = WrapKvStore<string>(bkv, new Base64());
  await testKV(kv);
});
