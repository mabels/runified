import { parse } from "ts-command-line-args";
import { CLIConfig } from "../types/app";
import { String2TimeMode } from "@adviser/cement"

interface Transfer {
  "listen-port"?: number;
  "listen-addr"?: string;
  "firebase-db-url"?: string;
  "firebase-service-account-key-path"?: string;
  "kv-store-type"?: string;
  "time-mode"?: string;
}
export function FromCommandLine(args: string[]): CLIConfig {
  let appName = "test";
  if (args.length > 0) {
    appName = args.shift() ?? "kaputt";
  }
  const pargs = parse<Transfer>(
    {
      "listen-port": { type: Number, defaultValue: 8081, optional: true },
      "listen-addr": { type: String, defaultValue: "", optional: true },
      "firebase-db-url": {
        type: String,
        defaultValue: "https://runified.firebaseio.com",
        optional: true,
      },
      "firebase-service-account-key-path": {
        type: String,
        defaultValue: "serviceAccountKey.json",
        optional: true,
      },
      "kv-store-type": {
        type: String,
        defaultValue: "inmemory",
        optional: true,
      },
      "time-mode": { type: String, defaultValue: "real", optional: true },
    },
    {
      argv: args,
    },
  );
  return new CLIConfig({
    AppName: appName,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    KVStoreType: pargs["kv-store-type"]!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    TimeMode: String2TimeMode(pargs["time-mode"]!),
    Listen: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Port: pargs["listen-port"]!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Addr: pargs["listen-addr"]!,
    },
    FireBase: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      DBUrl: pargs["firebase-db-url"]!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ServiceAccountKeyPath: pargs["firebase-service-account-key-path"]!,
    },
  });
}
