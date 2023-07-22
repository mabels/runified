import { FetchHttpServer } from "../fetch";
import { setupTestServer } from "../test-server";
import { serve } from "https://deno.land/std@0.184.0/http/server.ts";

(async () => {
  const httpServer = new FetchHttpServer();
  setupTestServer(httpServer);
  serve(httpServer.fetchHandler, { port: 8087 });
})();
