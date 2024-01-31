import { TimeMode } from "@adviser/cement"
import { FromCommandLine } from "./cli_config";

describe("cli_config", () => {
  it("default", () => {
    const cfg = FromCommandLine([]);
    expect(cfg).not.toBeNull();
    expect(cfg.Listen.Port).toBe(8081);
    expect(cfg.Listen.Addr).toBe("");
    expect(cfg.AppName).toBe("test");
    expect(cfg.FireBase.DBUrl).toBe("https://runified.firebaseio.com");
    expect(cfg.FireBase.ServiceAccountKeyPath).toBe("serviceAccountKey.json");
    expect(cfg.TimeMode).toBe("real");
  });

  it("cli-args", () => {
    const cfg = FromCommandLine([
      "wurst",
      "--listen-port",
      "8083",
      "--listen-addr",
      "bla",
      "--firebase-db-url",
      "w1", // to be sure that you don't mix up the assigments
      "--firebase-service-account-key-path",
      "w2",
      "--kv-store-type",
      "firebase",
      "--time-mode",
      "xxxx",
    ]);
    expect(cfg).not.toBeNull();
    expect(cfg.Listen.Port).toBe(8083);
    expect(cfg.Listen.Addr).toBe("bla");
    expect(cfg.AppName).toBe("wurst");
    expect(cfg.FireBase.DBUrl).toBe("w1");
    expect(cfg.FireBase.ServiceAccountKeyPath).toBe("w2");
    expect(cfg.KVStoreType).toBe("firebase");
    expect(cfg.TimeMode).toBe(TimeMode.REAL);
  });
});
