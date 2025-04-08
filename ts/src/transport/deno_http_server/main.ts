import { FetchHttpServer } from "../fetch";
import { setupTestServer } from "../test-server";
import { serve } from "https://deno.land/std@0.184.0/http/server.ts";

((): void => {
  const httpServer = new FetchHttpServer();
  setupTestServer(httpServer);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  serve(httpServer.fetchHandler, { port: 8087 });
})();
