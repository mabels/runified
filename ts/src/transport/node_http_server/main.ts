import { NodeHttpServer } from ".";
import { setupTestServer } from "../test-server";

(async () => {
  const nodeHttpServer = new NodeHttpServer({ Port: 8087 });
  return setupTestServer(nodeHttpServer).Start();
})();
