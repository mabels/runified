import { AddrPort } from "../types/index.js";
import * as path from "node:path";

export function globalToLocalBaseUrl(s: AddrPort | undefined, ...add: string[]): string {
  let addr = s?.Addr || "127.0.0.1";
  if (s?.Addr == "0.0.0.0" || s?.Addr == "::") {
    addr = "127.0.0.1";
  }
  return path.join(`http://${addr}:${s?.Port}/`, ...add);
}
