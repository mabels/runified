import { HTTPHandler, HttpRequest, HttpResponseWriter, HttpServer } from "../types";
import { stream2string } from "../utils";

async function handler(w: HttpResponseWriter, r: HttpRequest): Promise<void> {
  w.WriteHeader(203);
  w.Header().Set("X-Test", "close");
  const query: Record<string, string[]> = {};
  for (const [key, value] of r.URL.Query().entries()) {
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
      method: r.Method,
      header: r.Header.AsObject(),
      body: await stream2string(r.Body),
    })
  );
  for (let i = 0; i < 1; i++) {
    await w.Write(out);
  }
  return Promise.resolve();
}

export function setupTestServer(hs: HttpServer) {
  const hp = new HTTPHandler({
    HttpServer: hs,
  });
  hp.RegisterHandler("/", handler);
  hp.RegisterHandler("/hi", handler);
  return hp;
}
