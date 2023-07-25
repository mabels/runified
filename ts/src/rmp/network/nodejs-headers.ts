import { IncomingHttpHeaders } from "node:http";
import { HttpHeader } from "../../types";

export function fromNodeJS(map: IncomingHttpHeaders): Headers {
  const headers = HttpHeader.from();
  for (const [key, value] of Object.entries(map)) {
    headers.Add(key, value);
  }
  return headers.AsHeaders();
}
