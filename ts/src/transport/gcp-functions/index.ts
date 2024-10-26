import { NodeHttpServer } from "../node_http_server/index";
import { HTTPHandler } from "../../types";

import { stream2string } from "@adviser/cement/utils";

const nodeHttpServer = new NodeHttpServer({ Port: 0 });
const hp = new HTTPHandler({
  HttpServer: nodeHttpServer,
});
hp.RegisterHandler("/", async (w, r) => {
  w.WriteHeader(200);
  w.Header().Set("X-Test", "close");
  const query: Record<string, string[]> = {};
  for (const [key, value] of r.URL.Query().Entries()) {
    const vs = [value];
    if (!query[key]) {
      query[key] = [];
    }
    query[key].push(...vs);
  }
  const out = new TextEncoder().encode(
    JSON.stringify({
      url: r.URL.String(),
      query,
      header: r.Header.AsRecordStringStringArray(),
      body: await stream2string(r.Body),
    }),
  );
  for (let i = 0; i < 1; i++) {
    await w.Write(out);
  }
  return Promise.resolve();
});

export const runified = nodeHttpServer.nodeHandler;
